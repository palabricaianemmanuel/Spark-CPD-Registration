import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

interface FormData {
  givenName: string;
  middleInitial: string;
  lastName: string;
  preferredName: string;
  email: string;
  contactNumber: string;
  position: string;
  schoolName: string;
  region: string;
  division: string;
  prcId: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formData } = req.body as { formData: FormData };

    if (!formData || !formData.givenName || !formData.lastName || !formData.email) {
      return res.status(400).json({ error: 'Missing required form data' });
    }

    // 1. Create PayMongo Checkout Session FIRST (before DB insert)
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PayMongo secret key is not configured');
    }

    const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://your-domain.vercel.app';

    const checkoutPayload = {
      data: {
        attributes: {
          line_items: [
            {
              name: 'SPARK CPD - Financial Literacy Program',
              description: 'Online CPD Program | May 29-31, 2026 | 4 CPD Units',
              amount: 30000, // Amount in centavos (₱300.00 = 30000 centavos)
              currency: 'PHP',
              quantity: 1
            }
          ],
          payment_method_types: ['gcash'],
          success_url: `${baseUrl}/paid-registration?status=success`,
          cancel_url: `${baseUrl}/paid-registration?status=failed`,
          description: `CPD Registration for ${formData.givenName} ${formData.lastName}`,
          billing: {
            name: `${formData.givenName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.contactNumber
          },
          metadata: {
            registrant_name: `${formData.givenName} ${formData.lastName}`,
            registrant_email: formData.email
          }
        }
      }
    };

    const authHeader = `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`;
    console.log('--- PayMongo Debug ---');
    console.log('Key used:', PAYMONGO_SECRET_KEY.substring(0, 15) + '...');
    console.log('Auth header:', authHeader.substring(0, 20) + '...');
    console.log('Payload:', JSON.stringify(checkoutPayload).substring(0, 200));

    const paymongoResponse = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(checkoutPayload)
    });

    console.log('PayMongo response status:', paymongoResponse.status);
    const paymongoData = await paymongoResponse.json();

    if (!paymongoResponse.ok) {
      console.error('PayMongo error:', JSON.stringify(paymongoData));
      throw new Error(paymongoData.errors?.[0]?.detail || 'Failed to create checkout session');
    }

    const checkoutSession = paymongoData.data;
    const checkoutUrl = checkoutSession.attributes.checkout_url;
    const checkoutId = checkoutSession.id;

    // 2. Now insert into Supabase with the checkout ID
    const { error: insertError } = await supabase
      .from('paid_registration')
      .insert([
        {
          given_name: formData.givenName,
          middle_initial: formData.middleInitial,
          last_name: formData.lastName,
          preferred_name: formData.preferredName,
          email: formData.email,
          contact_number: formData.contactNumber,
          position: formData.position,
          school_name: formData.schoolName,
          region: formData.region,
          division: formData.division,
          prc_id: formData.prcId,
          payment_status: 'pending',
          paymongo_checkout_id: checkoutId
        }
      ]);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      // Don't fail — the checkout session is already created, user can still pay
      // The webhook will handle linking via checkout_id
    }

    return res.status(200).json({
      checkout_url: checkoutUrl,
      checkout_id: checkoutId
    });

  } catch (err: any) {
    console.error('Create checkout error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
