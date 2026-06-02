-- ============================================================
-- SPARK CPD Registration — Session Archive Migration
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================

-- 1. Create the sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. Enable RLS on sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow public reads (needed for registration page to find active session)
CREATE POLICY "Allow public read sessions" ON sessions
  FOR SELECT USING (true);

-- Allow public inserts/updates (for admin actions via anon key)
CREATE POLICY "Allow public manage sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update sessions" ON sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Create an initial default session and assign existing registrations
INSERT INTO sessions (name) VALUES ('Session 1');

-- 4. Add session_id column to registrations
ALTER TABLE registrations ADD COLUMN session_id UUID REFERENCES sessions(id);

-- 5. Assign all existing registrations to the default session
UPDATE registrations SET session_id = (SELECT id FROM sessions WHERE name = 'Session 1' LIMIT 1);

-- 6. Make session_id NOT NULL after backfill
ALTER TABLE registrations ALTER COLUMN session_id SET NOT NULL;

-- 7. Drop old global unique constraints (these may have different names in your DB)
-- If any of these fail, check your constraint names in Supabase Table Editor
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_email_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_mobile_number_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS unique_full_name;

-- 8. Add new session-scoped unique constraints
ALTER TABLE registrations ADD CONSTRAINT unique_email_per_session UNIQUE (email, session_id);
ALTER TABLE registrations ADD CONSTRAINT unique_mobile_per_session UNIQUE (mobile_number, session_id);
ALTER TABLE registrations ADD CONSTRAINT unique_name_per_session UNIQUE (first_name, last_name, session_id);

-- ============================================================
-- DONE! Verify in the Table Editor that:
-- 1. A "sessions" table exists with one row ("Session 1")
-- 2. The "registrations" table has a "session_id" column
-- 3. All existing registrations have a session_id value
-- ============================================================

-- ============================================================
-- 9. Add session_id column to paid_registration
ALTER TABLE paid_registration ADD COLUMN session_id UUID REFERENCES sessions(id);

-- 10. Assign all existing paid_registrations to the default session
UPDATE paid_registration SET session_id = (SELECT id FROM sessions WHERE name = 'Session 1' LIMIT 1);

-- 11. Make session_id NOT NULL after backfill
ALTER TABLE paid_registration ALTER COLUMN session_id SET NOT NULL;

-- 12. Drop old global unique constraints (if they exist)
ALTER TABLE paid_registration DROP CONSTRAINT IF EXISTS paid_registration_email_key;
ALTER TABLE paid_registration DROP CONSTRAINT IF EXISTS paid_registration_contact_number_key;
