/* db/dataService.js — Unified Data Layer supporting Supabase PostgreSQL and SQLite fallback */
const { getSupabase, isSupabaseConfigured } = require('./supabase');
const { getDb, persist } = require('./index');
const { query, queryOne, run } = require('./helpers');

// Helper to determine if Supabase is active
function useSupabase() {
  return isSupabaseConfigured() && getSupabase() !== null;
}

const DataService = {
  isSupabaseActive() {
    return useSupabase();
  },

  // =========================================================================
  // USERS
  // =========================================================================
  async getUserByEmail(email) {
    const cleanEmail = email.toLowerCase().trim();
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') console.warn('[dataService] getUserByEmail error:', error.message);
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  },

  async getUserById(id) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') console.warn('[dataService] getUserById error:', error.message);
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM users WHERE id = ?', [id]);
  },

  async createUser(userData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('users')
        .insert(userData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const db = getDb();
    run(db, `
      INSERT INTO users (id, name, email, password_hash, password_salt, address, location_permission, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userData.id,
      userData.name,
      userData.email,
      userData.password_hash || null,
      userData.password_salt || null,
      userData.address || null,
      userData.location_permission ? 1 : 0,
      userData.role || 'visitor',
      userData.created_at || new Date().toISOString()
    ]);
    persist();
    return userData;
  },

  async updateUser(id, updateData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) console.warn('[dataService] updateUser error:', error.message);
      return data;
    }
    const db = getDb();
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updateData)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    vals.push(id);
    run(db, `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
    persist();
    return this.getUserById(id);
  },

  // =========================================================================
  // EVENTS
  // =========================================================================
  async getEvents(category) {
    if (useSupabase()) {
      let q = getSupabase().from('events').select('*');
      if (category && category !== 'All') {
        q = q.eq('category', category);
      }
      const { data, error } = await q.order('date_label', { ascending: true });
      if (error) console.warn('[dataService] getEvents error:', error.message);
      return data || [];
    }
    const db = getDb();
    if (category && category !== 'All') {
      return query(db, 'SELECT * FROM events WHERE category = ? ORDER BY date_label', [category]);
    }
    return query(db, 'SELECT * FROM events ORDER BY date_label', []);
  },

  async getEventById(id) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') console.warn('[dataService] getEventById error:', error.message);
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM events WHERE id = ?', [id]);
  },

  async createEvent(eventData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('events')
        .insert(eventData)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const db = getDb();
    run(db, `
      INSERT INTO events (id, title, subtitle, category, date_label, location, address, start_time, end_time, organizer_id, file_name, file_data, price_cents, currency, status, description, max_capacity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventData.id,
      eventData.title,
      eventData.subtitle || 'Event Experience',
      eventData.category || 'General',
      eventData.date_label,
      eventData.location,
      eventData.address || eventData.location,
      eventData.start_time || '09:00 AM',
      eventData.end_time || '06:00 PM',
      eventData.organizer_id || null,
      eventData.file_name || null,
      eventData.file_data || null,
      eventData.price_cents || 0,
      eventData.currency || 'INR',
      eventData.status || 'available',
      eventData.description || 'Event on EVENTOS platform.',
      eventData.max_capacity || 15000,
      eventData.created_at || new Date().toISOString()
    ]);
    persist();
    return eventData;
  },

  async updateEvent(id, updateData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) console.warn('[dataService] updateEvent error:', error.message);
      return data;
    }
    const db = getDb();
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updateData)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    vals.push(id);
    run(db, `UPDATE events SET ${sets.join(', ')} WHERE id = ?`, vals);
    persist();
    return this.getEventById(id);
  },

  async getUserEvents(userId, role) {
    if (useSupabase()) {
      if (role === 'organizer') {
        const { data, error } = await getSupabase()
          .from('events')
          .select('*')
          .eq('organizer_id', userId)
          .order('date_label');
        if (data && data.length) return data;
        // Fallback to all events
        const { data: allEvs } = await getSupabase().from('events').select('*').order('date_label');
        return allEvs || [];
      } else {
        // Visitor events via visitor_events join
        const { data: veData } = await getSupabase()
          .from('visitor_events')
          .select('event_id, events(*)')
          .eq('user_id', userId);
        
        let events = (veData || []).map(r => r.events).filter(Boolean);
        if (!events.length) {
          // Check passes
          const { data: passData } = await getSupabase()
            .from('passes')
            .select('event_id, events(*)')
            .eq('user_id', userId);
          events = (passData || []).map(r => r.events).filter(Boolean);
        }
        if (!events.length) {
          const { data: defaultEv } = await getSupabase().from('events').select('*').eq('id', 'aarpo-26');
          events = defaultEv || [];
        }
        return events;
      }
    }

    const db = getDb();
    if (role === 'organizer') {
      let events = query(db, 'SELECT * FROM events WHERE organizer_id = ? ORDER BY date_label', [userId]);
      if (!events.length) events = query(db, 'SELECT * FROM events ORDER BY date_label', []);
      return events;
    } else {
      let events = query(db, `
        SELECT e.* FROM visitor_events ve
        JOIN events e ON e.id = ve.event_id
        WHERE ve.user_id = ?
        ORDER BY e.date_label
      `, [userId]);

      if (!events.length) {
        events = query(db, `
          SELECT DISTINCT e.* FROM passes p
          JOIN events e ON e.id = p.event_id
          WHERE p.user_id = ?
          ORDER BY e.date_label
        `, [userId]);
      }

      if (!events.length) {
        events = query(db, 'SELECT * FROM events WHERE id = "aarpo-26"', []);
      }
      return events;
    }
  },

  async registerVisitorForEvent(userId, eventId) {
    const now = new Date().toISOString();
    if (useSupabase()) {
      const { error } = await getSupabase()
        .from('visitor_events')
        .upsert({ user_id: userId, event_id: eventId, registered_at: now }, { onConflict: 'user_id,event_id' });
      if (error) console.warn('[dataService] registerVisitorForEvent error:', error.message);
      return;
    }
    const db = getDb();
    run(db, 'INSERT OR IGNORE INTO visitor_events (user_id, event_id, registered_at) VALUES (?, ?, ?)', [userId, eventId, now]);
    persist();
  },

  // =========================================================================
  // SESSIONS
  // =========================================================================
  async getSessionsByEventId(eventId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('sessions')
        .select('*')
        .eq('event_id', eventId)
        .order('time_label', { ascending: true });
      if (error) console.warn('[dataService] getSessionsByEventId error:', error.message);
      return data || [];
    }
    const db = getDb();
    return query(db, 'SELECT * FROM sessions WHERE event_id = ? ORDER BY time_label', [eventId]);
  },

  async getSessionById(id) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM sessions WHERE id = ?', [id]);
  },

  async createSession(sessionData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('sessions').insert(sessionData).select().single();
      if (error) console.warn('[dataService] createSession error:', error.message);
      return data;
    }
    const db = getDb();
    run(db, 'INSERT INTO sessions (id, event_id, time_label, title, stage, speaker) VALUES (?,?,?,?,?,?)',
      [sessionData.id, sessionData.event_id, sessionData.time_label, sessionData.title, sessionData.stage, sessionData.speaker]
    );
    persist();
    return sessionData;
  },

  // =========================================================================
  // ZONES
  // =========================================================================
  async getZonesByEventId(eventId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('zones')
        .select('*')
        .eq('event_id', eventId);
      if (error) console.warn('[dataService] getZonesByEventId error:', error.message);
      return data || [];
    }
    const db = getDb();
    return query(db, 'SELECT * FROM zones WHERE event_id = ?', [eventId]);
  },

  async createZone(zoneData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('zones').upsert(zoneData, { onConflict: 'id' }).select().single();
      if (error) console.warn('[dataService] createZone error:', error.message);
      return data || zoneData;
    }
    const db = getDb();
    run(db, 'INSERT OR REPLACE INTO zones (id, event_id, name, x, y, width, height, capacity, current_occ) VALUES (?,?,?,?,?,?,?,?,?)',
      [zoneData.id, zoneData.event_id, zoneData.name, zoneData.x, zoneData.y, zoneData.width, zoneData.height, zoneData.capacity, zoneData.current_occ || 0]
    );
    persist();
    return zoneData;
  },

  async deleteZonesByEventId(eventId) {
    if (useSupabase()) {
      const { error } = await getSupabase().from('zones').delete().eq('event_id', eventId);
      if (error) console.warn('[dataService] deleteZonesByEventId error:', error.message);
      return;
    }
    const db = getDb();
    run(db, 'DELETE FROM zones WHERE event_id = ?', [eventId]);
    persist();
  },

  async replaceEventZones(eventId, zones) {
    await this.deleteZonesByEventId(eventId);
    const created = [];
    for (const z of zones) {
      const zoneItem = {
        id: z.id || `${eventId}-z${Math.floor(100 + Math.random() * 900)}`,
        event_id: eventId,
        name: z.name || 'Zone',
        x: parseInt(z.x) || 50,
        y: parseInt(z.y) || 50,
        width: parseInt(z.width) || 120,
        height: parseInt(z.height) || 80,
        capacity: parseInt(z.capacity) || 1000,
        current_occ: z.current_occ !== undefined ? parseInt(z.current_occ) : Math.round((parseInt(z.capacity) || 1000) * 0.6)
      };
      await this.createZone(zoneItem);
      created.push(zoneItem);
    }
    return created;
  },

  async updateZoneOccupancy(id, eventId, currentOcc) {
    if (useSupabase()) {
      const { error } = await getSupabase()
        .from('zones')
        .update({ current_occ: currentOcc })
        .eq('id', id)
        .eq('event_id', eventId);
      if (error) console.warn('[dataService] updateZoneOccupancy error:', error.message);
      return;
    }
    const db = getDb();
    run(db, 'UPDATE zones SET current_occ = ? WHERE id = ? AND event_id = ?', [currentOcc, id, eventId]);
    persist();
  },

  // =========================================================================
  // PASSES
  // =========================================================================
  async getPassesByUserId(userId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('passes')
        .select('*, events(title)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });
      if (error) console.warn('[dataService] getPassesByUserId error:', error.message);
      return (data || []).map(p => ({ ...p, event_title: p.events ? p.events.title : '' }));
    }
    const db = getDb();
    return query(db,
      'SELECT p.*, e.title as event_title FROM passes p JOIN events e ON e.id = p.event_id WHERE p.user_id = ? ORDER BY p.issued_at DESC',
      [userId]
    );
  },

  async getPassById(id) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('passes')
        .select('*, events(title), users(name)')
        .eq('id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') console.warn('[dataService] getPassById error:', error.message);
      if (!data) return null;
      return {
        ...data,
        event_title: data.events ? data.events.title : '',
        holder_name: data.users ? data.users.name : ''
      };
    }
    const db = getDb();
    return queryOne(db,
      'SELECT p.*, e.title as event_title, u.name as holder_name FROM passes p JOIN events e ON e.id = p.event_id JOIN users u ON u.id = p.user_id WHERE p.id = ?',
      [id]
    );
  },

  async findExistingPass(userId, eventId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('passes')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .neq('status', 'cancelled')
        .maybeSingle();
      return data || null;
    }
    const db = getDb();
    return queryOne(db, "SELECT id FROM passes WHERE user_id = ? AND event_id = ? AND status != 'cancelled'", [userId, eventId]);
  },

  async createPass(passData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('passes').insert(passData).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    const db = getDb();
    run(db, 'INSERT INTO passes (id, user_id, event_id, pass_type, valid_dates, status, issued_at) VALUES (?,?,?,?,?,?,?)',
      [passData.id, passData.user_id, passData.event_id, passData.pass_type, passData.valid_dates, passData.status || 'confirmed', passData.issued_at || new Date().toISOString()]
    );
    persist();
    return passData;
  },

  async cancelPass(id) {
    if (useSupabase()) {
      const { error } = await getSupabase().from('passes').update({ status: 'cancelled' }).eq('id', id);
      if (error) console.warn('[dataService] cancelPass error:', error.message);
      return;
    }
    const db = getDb();
    run(db, "UPDATE passes SET status = 'cancelled' WHERE id = ?", [id]);
    persist();
  },

  async getConfirmedPassCount(eventId) {
    if (useSupabase()) {
      const { count, error } = await getSupabase()
        .from('passes')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'confirmed');
      return count || 0;
    }
    const db = getDb();
    const row = queryOne(db, "SELECT COUNT(*) as cnt FROM passes WHERE event_id = ? AND status = 'confirmed'", [eventId]);
    return row ? row.cnt : 0;
  },

  // =========================================================================
  // ITINERARY
  // =========================================================================
  async getItineraryByUserId(userId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('itinerary_items')
        .select('session_id, sessions(*)')
        .eq('user_id', userId);
      if (error) console.warn('[dataService] getItineraryByUserId error:', error.message);
      return (data || []).map(r => r.sessions).filter(Boolean);
    }
    const db = getDb();
    return query(db,
      'SELECT s.* FROM itinerary_items i JOIN sessions s ON s.id = i.session_id WHERE i.user_id = ? ORDER BY s.time_label',
      [userId]
    );
  },

  async addItineraryItem(userId, sessionId) {
    if (useSupabase()) {
      const { error } = await getSupabase()
        .from('itinerary_items')
        .insert({ user_id: userId, session_id: sessionId });
      if (error) throw new Error(error.message);
      return { user_id: userId, session_id: sessionId, added: true };
    }
    const db = getDb();
    run(db, 'INSERT INTO itinerary_items (user_id,session_id) VALUES (?,?)', [userId, sessionId]);
    persist();
    return { user_id: userId, session_id: sessionId, added: true };
  },

  async removeItineraryItem(userId, sessionId) {
    if (useSupabase()) {
      const { error } = await getSupabase()
        .from('itinerary_items')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);
      if (error) throw new Error(error.message);
      return { user_id: userId, session_id: sessionId, removed: true };
    }
    const db = getDb();
    run(db, 'DELETE FROM itinerary_items WHERE user_id = ? AND session_id = ?', [userId, sessionId]);
    persist();
    return { user_id: userId, session_id: sessionId, removed: true };
  },

  async hasItineraryItem(userId, sessionId) {
    if (useSupabase()) {
      const { data } = await getSupabase()
        .from('itinerary_items')
        .select('user_id')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .maybeSingle();
      return Boolean(data);
    }
    const db = getDb();
    return Boolean(queryOne(db, 'SELECT 1 FROM itinerary_items WHERE user_id = ? AND session_id = ?', [userId, sessionId]));
  },

  // =========================================================================
  // ALERTS
  // =========================================================================
  async getAlertsByEventId(eventId, limit = 50) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('alerts')
        .select('*, users(name), zones(name)')
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (error) console.warn('[dataService] getAlertsByEventId error:', error.message);
      return (data || []).map(a => ({
        ...a,
        organizer_name: a.users ? a.users.name : 'Organizer',
        zone_name: a.zones ? a.zones.name : null
      }));
    }
    const db = getDb();
    return query(db,
      'SELECT a.*, u.name as organizer_name, z.name as zone_name FROM alerts a JOIN users u ON u.id = a.organizer_id LEFT JOIN zones z ON z.id = a.zone_id WHERE a.event_id = ? ORDER BY a.sent_at DESC LIMIT ?',
      [eventId, limit]
    );
  },

  async getLatestAlert(eventId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('alerts')
        .select('*')
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM alerts WHERE event_id = ? ORDER BY sent_at DESC LIMIT 1', [eventId]);
  },

  async createAlert(alertData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('alerts').insert(alertData).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    const db = getDb();
    run(db, 'INSERT INTO alerts (id,event_id,organizer_id,message,zone_id,sent_at) VALUES (?,?,?,?,?,?)',
      [alertData.id, alertData.event_id, alertData.organizer_id, alertData.message, alertData.zone_id || null, alertData.sent_at || new Date().toISOString()]
    );
    persist();
    return alertData;
  },

  // =========================================================================
  // STAFF DISPATCHES
  // =========================================================================
  async getDispatchesByEventId(eventId, limit = 50) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('staff_dispatches')
        .select('*, zones(name), users(name)')
        .eq('event_id', eventId)
        .order('dispatched_at', { ascending: false })
        .limit(limit);
      if (error) console.warn('[dataService] getDispatchesByEventId error:', error.message);
      return (data || []).map(d => ({
        ...d,
        zone_name: d.zones ? d.zones.name : null,
        organizer_name: d.users ? d.users.name : null
      }));
    }
    const db = getDb();
    return query(db,
      'SELECT d.*, z.name as zone_name, u.name as organizer_name FROM staff_dispatches d LEFT JOIN zones z ON z.id = d.zone_id LEFT JOIN users u ON u.id = d.organizer_id WHERE d.event_id = ? ORDER BY d.dispatched_at DESC LIMIT ?',
      [eventId, limit]
    );
  },

  async createDispatch(dispatchData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('staff_dispatches').insert(dispatchData).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    const db = getDb();
    run(db, 'INSERT INTO staff_dispatches (id,event_id,zone_id,organizer_id,note,dispatched_at) VALUES (?,?,?,?,?,?)',
      [dispatchData.id, dispatchData.event_id, dispatchData.zone_id || null, dispatchData.organizer_id || null, dispatchData.note || null, dispatchData.dispatched_at || new Date().toISOString()]
    );
    persist();
    return dispatchData;
  },

  // =========================================================================
  // FLOW STATE
  // =========================================================================
  async getFlowState(eventId) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('flow_state')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      return data || null;
    }
    const db = getDb();
    return queryOne(db, 'SELECT * FROM flow_state WHERE event_id = ?', [eventId]);
  },

  async upsertFlowState(flowData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('flow_state')
        .upsert(flowData, { onConflict: 'event_id' })
        .select()
        .maybeSingle();
      if (error) console.warn('[dataService] upsertFlowState error:', error.message);
      return data;
    }
    const db = getDb();
    run(db, `
      INSERT INTO flow_state (event_id, station_a_name, station_a_occ, station_a_cap, station_b_name, station_b_occ, station_b_cap, station_c_name, station_c_occ, station_c_cap, divert_b_count, divert_c_count, recommendation_active, recommendation_text, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      flowData.event_id,
      flowData.station_a_name, flowData.station_a_occ, flowData.station_a_cap,
      flowData.station_b_name, flowData.station_b_occ, flowData.station_b_cap,
      flowData.station_c_name, flowData.station_c_occ, flowData.station_c_cap,
      flowData.divert_b_count, flowData.divert_c_count,
      flowData.recommendation_active, flowData.recommendation_text,
      flowData.updated_at || new Date().toISOString()
    ]);
    persist();
    return flowData;
  },

  async updateFlowState(eventId, updateData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase()
        .from('flow_state')
        .update(updateData)
        .eq('event_id', eventId)
        .select()
        .maybeSingle();
      if (error) console.warn('[dataService] updateFlowState error:', error.message);
      return data;
    }
    const db = getDb();
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(updateData)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
    vals.push(eventId);
    run(db, `UPDATE flow_state SET ${sets.join(', ')} WHERE event_id = ?`, vals);
    persist();
    return this.getFlowState(eventId);
  },

  // =========================================================================
  // JOURNEYS
  // =========================================================================
  async createJourney(journeyData) {
    if (useSupabase()) {
      const { data, error } = await getSupabase().from('journeys').insert(journeyData).select().single();
      if (error) console.warn('[dataService] createJourney error:', error.message);
      return data;
    }
    const db = getDb();
    run(db, 'INSERT INTO journeys (id, user_id, event_id, start_zone, destination_session, route_steps_json, eta_minutes, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [journeyData.id, journeyData.user_id, journeyData.event_id, journeyData.start_zone, journeyData.destination_session, journeyData.route_steps_json, journeyData.eta_minutes, journeyData.status || 'active', journeyData.created_at || new Date().toISOString()]
    );
    persist();
    return journeyData;
  },

  async getJourneysByUser(userId, eventId) {
    if (useSupabase()) {
      let q = getSupabase().from('journeys').select('*').eq('user_id', userId);
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) console.warn('[dataService] getJourneysByUser error:', error.message);
      return (data || []).map(j => ({
        ...j,
        route_steps: typeof j.route_steps_json === 'string' ? JSON.parse(j.route_steps_json || '[]') : j.route_steps_json
      }));
    }
    const db = getDb();
    const journeys = query(db, 'SELECT * FROM journeys WHERE user_id = ? AND event_id = ? ORDER BY created_at DESC', [userId, eventId]);
    return journeys.map(j => ({
      ...j,
      route_steps: JSON.parse(j.route_steps_json || '[]')
    }));
  }
};

module.exports = DataService;
