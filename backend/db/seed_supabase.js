/* db/seed_supabase.js — Seed Supabase PostgreSQL tables */
require('dotenv').config();
const { getSupabase, isSupabaseConfigured } = require('./supabase');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

async function seedSupabase() {
  if (!isSupabaseConfigured()) {
    console.error('[seed_supabase] ERROR: SUPABASE_URL and SUPABASE_KEY are not set in .env!');
    console.error('Please configure your Supabase credentials in backend/.env first.');
    process.exit(1);
  }

  const supabase = getSupabase();
  console.log('[seed_supabase] Seeding Supabase database...');

  // 1. Seed Users
  const alexAuth = hashPassword('alex123');
  const adminAuth = hashPassword('admin123');

  const users = [
    {
      id: 'user-visitor-alex',
      name: 'Alex Morgan',
      email: 'alex@eventos.io',
      password_hash: alexAuth.hash,
      password_salt: alexAuth.salt,
      address: 'Avenida da Liberdade 120, Lisbon',
      location_permission: 1,
      role: 'visitor'
    },
    {
      id: 'user-organizer-admin',
      name: 'Admin Organizer',
      email: 'admin@eventos.io',
      password_hash: adminAuth.hash,
      password_salt: adminAuth.salt,
      address: 'Rua Garrett 42, Lisbon',
      location_permission: 1,
      role: 'organizer'
    }
  ];

  const { error: userErr } = await supabase.from('users').upsert(users, { onConflict: 'id' });
  if (userErr) console.warn('[seed_supabase] users insert error:', userErr.message);
  else console.log('[seed_supabase] ✓ Users seeded (alex@eventos.io / admin@eventos.io)');

  // 2. Seed Events
  const events = [
    {
      id: 'aarpo-26',
      title: 'AARPO World Summit 2026',
      subtitle: 'Architecture & Design Assembly',
      category: 'Architecture',
      date_label: 'SEP 14-16, 2026',
      location: 'Lisbon Congress Center',
      address: 'Praça das Indústrias 1, 1300-307 Lisboa',
      start_time: '09:00 AM',
      end_time: '06:00 PM',
      organizer_id: 'user-organizer-admin',
      price_cents: 18500,
      currency: 'INR',
      status: 'available',
      description: 'The global gathering of architectural strategists, urbanists, and digital spatial designers defining future physical-digital environments.',
      max_capacity: 15000
    },
    {
      id: 'lisbon-ux',
      title: 'Lisbon UX & Design Expo',
      subtitle: 'Digital Products & Modern Interfaces',
      category: 'Design',
      date_label: 'SEP 18-19, 2026',
      location: 'FIL Pavilion 2',
      address: 'Rua do Bojador, Parque das Nações',
      start_time: '10:00 AM',
      end_time: '07:00 PM',
      organizer_id: 'user-organizer-admin',
      price_cents: 12000,
      currency: 'INR',
      status: 'selling_fast',
      description: 'Exploring human-centered design, digital interfaces, and modern user experiences for physical venues.',
      max_capacity: 8000
    },
    {
      id: 'ai-city',
      title: 'Smart Cities & Future Tech Forum',
      subtitle: 'Urban Innovation & Smart Mobility',
      category: 'Tech',
      date_label: 'OCT 02, 2026',
      location: 'Altice Arena',
      address: 'Rossio dos Olivais, 1990-231 Lisboa',
      start_time: '09:30 AM',
      end_time: '05:30 PM',
      organizer_id: 'user-organizer-admin',
      price_cents: 9500,
      currency: 'INR',
      status: 'early_bird',
      description: 'Discover real-time smart city technology, pedestrian flow management, and automated event infrastructure.',
      max_capacity: 20000
    },
    {
      id: 'pillai-pce-2026',
      title: 'Pillai College of Engineering (Alegria Campus)',
      subtitle: 'Ground Floor Interactive Blueprint & Live Spatial Intelligence',
      category: 'Campus & Festival',
      date_label: 'OCT 24-26, 2026',
      location: 'Pillai College of Engineering, New Panvel',
      address: 'Dr. K. M. Vasudevan Pillai Campus, Sector 16, New Panvel, Navi Mumbai',
      start_time: '09:00 AM',
      end_time: '07:30 PM',
      organizer_id: 'user-organizer-admin',
      price_cents: 5000,
      currency: 'INR',
      status: 'available',
      description: 'Official ground floor spatial map and real-time pedestrian flow management for Pillai College of Engineering during Alegria Festival.',
      file_name: 'blueprint_ground_floor.jpg',
      max_capacity: 15000
    }
  ];

  const { error: evErr } = await supabase.from('events').upsert(events, { onConflict: 'id' });
  if (evErr) console.warn('[seed_supabase] events insert error:', evErr.message);
  else console.log('[seed_supabase] ✓ Events seeded');

  // 3. Visitor Events
  const visitorEvents = [
    { user_id: 'user-visitor-alex', event_id: 'aarpo-26' },
    { user_id: 'user-visitor-alex', event_id: 'lisbon-ux' },
    { user_id: 'user-visitor-alex', event_id: 'pillai-pce-2026' }
  ];
  const { error: veErr } = await supabase.from('visitor_events').upsert(visitorEvents, { onConflict: 'user_id,event_id' });
  if (veErr) console.warn('[seed_supabase] visitor_events error:', veErr.message);
  else console.log('[seed_supabase] ✓ Visitor event registrations seeded');

  // 4. Passes
  const passes = [
    { id: 'PASS-88219', user_id: 'user-visitor-alex', event_id: 'aarpo-26', pass_type: 'Standard Summit Access', valid_dates: 'SEP 14-16, 2026', status: 'confirmed' },
    { id: 'PASS-44102', user_id: 'user-visitor-alex', event_id: 'lisbon-ux', pass_type: 'UX All-Access Pass', valid_dates: 'SEP 18-19, 2026', status: 'confirmed' },
    { id: 'PASS-77301', user_id: 'user-visitor-alex', event_id: 'pillai-pce-2026', pass_type: 'Alegria Campus Delegate Badge', valid_dates: 'OCT 24-26, 2026', status: 'confirmed' }
  ];
  const { error: passErr } = await supabase.from('passes').upsert(passes, { onConflict: 'id' });
  if (passErr) console.warn('[seed_supabase] passes error:', passErr.message);
  else console.log('[seed_supabase] ✓ Passes seeded');

  // 5. Sessions
  const sessions = [
    { id: 's1', event_id: 'aarpo-26', time_label: '09:30 AM', title: 'Keynote: Design for Tomorrow', stage: 'Main Auditorium', speaker: 'Elena Rostova' },
    { id: 's2', event_id: 'aarpo-26', time_label: '11:00 AM', title: 'Workshop: Modern UX & Simple Grids', stage: 'Studio B', speaker: 'Marc Vance' },
    { id: 's3', event_id: 'aarpo-26', time_label: '02:00 PM', title: 'Pedestrian Flow & Smart Venues', stage: 'Main Auditorium', speaker: 'Dr. Aris Thorne' },
    { id: 's4', event_id: 'aarpo-26', time_label: '04:00 PM', title: 'Panel: The Future of Event Experiences', stage: 'Workshop Pavilion', speaker: 'Sofia Alva & Panelists' },
    { id: 's5', event_id: 'lisbon-ux', time_label: '10:00 AM', title: 'Opening Keynote: Next-Gen Interfaces', stage: 'Pavilion Stage A', speaker: 'Sara Chen' },
    { id: 's6', event_id: 'lisbon-ux', time_label: '02:30 PM', title: 'Spatial UX & Responsive Physical Venues', stage: 'Pavilion Stage B', speaker: 'Lucas Rossi' },
    { id: 's7', event_id: 'ai-city', time_label: '09:30 AM', title: 'Smart Mobility & Urban Pedestrian Routing', stage: 'Arena Grand Hall', speaker: 'Dr. Kenji Sato' },
    { id: 's-pce-1', event_id: 'pillai-pce-2026', time_label: '09:30 AM', title: 'Inaugural Keynote & Alegria Opening Ceremony', stage: 'Quad Area (Central Lawn & Main Stage)', speaker: 'Dr. Sandeep Joshi (Principal)' },
    { id: 's-pce-2', event_id: 'pillai-pce-2026', time_label: '11:15 AM', title: 'Robotics & AI Innovation Showcase', stage: 'P-002 Innovation & Research Centre', speaker: 'Research & Innovation Cell' },
    { id: 's-pce-3', event_id: 'pillai-pce-2026', time_label: '01:45 PM', title: 'Inter-College Basketball & Futsal Championship', stage: 'Multipurpose Sports Complex', speaker: 'Sports Council' },
    { id: 's-pce-4', event_id: 'pillai-pce-2026', time_label: '03:30 PM', title: 'Full-Stack Hackathon & Codeathon', stage: 'R002 Department of IT Labs', speaker: 'Department of IT Faculty' },
    { id: 's-pce-5', event_id: 'pillai-pce-2026', time_label: '05:45 PM', title: 'Celebrity Night & Cultural Performances', stage: 'Quad Area (Central Lawn & Main Stage)', speaker: 'Alegria Student Committee' }
  ];
  const { error: sessErr } = await supabase.from('sessions').upsert(sessions, { onConflict: 'id' });
  if (sessErr) console.warn('[seed_supabase] sessions error:', sessErr.message);
  else console.log('[seed_supabase] ✓ Sessions seeded');

  // 6. Itinerary items
  const itinerary = [
    { user_id: 'user-visitor-alex', session_id: 's1' },
    { user_id: 'user-visitor-alex', session_id: 's3' },
    { user_id: 'user-visitor-alex', session_id: 's-pce-1' },
    { user_id: 'user-visitor-alex', session_id: 's-pce-2' }
  ];
  const { error: itErr } = await supabase.from('itinerary_items').upsert(itinerary, { onConflict: 'user_id,session_id' });
  if (itErr) console.warn('[seed_supabase] itinerary error:', itErr.message);
  else console.log('[seed_supabase] ✓ Itinerary items seeded');

  // 7. Zones
  const zones = [
    { id: 'zone-main', event_id: 'aarpo-26', name: 'Main Auditorium (Station A)', x: 50, y: 50, width: 220, height: 180, capacity: 5000, current_occ: 4700 },
    { id: 'zone-expo', event_id: 'aarpo-26', name: 'Exhibition Pavilion A (Station B)', x: 300, y: 50, width: 260, height: 180, capacity: 4000, current_occ: 1920 },
    { id: 'zone-food', event_id: 'aarpo-26', name: 'Culinary Courtyard (Station C)', x: 50, y: 260, width: 220, height: 150, capacity: 2500, current_occ: 1025 },
    { id: 'zone-studio', event_id: 'aarpo-26', name: 'Studio B Pavilion', x: 300, y: 260, width: 140, height: 150, capacity: 1500, current_occ: 850 },
    { id: 'zone-workshop', event_id: 'aarpo-26', name: 'Design Workshop Lab', x: 460, y: 260, width: 100, height: 150, capacity: 800, current_occ: 420 },
    { id: 'zone-south-gate', event_id: 'aarpo-26', name: 'South Concourse & Gate 3', x: 180, y: 440, width: 220, height: 70, capacity: 3000, current_occ: 2850 },
    { id: 'lux-main', event_id: 'lisbon-ux', name: 'Design Pavilion Main', x: 50, y: 50, width: 250, height: 180, capacity: 4000, current_occ: 2100 },
    { id: 'lux-expo', event_id: 'lisbon-ux', name: 'Interactive Demo Arena', x: 320, y: 50, width: 240, height: 180, capacity: 2500, current_occ: 1400 },
    { id: 'lux-lounge', event_id: 'lisbon-ux', name: 'Networking Lounge', x: 100, y: 260, width: 350, height: 150, capacity: 1500, current_occ: 600 },
    { id: 'aic-hall', event_id: 'ai-city', name: 'Smart Mobility Grand Hall', x: 50, y: 50, width: 280, height: 200, capacity: 10000, current_occ: 6500 },
    { id: 'aic-expo', event_id: 'ai-city', name: 'Robotics & Sensor Expo', x: 350, y: 50, width: 220, height: 200, capacity: 6000, current_occ: 3200 },
    { id: 'aic-gate', event_id: 'ai-city', name: 'North Concourse Check-in', x: 150, y: 300, width: 280, height: 100, capacity: 4000, current_occ: 1800 },
    // Pillai College Blueprint Zones
    { id: 'pce-quad', event_id: 'pillai-pce-2026', name: 'Quad Area (Central Lawn & Main Stage)', x: 155, y: 125, width: 230, height: 110, capacity: 5500, current_occ: 4850 },
    { id: 'pce-canteen', event_id: 'pillai-pce-2026', name: 'Canteen & Food Court (Gate 03)', x: 35, y: 20, width: 100, height: 75, capacity: 1800, current_occ: 1350 },
    { id: 'pce-sports', event_id: 'pillai-pce-2026', name: 'Multipurpose Sports Complex (Basketball & Futsal)', x: 520, y: 205, width: 105, height: 120, capacity: 2200, current_occ: 980 },
    { id: 'pce-gymkhana', event_id: 'pillai-pce-2026', name: 'Gymkhana & Indoor Sports Arena', x: 520, y: 70, width: 105, height: 75, capacity: 1200, current_occ: 650 },
    { id: 'pce-football', event_id: 'pillai-pce-2026', name: 'Football Ground (Alegria Arena)', x: 520, y: 345, width: 105, height: 100, capacity: 3000, current_occ: 1750 },
    { id: 'pce-library', event_id: 'pillai-pce-2026', name: 'Central Library & Study Zone', x: 165, y: 75, width: 85, height: 45, capacity: 900, current_occ: 480 },
    { id: 'pce-innovation', event_id: 'pillai-pce-2026', name: 'P-002 Innovation & Research Centre', x: 395, y: 125, width: 100, height: 55, capacity: 850, current_occ: 520 },
    { id: 'pce-machine', event_id: 'pillai-pce-2026', name: 'J001-J003 Machine Shop & Hydraulic Lab', x: 380, y: 35, width: 110, height: 60, capacity: 1000, current_occ: 410 },
    { id: 'pce-it', event_id: 'pillai-pce-2026', name: 'R002-R005 Department of IT & Materials Lab', x: 65, y: 205, width: 85, height: 95, capacity: 1100, current_occ: 730 },
    { id: 'pce-admin', event_id: 'pillai-pce-2026', name: 'S-Wing: Principal Office & Admission Enquiry', x: 220, y: 250, width: 165, height: 75, capacity: 1200, current_occ: 820 },
    { id: 'pce-gate01', event_id: 'pillai-pce-2026', name: 'Gate No. 01 (Pillai Campus Main Check-in)', x: 430, y: 415, width: 110, height: 50, capacity: 3000, current_occ: 2450 },
    { id: 'pce-gate02', event_id: 'pillai-pce-2026', name: 'Gate No. 02 & Gate No. 03 Entry Points', x: 10, y: 140, width: 55, height: 50, capacity: 1500, current_occ: 880 }
  ];
  const { error: zErr } = await supabase.from('zones').upsert(zones, { onConflict: 'id' });
  if (zErr) console.warn('[seed_supabase] zones error:', zErr.message);
  else console.log('[seed_supabase] ✓ Zones seeded');

  // 8. Flow state
  const flowStates = [
    {
      event_id: 'aarpo-26',
      station_a_name: 'Station A (Main Stage)',
      station_a_occ: 4700,
      station_a_cap: 5000,
      station_b_name: 'Station B (Exhibition A)',
      station_b_occ: 1920,
      station_b_cap: 4000,
      station_c_name: 'Station C (Courtyard)',
      station_c_occ: 1025,
      station_c_cap: 2500,
      divert_b_count: 3500,
      divert_c_count: 2500,
      recommendation_active: 0,
      recommendation_text: 'Station A is getting crowded. We recommend Station B or C instead.'
    },
    {
      event_id: 'lisbon-ux',
      station_a_name: 'Design Pavilion Main',
      station_a_occ: 2100,
      station_a_cap: 4000,
      station_b_name: 'Interactive Demo Arena',
      station_b_occ: 1400,
      station_b_cap: 2500,
      station_c_name: 'Networking Lounge',
      station_c_occ: 600,
      station_c_cap: 1500,
      divert_b_count: 800,
      divert_c_count: 500,
      recommendation_active: 0,
      recommendation_text: 'Smooth crowd flow across all pavilions.'
    },
    {
      event_id: 'ai-city',
      station_a_name: 'Smart Mobility Grand Hall',
      station_a_occ: 6500,
      station_a_cap: 10000,
      station_b_name: 'Robotics & Sensor Expo',
      station_b_occ: 3200,
      station_b_cap: 6000,
      station_c_name: 'North Concourse Check-in',
      station_c_occ: 1800,
      station_c_cap: 4000,
      divert_b_count: 1500,
      divert_c_count: 1000,
      recommendation_active: 0,
      recommendation_text: 'Optimal flow in Grand Hall.'
    },
    {
      event_id: 'pillai-pce-2026',
      station_a_name: 'Quad Area (Central Lawn & Main Stage)',
      station_a_occ: 4850,
      station_a_cap: 5500,
      station_b_name: 'Multipurpose Sports Complex',
      station_b_occ: 980,
      station_b_cap: 2200,
      station_c_name: 'Canteen & Food Court (Gate 03)',
      station_c_occ: 1350,
      station_c_cap: 1800,
      divert_b_count: 2000,
      divert_c_count: 1200,
      recommendation_active: 1,
      recommendation_text: '⚠️ Quad Area is nearing capacity (88%). Diverting pedestrian traffic toward Multipurpose Sports Complex and Canteen Food Court.'
    }
  ];
  const { error: flowErr } = await supabase.from('flow_state').upsert(flowStates, { onConflict: 'event_id' });
  if (flowErr) console.warn('[seed_supabase] flow_state error:', flowErr.message);
  else console.log('[seed_supabase] ✓ Flow state seeded');

  console.log('[seed_supabase] ⭐ Supabase database seeding complete!');
}

if (require.main === module) {
  seedSupabase().then(() => process.exit(0)).catch(err => {
    console.error('[seed_supabase] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { seedSupabase };
