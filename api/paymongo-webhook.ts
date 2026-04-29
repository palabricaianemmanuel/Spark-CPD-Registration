import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

    // 1. Verify the webhook signature (if secret is configured)
    if (WEBHOOK_SECRET) {
      const signatureHeader = req.headers['paymongo-signature'];
      if (!signatureHeader) {
        console.error('Missing Paymongo-Signature header');
        return res.status(401).json({ error: 'Missing signature' });
      }

      const parts: Record<string, string> = {};
      signatureHeader.split(',').forEach((part: string) => {
        const [key, value] = part.split('=');
        parts[key] = value;
      });

      const timestamp = parts['t'];
      const signature = parts['te'] || parts['li'];

      if (!timestamp || !signature) {
        console.error('Invalid signature format');
        return res.status(401).json({ error: 'Invalid signature format' });
      }

      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('Signature mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('PAYMONGO_WEBHOOK_SECRET not configured — skipping signature verification');
    }

    // 2. Process the webhook event
    const event = req.body?.data;
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const eventType = event.attributes?.type;
    const checkoutData = event.attributes?.data;

    console.log('Webhook event received:', eventType);

    if (eventType === 'checkout_session.payment.paid') {
      const checkoutId = checkoutData?.id;
      const payments = checkoutData?.attributes?.payments;
      const paymentId = payments?.[0]?.id || null;

      if (!checkoutId) {
        console.error('No checkout ID in webhook data');
        return res.status(200).json({ message: 'No checkout ID found, skipping' });
      }

      console.log(`Payment confirmed for checkout: ${checkoutId}`);

      // 3. Find and update the registration by paymongo_checkout_id
      const { error: updateError } = await supabase
        .from('paid_registration')
        .update({
          payment_status: 'paid',
          paymongo_payment_id: paymentId,
          paid_at: new Date().toISOString()
        })
        .eq('paymongo_checkout_id', checkoutId);

      if (updateError) {
        console.error('Failed to update registration:', updateError);
        return res.status(200).json({ message: 'Acknowledged but DB update failed' });
      }

      console.log(`Registration with checkout ${checkoutId} marked as paid`);
      return res.status(200).json({ message: 'Payment verified and registration updated' });
    }

    return res.status(200).json({ message: `Event ${eventType} acknowledged` });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(200).json({ message: 'Error processing webhook', error: err.message });
  }
}
