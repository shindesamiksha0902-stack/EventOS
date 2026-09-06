/* js/api.js - Frontend API service layer connecting to the Express backend */

function getApiBase() {
  return (window.EVENTOS_CONFIG && window.EVENTOS_CONFIG.API_BASE) || 'http://localhost:3001/api';
}

function getHealthUrl() {
  if (window.EVENTOS_CONFIG && typeof window.EVENTOS_CONFIG.getHealthUrl === 'function') {
    return window.EVENTOS_CONFIG.getHealthUrl();
  }
  return getApiBase().replace(/\/api\/?$/, '') + '/health';
}

window.EventosAPI = {

  // -- Connection state -----------------------------------------
  isLive: false,
  _liveListeners: [],
  _pollingTimers: {},

  getBaseUrl() {
    return getApiBase();
  },

  onLiveChange(fn) {
    this._liveListeners.push(fn);
  },

  _notifyLive(state) {
    this.isLive = state;
    this._liveListeners.forEach(fn => {
      try { fn(state); } catch (e) { console.warn(e); }
    });
  },

  // -- Utility -------------------------------------------------
  async _fetch(path, options = {}) {
    const base = getApiBase();
    const res = await fetch(base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || ('HTTP ' + res.status));
    return json.data;
  },

  // -- Health / connectivity check -----------------------------
  async checkHealth() {
    try {
      const healthEndpoint = getHealthUrl();
      const res = await fetch(healthEndpoint, { signal: AbortSignal.timeout(3000) });
      const json = await res.json();
      if (json.status === 'ok') {
        this._notifyLive(true);
        return true;
      }
    } catch (e) { /* offline */ }
    this._notifyLive(false);
    return false;
  },

  // -- Local Fallback Helpers ----------------------------------
  _getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('eventos_local_users')) || [];
    } catch (e) {
      return [];
    }
  },

  _saveLocalUsers(users) {
    try {
      localStorage.setItem('eventos_local_users', JSON.stringify(users));
    } catch (e) {}
  },

  // -- Auth / Registration / Login ----------------------------
  async registerUser(payload) {
    try {
      const data = await this._fetch('/users/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return data;
    } catch (err) {
      // If server returned a business validation error (e.g., email already exists, 400), throw it
      if (err.message && !err.message.includes('fetch') && !err.message.includes('HTTP 502') && !err.message.includes('HTTP 503')) {
        throw err;
      }
      console.warn('[EventOS] Backend offline, saving registration locally:', err.message);

      const users = this._getLocalUsers();
      const normalizedEmail = (payload.email || '').toLowerCase().trim();
      const existing = users.find(u => u.email === normalizedEmail);
      if (existing) {
        throw new Error('An account with this email already exists. Please log in.');
      }

      const userId = 'user-local-' + Date.now();
      const newUser = {
        id: userId,
        name: payload.name ? payload.name.trim() : 'Event Attendee',
        email: normalizedEmail,
        password: payload.password,
        address: payload.address,
        role: payload.role || 'visitor',
        location_permission: payload.location_permission ? 1 : 0,
        event_name: payload.event_name,
        event_id: payload.event_id || 'aarpo-26'
      };
      users.push(newUser);
      this._saveLocalUsers(users);

      const event = {
        id: payload.event_id || 'aarpo-26',
        title: payload.event_name || 'AARPO World Summit 2026',
        location: payload.event_location || 'Lisbon Congress Center',
        date_label: payload.event_date || 'SEP 14-16, 2026',
        start_time: payload.start_time || '09:00 AM',
        end_time: payload.end_time || '06:00 PM',
        file_name: payload.file_name || null,
        file_data: payload.file_data || null
      };

      return {
        user: newUser,
        event
      };
    }
  },

  async loginUserWithPassword(email, password, role) {
    try {
      const data = await this._fetch('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
      });
      return data;
    } catch (err) {
      // If server returned a password error, check local or throw
      const normEmail = (email || '').toLowerCase().trim();
      console.warn('[EventOS] Trying fallback authentication for:', normEmail, err.message);

      // 1. Built-in Demo Accounts
      if (normEmail === 'alex@eventos.io' || (normEmail.includes('alex') && !password)) {
        return {
          user: { id: 'user-visitor-alex', name: 'Alex Morgan', email: 'alex@eventos.io', role: 'visitor' },
          events: [
            { id: 'aarpo-26', title: 'AARPO World Summit 2026', category: 'Architecture', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' },
            { id: 'lisbon-ux', title: 'Lisbon UX & Design Expo', category: 'Design', location: 'FIL Pavilion 2', date_label: 'SEP 18-19, 2026' }
          ],
          active_event: { id: 'aarpo-26', title: 'AARPO World Summit 2026', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' }
        };
      }

      if (normEmail === 'admin@eventos.io' || (normEmail.includes('admin') && !password)) {
        return {
          user: { id: 'user-organizer-admin', name: 'Admin Organizer', email: 'admin@eventos.io', role: 'organizer' },
          events: [
            { id: 'aarpo-26', title: 'AARPO World Summit 2026', category: 'Architecture', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' },
            { id: 'lisbon-ux', title: 'Lisbon UX & Design Expo', category: 'Design', location: 'FIL Pavilion 2', date_label: 'SEP 18-19, 2026' }
          ],
          active_event: { id: 'aarpo-26', title: 'AARPO World Summit 2026', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' }
        };
      }

      // 2. Local Registered Accounts
      const users = this._getLocalUsers();
      const match = users.find(u => u.email === normEmail);
      if (match) {
        if (password && match.password && match.password !== password) {
          throw new Error('Incorrect password. Please try again.');
        }
        const userEvent = {
          id: match.event_id || 'aarpo-26',
          title: match.event_name || 'AARPO World Summit 2026',
          location: match.address || 'Lisbon Congress Center',
          date_label: 'SEP 14-16, 2026'
        };
        return {
          user: {
            id: match.id,
            name: match.name,
            email: match.email,
            role: match.role || role || 'visitor'
          },
          events: [userEvent],
          active_event: userEvent
        };
      }

      // If no local account matched and backend threw an error, rethrow
      throw err;
    }
  },

  async getUserEvents(userId, role) {
    try {
      const q = role ? ('?role=' + encodeURIComponent(role)) : '';
      return await this._fetch('/users/' + encodeURIComponent(userId) + '/events' + q);
    } catch (e) {
      return [
        { id: 'aarpo-26', title: 'AARPO World Summit 2026', category: 'Architecture', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' },
        { id: 'lisbon-ux', title: 'Lisbon UX & Design Expo', category: 'Design', location: 'FIL Pavilion 2', date_label: 'SEP 18-19, 2026' }
      ];
    }
  },

  async addUserEvent(userId, payload) {
    return this._fetch('/users/' + encodeURIComponent(userId) + '/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async loginUser(name, email, role) {
    return this._fetch('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role })
    });
  },

  // -- Events --------------------------------------------------
  async getEvents(category) {
    try {
      const q = (category && category !== 'All') ? ('?category=' + encodeURIComponent(category)) : '';
      return await this._fetch('/events' + q);
    } catch (e) {
      const all = [
        { id: 'aarpo-26', title: 'AARPO World Summit 2026', subtitle: 'Architecture & Design Assembly', category: 'Architecture', date_label: 'SEP 14-16, 2026', location: 'Lisbon Congress Center', price_cents: 18500, currency: 'INR', status: 'available', description: 'The global gathering of architectural strategists, urbanists, and digital spatial designers.' },
        { id: 'lisbon-ux', title: 'Lisbon UX & Design Expo', subtitle: 'Digital Products & Modern Interfaces', category: 'Design', date_label: 'SEP 18-19, 2026', location: 'FIL Pavilion 2', price_cents: 12000, currency: 'INR', status: 'selling_fast', description: 'Exploring human-centered design, digital interfaces, and modern user experiences.' },
        { id: 'ai-city', title: 'Smart Cities & Future Tech Forum', subtitle: 'Urban Innovation & Smart Mobility', category: 'Tech', date_label: 'OCT 02, 2026', location: 'Altice Arena', price_cents: 9500, currency: 'INR', status: 'early_bird', description: 'Discover real-time smart city technology and automated event infrastructure.' }
      ];
      if (!category || category === 'All') return all;
      return all.filter(ev => ev.category === category);
    }
  },

  getEvent(id) {
    return this._fetch('/events/' + encodeURIComponent(id));
  },

  getZones(eventId) {
    return this._fetch('/events/' + encodeURIComponent(eventId) + '/zones');
  },

  async saveZones(eventId, zones) {
    return this._fetch('/events/' + encodeURIComponent(eventId) + '/zones', {
      method: 'POST',
      body: JSON.stringify({ zones })
    });
  },

  getEventLiveState(eventId) {
    return this._fetch('/events/' + encodeURIComponent(eventId) + '/live-state');
  },

  // -- Live polling helpers ------------------------------------
  startLiveStatePolling(eventId, intervalMs, callback) {
    this.stopPolling('live_state_' + eventId);
    const tick = async () => {
      try {
        const data = await this.getEventLiveState(eventId);
        callback(data);
      } catch (e) {}
    };
    tick();
    this._pollingTimers['live_state_' + eventId] = setInterval(tick, intervalMs);
  },

  startZonePolling(eventId, intervalMs, callback) {
    this.stopPolling('zones_' + eventId);
    const tick = async () => {
      try {
        const zones = await this.getZones(eventId);
        callback(zones);
      } catch (e) {}
    };
    tick();
    this._pollingTimers['zones_' + eventId] = setInterval(tick, intervalMs);
  },

  stopPolling(key) {
    if (this._pollingTimers[key]) {
      clearInterval(this._pollingTimers[key]);
      delete this._pollingTimers[key];
    }
  },

  stopAllPolling() {
    Object.keys(this._pollingTimers).forEach(k => this.stopPolling(k));
  },

  // -- Users ---------------------------------------------------
  getUser(userId) {
    return this._fetch('/users/' + encodeURIComponent(userId));
  },

  upsertUser(name, email, role) {
    return this._fetch('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role })
    });
  },

  // -- Passes --------------------------------------------------
  issuePass(userId, eventId, passType) {
    return this._fetch('/passes', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, event_id: eventId, pass_type: passType })
    });
  },

  getPass(passId) {
    return this._fetch('/passes/' + encodeURIComponent(passId));
  },

  // -- Itinerary -----------------------------------------------
  getItinerary(userId) {
    return this._fetch('/itinerary/' + encodeURIComponent(userId));
  },

  addToItinerary(userId, sessionId) {
    return this._fetch('/itinerary/' + encodeURIComponent(userId) + '/' + encodeURIComponent(sessionId), {
      method: 'POST'
    });
  },

  removeFromItinerary(userId, sessionId) {
    return this._fetch('/itinerary/' + encodeURIComponent(userId) + '/' + encodeURIComponent(sessionId), {
      method: 'DELETE'
    });
  },

  // -- Journey Planner -----------------------------------------
  planJourney(userId, eventId, destinationSession, startZone) {
    return this._fetch('/journey/plan', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        event_id: eventId,
        destination_session: destinationSession,
        start_zone: startZone || 'zone-south-gate'
      })
    });
  },

  getUserJourneys(userId, eventId) {
    return this._fetch('/journey/' + encodeURIComponent(userId) + '/' + encodeURIComponent(eventId));
  },

  // -- Organizer Hub --------------------------------------------
  getDashboard(eventId) {
    return this._fetch('/organizer/dashboard/' + encodeURIComponent(eventId));
  },

  sendAlert(eventId, organizerId, message, zoneId) {
    return this._fetch('/organizer/alerts', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, organizer_id: organizerId, message, zone_id: zoneId })
    });
  },

  getAlerts(eventId) {
    return this._fetch('/organizer/alerts/' + encodeURIComponent(eventId));
  },

  dispatchStaff(eventId, zoneId, organizerId, note) {
    return this._fetch('/organizer/dispatch', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, zone_id: zoneId, organizer_id: organizerId, note })
    });
  },

  runSimulation(arrivalRate, gateSpeed, stageCap) {
    return this._fetch('/organizer/simulate', {
      method: 'POST',
      body: JSON.stringify({ arrival_rate: arrivalRate, gate_speed: gateSpeed, stage_cap: stageCap })
    });
  },

  // -- Flow Balancer -------------------------------------------
  getFlowBalancer(eventId) {
    return this._fetch('/organizer/flow-balancer/' + encodeURIComponent(eventId));
  },

  applyFlowRecommendation(eventId) {
    return this._fetch('/organizer/flow-balancer/apply', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId })
    });
  },

  resetFlowRecommendation(eventId) {
    return this._fetch('/organizer/flow-balancer/reset', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId })
    });
  }
};

