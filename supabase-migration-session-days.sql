-- ============================================================
-- SPARK CPD Registration — Session Days Migration
-- Run this script in the Supabase SQL Editor
-- This adds multi-day support for sessions (e.g. 5 days across 2 weeks)
-- ============================================================

-- 1. Create the session_days table
CREATE TABLE session_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_label TEXT,
  day_date TEXT NOT NULL,
  modality TEXT NOT NULL DEFAULT 'Synchronous',
  where_location TEXT,
  start_time TEXT,
  end_time TEXT,
  time_schedule TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, day_number)
);

-- 2. Enable RLS on session_days
ALTER TABLE session_days ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Allow public read session_days" ON session_days
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert session_days" ON session_days
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update session_days" ON session_days
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete session_days" ON session_days
  FOR DELETE USING (true);

-- ============================================================
-- DONE! Verify in the Table Editor that:
-- 1. A "session_days" table exists
-- 2. It has columns: id, session_id, day_number, day_label,
--    day_date, modality, where_location, start_time, end_time,
--    time_schedule, duration, created_at
-- 3. RLS is enabled with public read/write policies
-- ============================================================
