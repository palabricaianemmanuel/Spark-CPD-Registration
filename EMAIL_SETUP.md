# Automated Email Setup Instructions

Follow these steps to enable automated welcome emails with login credentials for your registrants.

## 1. Get a Resend API Key
1. Go to [Resend](https://resend.com/) and create a free account.
2. In the Resend dashboard, go to **API Keys** on the left.
3. Click **"Create API Key"**, give it a name (e.g., "SPARK Registration"), and set the permission to "Full Access".
4. **Copy the API key** immediately.

## 2. Add the API Key to Supabase
1. Open your Supabase Dashboard.
2. Navigate to **Project Settings** -> **Edge Functions** (or search for "Secrets" in the sidebar).
3. Add a new Secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** (Paste your Resend API key here)

## 3. Deploy the Edge Function
If you are using the Supabase CLI, run:
```bash
supabase functions deploy send-confirmation
```
Alternatively, you can manually create an Edge Function in the Supabase Dashboard named `send-confirmation` and paste the code from `supabase/functions/send-confirmation/index.ts`.

## 4. Enable the Database Webhook (The Trigger)
This is what makes the email send automatically when a user clicks "Register".

1. In the Supabase Dashboard, go to **Database** -> **Webhooks**.
2. Click **"Enable Webhooks"** if it's not already on.
3. Click **"Create a new webhook"**.
4. Fill in the following:
   - **Name:** `send_welcome_email`
   - **Table:** `registrations`
   - **Events:** Select **INSERT** only.
   - **Type:** Select **Supabase Edge Functions**.
   - **Edge Function:** Select `send-confirmation`.
   - **Method:** `POST`.
5. Click **"Create Webhook"**.

---

### ✅ You're Done!
Now, every time a new row is added to the `registrations` table:
1. The website generates a `SPARK-XXXXX` password.
2. The data is saved to Supabase.
3. Supabase triggers the Webhook.
4. The Webhook calls the Edge Function.
5. The Edge Function sends the formatted welcome email with the credentials!
