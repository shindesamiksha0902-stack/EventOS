/* db/supabase.js — Supabase PostgreSQL client and unified database interface */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let _supabase = null;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project') && !SUPABASE_KEY.includes('your-anon-key'));
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('[supabase] Connected to Supabase at:', SUPABASE_URL.replace(/:\/\/.*@/, '://'));
  }
  return _supabase;
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_KEY,
  isSupabaseConfigured,
  getSupabase
};
