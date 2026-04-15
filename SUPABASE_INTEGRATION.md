# Supabase Integration Instructions

Follow these steps to connect your SPARK CPD Registration application to a Supabase database.

## 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com/).
2. Sign in and click **"New Project"**.
3. Fill in the required details (Project Name, Database Password, Region).
4. Once created, wait for the database to provision.

## 2. Set Up the Database Table
1. In your project dashboard, navigate to the **SQL Editor** on the left sidebar.
2. Click **"New query"** and paste the following SQL code:

```sql
-- Create the registrations table
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile_number TEXT NOT NULL UNIQUE,
  temporary_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_full_name UNIQUE (first_name, last_name)
);

-- Set up Row Level Security (RLS)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anyone can register)
CREATE POLICY "Allow public inserts" ON registrations
  FOR INSERT
  WITH CHECK (true);

-- (Optional) Only authenticated users can view registrations
CREATE POLICY "Allow authenticated read access" ON registrations
  FOR SELECT
  USING (auth.role() = 'authenticated');
```
3. Click **"Run"** to execute the query and create the table.

### 💡 If you already have a table:
If you already created the `registrations` table and just want to add the password column without deleting your data, run this command instead:

```sql
ALTER TABLE registrations ADD COLUMN temporary_password TEXT DEFAULT 'SPARK-PENDING';
-- Then make it required for future entries
ALTER TABLE registrations ALTER COLUMN temporary_password SET NOT NULL;
```

## 3. Connect the Application
1. Go to **Project Settings** -> **API** in the Supabase dashboard.
2. Copy the **Project URL** and the **anon public API key**.
3. Open your project on your machine, and create a file named `.env` in the root folder (next to `package.json`).
4. Add the following lines to the `.env` file, replacing the placeholder values:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Run the Application
Start your development server if you haven't already:
```bash
npm run dev
```

The registration form will now securely send data to your Supabase database!
