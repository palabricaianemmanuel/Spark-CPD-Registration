import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { checkout_id } = req.body;

    if (!checkout_id) {
      return res.status(400).json({ error: 'Missing checkout_id' });
    }

    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    // Fetch the checkout session from PayMongo to check its status
    console.log(`Verifying payment for checkout ID: ${checkout_id}`);
    const paymongoResponse = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkout_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`
      }
    });

    const paymongoData = await paymongoResponse.json();

    if (!paymongoResponse.ok) {
      console.error('PayMongo verify error:', JSON.stringify(paymongoData));
      throw new Error('Failed to verify payment status');
    }

    const checkoutSession = paymongoData.data;
    const payments = checkoutSession.attributes.payments || [];
    
    // Check if the payment intent succeeded or if the payments array has a paid payment
    const paymentIntentStatus = checkoutSession.attributes.payment_intent?.attributes?.status;
    const hasPaidPayment = payments.some((p: any) => p.attributes.status === 'paid');
    
    const isPaid = hasPaidPayment || paymentIntentStatus === 'succeeded';
    const paymentId = payments[0]?.id || checkoutSession.attributes.payment_intent?.attributes?.payments?.[0]?.id || null;

    console.log(`Payment verification result: isPaid=${isPaid}, paymentId=${paymentId}`);

    if (isPaid) {
      // Update the registration in Supabase
      console.log(`Updating DB for checkout ID: ${checkout_id}`);
      const { error: updateError } = await supabase
        .from('paid_registration')
        .update({
          payment_status: 'paid',
          paymongo_payment_id: paymentId,
          paid_at: new Date().toISOString()
        })
        .eq('paymongo_checkout_id', checkout_id);

      if (updateError) {
        console.error('DB update error:', updateError);
      } else {
        console.log('DB update successful');
      }
    }

    return res.status(200).json({
      paid: isPaid,
      payment_id: paymentId
    });

  } catch (err: any) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
