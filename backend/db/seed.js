/* db/seed.js — populate with sql.js */
const { initDb, persist } = require('./index');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function run(db, sql, params) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
}

function query(db, sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params || []);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

(async () => {
  const db = await initDb();

  // Clear existing data
  ['journeys','flow_state','staff_dispatches','alerts','itinerary_items','passes','visitor_events','zones','sessions','events','users'].forEach(t => {
    try { db.run(`DELETE FROM ${t}`); } catch(e) {}
  });

  // Users
  const alexAuth  = hashPassword('alex123');
  const adminAuth = hashPassword('admin123');

  run(db, `
    INSERT INTO users (id, name, email, password_hash, password_salt, address, location_permission, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'user-visitor-alex',
    'Alex Morgan',
    'alex@eventos.io',
    alexAuth.hash,
    alexAuth.salt,
    'Avenida da Liberdade 120, Lisbon',
    1,
    'visitor'
  ]);

  run(db, `
    INSERT INTO users (id, name, email, password_hash, password_salt, address, location_permission, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'user-organizer-admin',
    'Admin Organizer',
    'admin@eventos.io',
    adminAuth.hash,
    adminAuth.salt,
    'Rua Garrett 42, Lisbon',
    1,
    'organizer'
  ]);

  // Events
  const events = [
    ['aarpo-26',  'AARPO World Summit 2026',         'Architecture & Design Assembly',      'Architecture','SEP 14-16, 2026','Lisbon Congress Center','Praça das Indústrias 1, 1300-307 Lisboa','09:00 AM','06:00 PM','user-organizer-admin',null,null,18500,'INR','available',   'The global gathering of architectural strategists, urbanists, and digital spatial designers defining future physical-digital environments.',15000],
    ['lisbon-ux', 'Lisbon UX & Design Expo',          'Digital Products & Modern Interfaces', 'Design',       'SEP 18-19, 2026','FIL Pavilion 2',        'Rua do Bojador, Parque das Nações',  '10:00 AM','07:00 PM','user-organizer-admin',null,null,12000,'INR','selling_fast','Exploring human-centered design, digital interfaces, and modern user experiences for physical venues.',8000],
    ['ai-city',   'Smart Cities & Future Tech Forum', 'Urban Innovation & Smart Mobility',    'Tech',         'OCT 02, 2026',   'Altice Arena',          'Rossio dos Olivais, 1990-231 Lisboa','09:30 AM','05:30 PM','user-organizer-admin',null,null,9500, 'INR','early_bird', 'Discover real-time smart city technology, pedestrian flow management, and automated event infrastructure.',20000]
  ];
  events.forEach(e => run(db,
    'INSERT INTO events (id,title,subtitle,category,date_label,location,address,start_time,end_time,organizer_id,file_name,file_data,price_cents,currency,status,description,max_capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    e
  ));

  // Visitor Events
  run(db, 'INSERT INTO visitor_events (user_id, event_id) VALUES (?,?)', ['user-visitor-alex', 'aarpo-26']);
  run(db, 'INSERT INTO visitor_events (user_id, event_id) VALUES (?,?)', ['user-visitor-alex', 'lisbon-ux']);

  // Passes
  run(db, 'INSERT INTO passes (id,user_id,event_id,pass_type,valid_dates,status) VALUES (?,?,?,?,?,?)',
    ['PASS-88219','user-visitor-alex','aarpo-26','Standard Summit Access','SEP 14-16, 2026','confirmed']
  );
  run(db, 'INSERT INTO passes (id,user_id,event_id,pass_type,valid_dates,status) VALUES (?,?,?,?,?,?)',
    ['PASS-44102','user-visitor-alex','lisbon-ux','UX All-Access Pass','SEP 18-19, 2026','confirmed']
  );

  // Sessions for aarpo-26
  const sessions = [
    ['s1','aarpo-26','09:30 AM','Keynote: Design for Tomorrow',           'Main Auditorium',  'Elena Rostova'],
    ['s2','aarpo-26','11:00 AM','Workshop: Modern UX & Simple Grids',     'Studio B',         'Marc Vance'],
    ['s3','aarpo-26','02:00 PM','Pedestrian Flow & Smart Venues',         'Main Auditorium',  'Dr. Aris Thorne'],
    ['s4','aarpo-26','04:00 PM','Panel: The Future of Event Experiences', 'Workshop Pavilion','Sofia Alva & Panelists'],
    ['s5','lisbon-ux','10:00 AM','Opening Keynote: Next-Gen Interfaces',   'Pavilion Stage A', 'Sara Chen'],
    ['s6','lisbon-ux','02:30 PM','Spatial UX & Responsive Physical Venues','Pavilion Stage B', 'Lucas Rossi'],
    ['s7','ai-city','09:30 AM','Smart Mobility & Urban Pedestrian Routing','Arena Grand Hall', 'Dr. Kenji Sato']
  ];
  sessions.forEach(s => run(db,
    'INSERT INTO sessions (id,event_id,time_label,title,stage,speaker) VALUES (?,?,?,?,?,?)',
    s
  ));

  // Itinerary
  ['s1','s3'].forEach(sid => run(db, 'INSERT INTO itinerary_items (user_id,session_id) VALUES (?,?)', ['user-visitor-alex', sid]));

  // Zones for all events
  const zones = [
    // aarpo-26
    ['zone-main',      'aarpo-26','Main Auditorium (Station A)', 50, 50, 220,180,5000,4700],
    ['zone-expo',      'aarpo-26','Exhibition Pavilion A (Station B)', 300, 50, 260,180,4000,1920],
    ['zone-food',      'aarpo-26','Culinary Courtyard (Station C)', 50,260, 220,150,2500,1025],
    ['zone-studio',    'aarpo-26','Studio B Pavilion',           300,260, 140,150,1500, 850],
    ['zone-workshop',  'aarpo-26','Design Workshop Lab',         460,260, 100,150, 800, 420],
    ['zone-south-gate','aarpo-26','South Concourse & Gate 3',    180,440,220, 70,3000,2850],
    // lisbon-ux
    ['lux-main',       'lisbon-ux','Design Pavilion Main',       50, 50, 250, 180, 4000, 2100],
    ['lux-expo',       'lisbon-ux','Interactive Demo Arena',     320, 50, 240, 180, 2500, 1400],
    ['lux-lounge',     'lisbon-ux','Networking Lounge',          100, 260, 350, 150, 1500, 600],
    // ai-city
    ['aic-hall',       'ai-city',  'Smart Mobility Grand Hall',  50, 50, 280, 200, 10000, 6500],
    ['aic-expo',       'ai-city',  'Robotics & Sensor Expo',     350, 50, 220, 200, 6000, 3200],
    ['aic-gate',       'ai-city',  'North Concourse Check-in',   150, 300, 280, 100, 4000, 1800]
  ];
  zones.forEach(z => run(db,
    'INSERT INTO zones (id,event_id,name,x,y,width,height,capacity,current_occ) VALUES (?,?,?,?,?,?,?,?,?)',
    z
  ));

  // Flow State for events
  const flowStates = [
    ['aarpo-26', 'Station A (Main Stage)', 4700, 5000, 'Station B (Exhibition A)', 1920, 4000, 'Station C (Courtyard)', 1025, 2500, 3500, 2500, 0, 'Station A is getting crowded. We recommend Station B or C instead.'],
    ['lisbon-ux', 'Design Pavilion Main', 2100, 4000, 'Interactive Demo Arena', 1400, 2500, 'Networking Lounge', 600, 1500, 800, 500, 0, 'Smooth crowd flow across all pavilions.'],
    ['ai-city', 'Smart Mobility Grand Hall', 6500, 10000, 'Robotics & Sensor Expo', 3200, 6000, 'North Concourse Check-in', 1800, 4000, 1500, 1000, 0, 'Optimal flow in Grand Hall.']
  ];
  flowStates.forEach(f => run(db, `
    INSERT INTO flow_state (event_id, station_a_name, station_a_occ, station_a_cap, station_b_name, station_b_occ, station_b_cap, station_c_name, station_c_occ, station_c_cap, divert_b_count, divert_c_count, recommendation_active, recommendation_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, f));

  persist();
  console.log('[seed] Database seeded with multi-user, multi-event, and hashed credentials.');
})();

