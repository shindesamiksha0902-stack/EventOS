/* db/migrate.js — idempotent schema using sql.js */
const { initDb, persist } = require('./index');

(async () => {
  const db = await initDb();

  // Add missing columns if tables already existed
  const safeAlter = (sql) => {
    try { db.run(sql); } catch(e) {}
  };

  safeAlter("ALTER TABLE users ADD COLUMN password_hash TEXT");
  safeAlter("ALTER TABLE users ADD COLUMN password_salt TEXT");
  safeAlter("ALTER TABLE users ADD COLUMN address TEXT");
  safeAlter("ALTER TABLE users ADD COLUMN location_permission INTEGER DEFAULT 0");
  safeAlter("ALTER TABLE users ADD COLUMN created_at TEXT");

  safeAlter("ALTER TABLE events ADD COLUMN address TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN start_time TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN end_time TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN organizer_id TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN file_name TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN file_data TEXT");
  safeAlter("ALTER TABLE events ADD COLUMN created_at TEXT");

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      subtitle     TEXT,
      category     TEXT NOT NULL DEFAULT 'General',
      date_label   TEXT NOT NULL,
      location     TEXT NOT NULL,
      address      TEXT,
      start_time   TEXT,
      end_time     TEXT,
      organizer_id TEXT,
      file_name    TEXT,
      file_data    TEXT,
      price_cents  INTEGER NOT NULL DEFAULT 0,
      currency     TEXT NOT NULL DEFAULT 'INR',
      status       TEXT NOT NULL DEFAULT 'available',
      description  TEXT,
      max_capacity INTEGER NOT NULL DEFAULT 15000,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      event_id   TEXT NOT NULL,
      time_label TEXT NOT NULL,
      title      TEXT NOT NULL,
      stage      TEXT NOT NULL,
      speaker    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      email               TEXT UNIQUE NOT NULL,
      password_hash       TEXT,
      password_salt       TEXT,
      address             TEXT,
      location_permission INTEGER NOT NULL DEFAULT 0,
      role                TEXT NOT NULL DEFAULT 'visitor',
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS visitor_events (
      user_id       TEXT NOT NULL,
      event_id      TEXT NOT NULL,
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, event_id)
    );
    CREATE TABLE IF NOT EXISTS passes (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      event_id    TEXT NOT NULL,
      pass_type   TEXT NOT NULL DEFAULT 'Standard Summit Access',
      valid_dates TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'confirmed',
      issued_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS itinerary_items (
      user_id    TEXT NOT NULL,
      session_id TEXT NOT NULL,
      PRIMARY KEY (user_id, session_id)
    );
    CREATE TABLE IF NOT EXISTS zones (
      id           TEXT PRIMARY KEY,
      event_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      x            INTEGER NOT NULL,
      y            INTEGER NOT NULL,
      width        INTEGER NOT NULL,
      height       INTEGER NOT NULL,
      capacity     INTEGER NOT NULL,
      current_occ  INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id           TEXT PRIMARY KEY,
      event_id     TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      message      TEXT NOT NULL,
      zone_id      TEXT,
      sent_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff_dispatches (
      id            TEXT PRIMARY KEY,
      event_id      TEXT NOT NULL,
      zone_id       TEXT,
      organizer_id  TEXT,
      note          TEXT,
      dispatched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS flow_state (
      event_id              TEXT PRIMARY KEY,
      station_a_name        TEXT NOT NULL DEFAULT 'Station A (Main Stage)',
      station_a_occ         INTEGER NOT NULL DEFAULT 4700,
      station_a_cap         INTEGER NOT NULL DEFAULT 5000,
      station_b_name        TEXT NOT NULL DEFAULT 'Station B (Exhibition A)',
      station_b_occ         INTEGER NOT NULL DEFAULT 1920,
      station_b_cap         INTEGER NOT NULL DEFAULT 4000,
      station_c_name        TEXT NOT NULL DEFAULT 'Station C (Courtyard)',
      station_c_occ         INTEGER NOT NULL DEFAULT 1025,
      station_c_cap         INTEGER NOT NULL DEFAULT 2500,
      divert_b_count        INTEGER NOT NULL DEFAULT 3500,
      divert_c_count        INTEGER NOT NULL DEFAULT 2500,
      recommendation_active INTEGER NOT NULL DEFAULT 0,
      recommendation_text   TEXT,
      updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS journeys (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL,
      event_id            TEXT NOT NULL,
      start_zone          TEXT NOT NULL,
      destination_session TEXT,
      route_steps_json    TEXT NOT NULL,
      eta_minutes         INTEGER NOT NULL DEFAULT 5,
      status              TEXT NOT NULL DEFAULT 'active',
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  persist();
  console.log('[migrate] Schema applied successfully.');
})();
