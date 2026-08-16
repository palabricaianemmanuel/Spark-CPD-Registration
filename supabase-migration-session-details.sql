-- ============================================================
-- SPARK CPD Registration — Session Details Migration
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Add session details columns to 'sessions' table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS what TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS when_date TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS where_location TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS time_schedule TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic_description TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS investment_fee TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cpd_units TEXT;



-- 3. Pre-fill any existing sessions with default data to avoid nulls breaking the UI
UPDATE sessions SET
  what = 'Mental Wellness',
  when_date = 'June 27 to 28, 2026',
  where_location = 'Zoom Online Meeting',
  time_schedule = '7:00 PM to 10:00 PM',
  duration = '3 Hours',
  topic_description = 'This CPD program equips participants with knowledge in understanding stress and self-care, identifying triggers early, avoiding burnout, strengthening mental and emotional wellness, and develop sustainable routines for self-care.',
  investment_fee = '300.00',
  cpd_units = '4'
WHERE what IS NULL;
