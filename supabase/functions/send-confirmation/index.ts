import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record) {
      throw new Error("No record found in request body");
    }

    const { first_name, last_name, email, temporary_password } = record;

    console.log(`Sending confirmation email to ${email} for user ${first_name} ${last_name}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SPARK CPD <onboarding@resend.dev>", // Replace with your verified domain later
        to: [email],
        subject: "Welcome to SPARK CPD - Your Account Credentials",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #FF5E00; margin: 0;">SPARK CPD</h1>
              <p style="color: #666; margin-top: 5px;">Yes to Learning & Development</p>
            </div>
            
            <h2 style="color: #1a1a1a;">Welcome, ${first_name}!</h2>
            <p style="color: #444; line-height: 1.6;">
              Your registration for a SPARK CPD account has been successfully processed. We have created a temporary account for you that will be used for our upcoming system.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px left solid #FF5E00;">
              <h3 style="margin-top: 0; color: #1a1a1a;">Your Login Credentials</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <span style="background-color: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 1.1em;">${temporary_password}</span></p>
            </div>
            
            <p style="color: #444; line-height: 1.6;">
              Please keep these credentials safe. You will be able to use them to log in once our main system is officially hosted. For security reasons, you will be prompted to change your password upon your first login.
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85em; color: #888; text-align: center;">
              <p>&copy; 2024 SPARK CPD. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
