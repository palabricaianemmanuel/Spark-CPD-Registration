import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, name' });
    }

    const { data, error } = await resend.emails.send({
      from: 'SPARK CPD <onboarding@resend.dev>',
      to: email,
      subject: '🎉 Congratulations! You\'re a SPARK CPD Raffle Winner!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;margin-top:40px;margin-bottom:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:48px 40px;text-align:center;">
              <h1 style="color:#FF5E00;font-size:28px;margin:0 0 8px 0;font-weight:800;">SPARK CPD</h1>
              <p style="color:#94A3B8;font-size:14px;margin:0;letter-spacing:0.1em;text-transform:uppercase;">Raffle Winner Announcement</p>
            </div>

            <!-- Body -->
            <div style="padding:48px 40px;">
              <h2 style="color:#0F172A;font-size:24px;margin:0 0 16px 0;">
                Hi ${name}! 🎉
              </h2>
              
              <p style="color:#334155;font-size:16px;line-height:1.7;margin:0 0 24px 0;">
                We're thrilled to announce that <strong>you've been selected as one of our lucky raffle winners</strong> at the SPARK CPD event!
              </p>

              <div style="background:#FFF7ED;border-left:4px solid #FF5E00;padding:20px 24px;border-radius:0 8px 8px 0;margin:0 0 24px 0;">
                <p style="color:#92400E;font-size:15px;margin:0;font-weight:600;">
                  🏆 You are officially a winner!
                </p>
                <p style="color:#78716C;font-size:14px;margin:8px 0 0 0;">
                  Please stay tuned for further announcements regarding prize claiming details.
                </p>
              </div>

              <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 32px 0;">
                If you have any questions, feel free to reach out to our team. We look forward to celebrating with you!
              </p>

              <p style="color:#334155;font-size:15px;margin:0;">
                Warm regards,<br>
                <strong style="color:#0F172A;">The SPARK CPD Team</strong>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#F8FAFC;padding:24px 40px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} SPARK CPD. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
