-- =============================================================================
-- EVENTOS PLATFORM - SUPABASE POSTGRESQL SCHEMA & INITIAL DATA
-- =============================================================================
-- How to apply:
-- 1. Go to your Supabase Project Dashboard (https://app.supabase.com)
-- 2. Open the "SQL Editor" in the left sidebar
-- 3. Click "New Query", paste this entire script, and click "Run" (▶)
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  address TEXT,
  location_permission INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'visitor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  date_label TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  start_time TEXT,
  end_time TEXT,
  organizer_id TEXT,
  file_name TEXT,
  file_data TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'available',
  description TEXT,
  max_capacity INTEGER NOT NULL DEFAULT 15000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time_label TEXT NOT NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  speaker TEXT NOT NULL
);

-- 4. VISITOR_EVENTS (User to Event registrations)
CREATE TABLE IF NOT EXISTS visitor_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- 5. PASSES (Digital badges / QR tickets)
CREATE TABLE IF NOT EXISTS passes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL DEFAULT 'Standard Summit Access',
  valid_dates TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ITINERARY_ITEMS (Bookmarked sessions per user)
CREATE TABLE IF NOT EXISTS itinerary_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, session_id)
);

-- 7. ZONES (Spatial map & live occupancy telemetry)
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  current_occ INTEGER NOT NULL DEFAULT 0
);

-- 8. ALERTS (Organizer broadcast notifications)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL,
  message TEXT NOT NULL,
  zone_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STAFF DISPATCHES (Floor coordinator dispatches)
CREATE TABLE IF NOT EXISTS staff_dispatches (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  zone_id TEXT,
  organizer_id TEXT,
  note TEXT,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. FLOW STATE (Pedestrian choke-point telemetry and rebalancing)
CREATE TABLE IF NOT EXISTS flow_state (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  station_a_name TEXT NOT NULL DEFAULT 'Station A (Main Stage)',
  station_a_occ INTEGER NOT NULL DEFAULT 4700,
  station_a_cap INTEGER NOT NULL DEFAULT 5000,
  station_b_name TEXT NOT NULL DEFAULT 'Station B (Exhibition A)',
  station_b_occ INTEGER NOT NULL DEFAULT 1920,
  station_b_cap INTEGER NOT NULL DEFAULT 4000,
  station_c_name TEXT NOT NULL DEFAULT 'Station C (Courtyard)',
  station_c_occ INTEGER NOT NULL DEFAULT 1025,
  station_c_cap INTEGER NOT NULL DEFAULT 2500,
  divert_b_count INTEGER NOT NULL DEFAULT 3500,
  divert_c_count INTEGER NOT NULL DEFAULT 2500,
  recommendation_active INTEGER NOT NULL DEFAULT 0,
  recommendation_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. JOURNEYS (Active visitor navigation routes)
CREATE TABLE IF NOT EXISTS journeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_zone TEXT NOT NULL,
  destination_session TEXT,
  route_steps_json TEXT NOT NULL,
  eta_minutes INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_user ON visitor_events(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_event ON visitor_events(event_id);
CREATE INDEX IF NOT EXISTS idx_passes_user ON passes(user_id);
CREATE INDEX IF NOT EXISTS idx_passes_event ON passes(event_id);
CREATE INDEX IF NOT EXISTS idx_zones_event ON zones(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_event ON alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_dispatches_event ON staff_dispatches(event_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user_event ON journeys(user_id, event_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- By default, allow read & write access for API/anon/service keys
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

-- Allow full public / backend client access policy
DO $$
BEGIN
  -- Users
  DROP POLICY IF EXISTS "Public access users" ON users;
  CREATE POLICY "Public access users" ON users FOR ALL USING (true) WITH CHECK (true);

  -- Events
  DROP POLICY IF EXISTS "Public access events" ON events;
  CREATE POLICY "Public access events" ON events FOR ALL USING (true) WITH CHECK (true);

  -- Sessions
  DROP POLICY IF EXISTS "Public access sessions" ON sessions;
  CREATE POLICY "Public access sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

  -- Visitor Events
  DROP POLICY IF EXISTS "Public access visitor_events" ON visitor_events;
  CREATE POLICY "Public access visitor_events" ON visitor_events FOR ALL USING (true) WITH CHECK (true);

  -- Passes
  DROP POLICY IF EXISTS "Public access passes" ON passes;
  CREATE POLICY "Public access passes" ON passes FOR ALL USING (true) WITH CHECK (true);

  -- Itinerary
  DROP POLICY IF EXISTS "Public access itinerary_items" ON itinerary_items;
  CREATE POLICY "Public access itinerary_items" ON itinerary_items FOR ALL USING (true) WITH CHECK (true);

  -- Zones
  DROP POLICY IF EXISTS "Public access zones" ON zones;
  CREATE POLICY "Public access zones" ON zones FOR ALL USING (true) WITH CHECK (true);

  -- Alerts
  DROP POLICY IF EXISTS "Public access alerts" ON alerts;
  CREATE POLICY "Public access alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);

  -- Staff Dispatches
  DROP POLICY IF EXISTS "Public access staff_dispatches" ON staff_dispatches;
  CREATE POLICY "Public access staff_dispatches" ON staff_dispatches FOR ALL USING (true) WITH CHECK (true);

  -- Flow State
  DROP POLICY IF EXISTS "Public access flow_state" ON flow_state;
  CREATE POLICY "Public access flow_state" ON flow_state FOR ALL USING (true) WITH CHECK (true);

  -- Journeys
  DROP POLICY IF EXISTS "Public access journeys" ON journeys;
  CREATE POLICY "Public access journeys" ON journeys FOR ALL USING (true) WITH CHECK (true);
END $$;

-- =============================================================================
-- INITIAL SEED DATA
-- Default accounts:
-- 1. Visitor: alex@eventos.io (Password: alex123)
-- 2. Organizer: admin@eventos.io (Password: admin123)
-- =============================================================================

-- Seed Users
INSERT INTO users (id, name, email, password_hash, password_salt, address, location_permission, role)
VALUES
  ('user-visitor-alex', 'Alex Morgan', 'alex@eventos.io', '0547076d1e44eaae9f706e2361cfd5c8a4176cf361fb8533b3d92209d84c3c3a44d8b9487c6995aa2fa06ea317c24f5a34e06bc86a635848bb21fe7c1626fcf9', '18eb1e27a7c9d9ba0d20d405b5bb27d9', 'Avenida da Liberdade 120, Lisbon', 1, 'visitor'),
  ('user-organizer-admin', 'Admin Organizer', 'admin@eventos.io', 'f4955745ba6b90760f3d9943485f2dfbf638b691060936bc4c0ce3015a9992c90e3aa0e4f20ecb2d2db73b64c6734c898c60a221f75d6e2467d0202720d207fa', '7cb92f9e4225026210f9227f6e3c09b2', 'Rua Garrett 42, Lisbon', 1, 'organizer')
ON CONFLICT (id) DO NOTHING;

-- Seed Events
INSERT INTO events (id, title, subtitle, category, date_label, location, address, start_time, end_time, organizer_id, file_name, file_data, price_cents, currency, status, description, max_capacity)
VALUES
  ('aarpo-26', 'AARPO World Summit 2026', 'Architecture & Design Assembly', 'Architecture', 'SEP 14-16, 2026', 'Lisbon Congress Center', 'Praça das Indústrias 1, 1300-307 Lisboa', '09:00 AM', '06:00 PM', 'user-organizer-admin', NULL, NULL, 18500, 'INR', 'available', 'The global gathering of architectural strategists, urbanists, and digital spatial designers defining future physical-digital environments.', 15000),
  ('lisbon-ux', 'Lisbon UX & Design Expo', 'Digital Products & Modern Interfaces', 'Design', 'SEP 18-19, 2026', 'FIL Pavilion 2', 'Rua do Bojador, Parque das Nações', '10:00 AM', '07:00 PM', 'user-organizer-admin', NULL, NULL, 12000, 'INR', 'selling_fast', 'Exploring human-centered design, digital interfaces, and modern user experiences for physical venues.', 8000),
  ('ai-city', 'Smart Cities & Future Tech Forum', 'Urban Innovation & Smart Mobility', 'Tech', 'OCT 02, 2026', 'Altice Arena', 'Rossio dos Olivais, 1990-231 Lisboa', '09:30 AM', '05:30 PM', 'user-organizer-admin', NULL, NULL, 9500, 'INR', 'early_bird', 'Discover real-time smart city technology, pedestrian flow management, and automated event infrastructure.', 20000)
ON CONFLICT (id) DO NOTHING;

-- Seed Visitor Events
INSERT INTO visitor_events (user_id, event_id)
VALUES
  ('user-visitor-alex', 'aarpo-26'),
  ('user-visitor-alex', 'lisbon-ux')
ON CONFLICT (user_id, event_id) DO NOTHING;

-- Seed Passes
INSERT INTO passes (id, user_id, event_id, pass_type, valid_dates, status)
VALUES
  ('PASS-88219', 'user-visitor-alex', 'aarpo-26', 'Standard Summit Access', 'SEP 14-16, 2026', 'confirmed'),
  ('PASS-44102', 'user-visitor-alex', 'lisbon-ux', 'UX All-Access Pass', 'SEP 18-19, 2026', 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- Seed Sessions
INSERT INTO sessions (id, event_id, time_label, title, stage, speaker)
VALUES
  ('s1', 'aarpo-26', '09:30 AM', 'Keynote: Design for Tomorrow', 'Main Auditorium', 'Elena Rostova'),
  ('s2', 'aarpo-26', '11:00 AM', 'Workshop: Modern UX & Simple Grids', 'Studio B', 'Marc Vance'),
  ('s3', 'aarpo-26', '02:00 PM', 'Pedestrian Flow & Smart Venues', 'Main Auditorium', 'Dr. Aris Thorne'),
  ('s4', 'aarpo-26', '04:00 PM', 'Panel: The Future of Event Experiences', 'Workshop Pavilion', 'Sofia Alva & Panelists'),
  ('s5', 'lisbon-ux', '10:00 AM', 'Opening Keynote: Next-Gen Interfaces', 'Pavilion Stage A', 'Sara Chen'),
  ('s6', 'lisbon-ux', '02:30 PM', 'Spatial UX & Responsive Physical Venues', 'Pavilion Stage B', 'Lucas Rossi'),
  ('s7', 'ai-city', '09:30 AM', 'Smart Mobility & Urban Pedestrian Routing', 'Arena Grand Hall', 'Dr. Kenji Sato')
ON CONFLICT (id) DO NOTHING;

-- Seed Itinerary
INSERT INTO itinerary_items (user_id, session_id)
VALUES
  ('user-visitor-alex', 's1'),
  ('user-visitor-alex', 's3')
ON CONFLICT (user_id, session_id) DO NOTHING;

-- Seed Zones
INSERT INTO zones (id, event_id, name, x, y, width, height, capacity, current_occ)
VALUES
  ('zone-main', 'aarpo-26', 'Main Auditorium (Station A)', 50, 50, 220, 180, 5000, 4700),
  ('zone-expo', 'aarpo-26', 'Exhibition Pavilion A (Station B)', 300, 50, 260, 180, 4000, 1920),
  ('zone-food', 'aarpo-26', 'Culinary Courtyard (Station C)', 50, 260, 220, 150, 2500, 1025),
  ('zone-studio', 'aarpo-26', 'Studio B Pavilion', 300, 260, 140, 150, 1500, 850),
  ('zone-workshop', 'aarpo-26', 'Design Workshop Lab', 460, 260, 100, 150, 800, 420),
  ('zone-south-gate', 'aarpo-26', 'South Concourse & Gate 3', 180, 440, 220, 70, 3000, 2850),
  ('lux-main', 'lisbon-ux', 'Design Pavilion Main', 50, 50, 250, 180, 4000, 2100),
  ('lux-expo', 'lisbon-ux', 'Interactive Demo Arena', 320, 50, 240, 180, 2500, 1400),
  ('lux-lounge', 'lisbon-ux', 'Networking Lounge', 100, 260, 350, 150, 1500, 600),
  ('aic-hall', 'ai-city', 'Smart Mobility Grand Hall', 50, 50, 280, 200, 10000, 6500),
  ('aic-expo', 'ai-city', 'Robotics & Sensor Expo', 350, 50, 220, 200, 6000, 3200),
  ('aic-gate', 'ai-city', 'North Concourse Check-in', 150, 300, 280, 100, 4000, 1800)
ON CONFLICT (id) DO NOTHING;

-- Seed Flow State
INSERT INTO flow_state (event_id, station_a_name, station_a_occ, station_a_cap, station_b_name, station_b_occ, station_b_cap, station_c_name, station_c_occ, station_c_cap, divert_b_count, divert_c_count, recommendation_active, recommendation_text)
VALUES
  ('aarpo-26', 'Station A (Main Stage)', 4700, 5000, 'Station B (Exhibition A)', 1920, 4000, 'Station C (Courtyard)', 1025, 2500, 3500, 2500, 0, 'Station A is getting crowded. We recommend Station B or C instead.'),
  ('lisbon-ux', 'Design Pavilion Main', 2100, 4000, 'Interactive Demo Arena', 1400, 2500, 'Networking Lounge', 600, 1500, 800, 500, 0, 'Smooth crowd flow across all pavilions.'),
  ('ai-city', 'Smart Mobility Grand Hall', 6500, 10000, 'Robotics & Sensor Expo', 3200, 6000, 'North Concourse Check-in', 1800, 4000, 1500, 1000, 0, 'Optimal flow in Grand Hall.')
ON CONFLICT (event_id) DO NOTHING;
