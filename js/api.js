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
      const res = await fetch(healthEndpoint, { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      if (json.status === 'ok') {
        this._notifyLive(true);
        return true;
      }
    } catch (e) { /* offline */ }
    this._notifyLive(false);
    return false;
  },

  // -- Auth / Registration / Login ----------------------------
  async registerUser(payload) {
    return this._fetch('/users/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async loginUserWithPassword(email, password, role) {
    return this._fetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
  },

  async getUserEvents(userId, role) {
    const q = role ? ('?role=' + encodeURIComponent(role)) : '';
    return this._fetch('/users/' + encodeURIComponent(userId) + '/events' + q);
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
  getEvents(category) {
    const q = (category && category !== 'All') ? ('?category=' + encodeURIComponent(category)) : '';
    return this._fetch('/events' + q);
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

