/* js/visitor.js — EVENTOS Visitor Module connected to Supabase */
window.VisitorModule = class VisitorModule {
  constructor(app) {
    this.app = app;
    this.userId = this.app.getState('userId') || 'user-visitor-alex';
    this.allSessions = [];
    this.userItinerary = this.app.getState('itinerary') || [];
    this.userPasses = this.app.getState('userPasses') || [];
    this.activeJourney = null;
  }

  get eventId() {
    return (this.app && typeof this.app.getActiveEventId === 'function' ? this.app.getActiveEventId() : 'aarpo-26') || 'aarpo-26';
  }

  _statusPill(status) {
    const map = { available:'🟢 Tickets Available', selling_fast:'🟢 Selling Fast', sold_out:'🔴 Sold Out', early_bird:'🟢 Early Bird Open' };
    return map[status] || '🟢 Available';
  }

  _formatPrice(cents, currency) {
    const sym = { EUR:'₹', USD:'₹', GBP:'₹', INR:'₹' };
    const amount = cents ? (cents / 100).toFixed(0) : '150';
    return `${sym[currency] || '₹'}${amount}`;
  }

  /* 1. EXPLORE EVENTS VIEW */
  async renderFindEvents(container) {
    const activeCategory = this.app.getState('activeCategory') || 'All';

    container.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div class="bg-gradient-to-r from-[#FFFBF5] to-white p-8 rounded-2xl border border-[#EADFD0] mb-8 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span class="px-3 py-1 rounded-full bg-[#9F3E41] text-white text-xs font-label uppercase font-bold tracking-wider inline-block mb-3">VISITOR PORTAL</span>
              <h1 class="font-headline text-3xl sm:text-4xl font-medium text-[#450D0D] mb-2">Discover Great Events</h1>
              <p class="font-body text-sm text-[#615E57] max-w-xl">Browse upcoming events, plan intelligent indoor journeys, and get instant digital passes.</p>
            </div>
            <button onclick="window.app.navigate('visitor-plan-journey')" class="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-[#9F3E41] text-[#9F3E41] hover:bg-[#9F3E41] hover:text-white font-label font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5">
              <span class="material-symbols-outlined text-base">route</span>
              <span>Plan Journey</span>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          ${['All','Architecture','Design','Tech','General'].map(cat => `
            <button onclick="window.app.visitor.setCategory('${cat}')" class="px-5 py-2 rounded-full text-xs font-label font-bold uppercase transition-all ${cat === activeCategory ? 'bg-[#450D0D] text-white shadow-sm' : 'bg-white border border-[#EADFD0] text-[#615E57] hover:border-[#9F3E41]'}">${cat}</button>
          `).join('')}
        </div>
        <div id="events-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${[1,2,3].map(() => `
            <div class="paper-card rounded-xl p-6 border border-[#EADFD0] bg-white animate-pulse">
              <div class="h-3 bg-[#EADFD0] rounded mb-4 w-2/3"></div>
              <div class="h-5 bg-[#EADFD0] rounded mb-2"></div>
              <div class="h-3 bg-[#EADFD0] rounded mb-6 w-1/2"></div>
              <div class="h-10 bg-[#EADFD0] rounded"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    let events = [];
    try {
      events = await window.EventosAPI.getEvents(activeCategory);
    } catch (e) {
      console.warn('Could not fetch events from API:', e);
    }

    const grid = document.getElementById('events-grid');
    if (!grid) return;

    if (!events || !events.length) {
      grid.innerHTML = `<div class="col-span-3 text-center py-12 text-[#827473] font-body text-sm">No events found in this category.</div>`;
      return;
    }

    grid.innerHTML = events.map(ev => `
      <div class="paper-card rounded-xl p-6 flex flex-col justify-between hover:shadow-lg transition-all border border-[#EADFD0] bg-white">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-label font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">${this._statusPill(ev.status)}</span>
            <span class="text-xs font-label text-[#827473] font-bold">${ev.date_label}</span>
          </div>
          <h3 class="font-headline text-xl font-medium text-[#450D0D] mb-1">${ev.title}</h3>
          <p class="font-body text-xs text-[#827473] mb-3">${ev.location}</p>
          <p class="font-body text-xs text-[#615E57] mb-6 leading-relaxed">${ev.description || 'Intelligent event experience.'}</p>
        </div>
        <div class="pt-4 border-t border-[#EADFD0] flex items-center justify-between gap-2">
          <span class="font-headline text-lg font-bold text-[#450D0D]">${this._formatPrice(ev.price_cents, ev.currency)}</span>
          <div class="flex items-center gap-2">
            <button onclick="window.app.visitor.openEventDetails('${ev.id}')" class="px-3 py-2 rounded-lg border border-[#EADFD0] hover:border-[#9F3E41] text-[#450D0D] text-xs font-label font-bold uppercase tracking-wider transition-colors">
              Details
            </button>
            <button onclick="window.app.visitor.openTicketModal('${ev.id}','${(ev.title || '').replace(/'/g,"\\'")}')" class="px-3.5 py-2 rounded-lg bg-[#9F3E41] hover:bg-[#450D0D] text-white text-xs font-label font-bold uppercase tracking-wider transition-colors">
              Get Pass
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  setCategory(cat) {
    this.app.setState('activeCategory', cat);
    this.renderFindEvents(document.getElementById('view-container'));
  }

  /* 2. EVENT DETAILS MODAL */
  async openEventDetails(eventId) {
    try {
      const event = await window.EventosAPI.getEvent(eventId);
      const sessions = (event.sessions && event.sessions.length) ? event.sessions : [
        { title: `${event.title} General Session`, time_label: event.start_time || '09:30 AM', stage: 'Main Stage', speaker: 'Keynote Speaker' }
      ];

      const html = `
        <div class="p-6 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#EADFD0]">
            <div>
              <span class="text-xs font-label font-bold uppercase text-[#9F3E41]">${event.category || 'General'} Event</span>
              <h3 class="font-headline text-2xl font-medium text-[#450D0D]">${event.title}</h3>
            </div>
            <button onclick="window.app.closeModal()" class="text-[#827473] hover:text-[#450D0D]">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="space-y-4 mb-6 font-body text-xs text-[#615E57]">
            <p class="leading-relaxed">${event.description || 'Full event access with real-time crowd telemetry.'}</p>
            <div class="grid grid-cols-2 gap-3 p-3 bg-[#FFFBF5] rounded-xl border border-[#EADFD0]">
              <div><span class="font-label font-bold uppercase text-[#827473]">Location</span><p class="font-bold text-[#450D0D]">${event.location}</p></div>
              <div><span class="font-label font-bold uppercase text-[#827473]">Dates</span><p class="font-bold text-[#450D0D]">${event.date_label}</p></div>
              <div><span class="font-label font-bold uppercase text-[#827473]">Price</span><p class="font-bold text-[#450D0D]">${this._formatPrice(event.price_cents, event.currency)}</p></div>
              <div><span class="font-label font-bold uppercase text-[#827473]">Capacity</span><p class="font-bold text-[#450D0D]">${(event.max_capacity || 10000).toLocaleString()} visitors</p></div>
            </div>
            <div>
              <h4 class="font-headline text-sm font-bold text-[#450D0D] mb-2">Event Schedule & Sessions</h4>
              <div class="space-y-2">
                ${sessions.map(s => `
                  <div class="p-2.5 rounded-lg border border-[#EADFD0] bg-white flex justify-between items-center">
                    <div>
                      <p class="font-bold text-[#450D0D]">${s.title}</p>
                      <p class="text-[11px] text-[#827473]">${s.time_label} · ${s.stage} · Speaker: ${s.speaker}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="flex gap-2 pt-2 border-t border-[#EADFD0]">
            <button onclick="window.app.closeModal(); window.app.switchEvent('${event.id}'); window.app.navigate('visitor-plan-journey')" class="flex-1 py-3 rounded-lg border border-[#9F3E41] text-[#9F3E41] hover:bg-[#FFFBF5] font-label font-bold text-xs uppercase tracking-wider transition-colors">
              Plan My Journey
            </button>
            <button onclick="window.app.closeModal(); window.app.visitor.openTicketModal('${event.id}','${(event.title || '').replace(/'/g,"\\'")}')" class="flex-1 py-3 rounded-lg bg-[#9F3E41] hover:bg-[#450D0D] text-white font-label font-bold text-xs uppercase tracking-wider transition-colors">
              Get Pass
            </button>
            <button onclick="window.app.closeModal(); window.app.deleteEventById('${event.id}');" title="Remove / Delete this event" class="px-3 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      `;
      this.app.openModal(html);
    } catch (e) {
      this.openTicketModal(eventId, 'Event');
    }
  }

  /* 3. JOURNEY PLANNER VIEW */
  async renderPlanJourney(container) {
    const activeEv = this.app.getActiveEvent() || {};
    const eventId = activeEv.id || this.eventId || 'aarpo-26';
    const eventTitle = activeEv.title || 'Current Event';
    let sessions = activeEv.sessions || [];
    let zones = [];

    try {
      zones = await window.EventosAPI.getZones(eventId);
    } catch (e) {}

    if (!zones || !zones.length) {
      zones = [
        { id: `${eventId}-z6`, name: 'Gate 01 Main Entry (Check-in)' },
        { id: `${eventId}-z1`, name: 'Quad Area (Main Stage & Lawn)' },
        { id: `${eventId}-z2`, name: 'Canteen & Food Court (Gate 03)' },
        { id: `${eventId}-z3`, name: 'Multipurpose Sports Complex' },
        { id: `${eventId}-z4`, name: 'Gymkhana & Sports Area' },
        { id: `${eventId}-z5`, name: 'Engineering Wing Labs' }
      ];
    }

    // Sort gates first for convenient starting location selection
    zones.sort((a, b) => {
      const aIsGate = a.name.toLowerCase().includes('gate') || a.name.toLowerCase().includes('entry');
      const bIsGate = b.name.toLowerCase().includes('gate') || b.name.toLowerCase().includes('entry');
      if (aIsGate && !bIsGate) return -1;
      if (!aIsGate && bIsGate) return 1;
      return 0;
    });

    if (!sessions || !sessions.length) {
      const roomNames = zones.map(z => z.name.split('(')[0].trim());
      const startTime = activeEv.start_time || '09:30 AM';
      const endTime   = activeEv.end_time || '05:30 PM';
      sessions = [
        { id: `s-${eventId}-1`, time_label: startTime, title: `${eventTitle} - Opening Ceremony & Keynote`, stage: roomNames[1] || roomNames[0] || 'Quad Area Main Stage', speaker: 'Keynote Speaker' },
        { id: `s-${eventId}-2`, time_label: '11:30 AM', title: `Technical Presentations & Exhibits`, stage: roomNames[3] || roomNames[2] || 'Sports Complex Arena', speaker: 'Department Specialist' },
        { id: `s-${eventId}-3`, time_label: '01:00 PM', title: `Networking Break & Refreshments`, stage: roomNames[2] || roomNames[1] || 'Canteen Food Court', speaker: 'All Attendees' },
        { id: `s-${eventId}-4`, time_label: endTime, title: `Valedictory Session & Awards`, stage: roomNames[1] || roomNames[0] || 'Quad Area Main Stage', speaker: 'Organizing Committee' }
      ];
    }

    this._currentZones = zones;
    this.allSessions = sessions;

    // Separate gates and destinations for intuitive selection
    const startOptions = [...zones];
    const destOptions = [...zones].sort((a, b) => {
      const aIsGate = a.name.toLowerCase().includes('gate') || a.name.toLowerCase().includes('entry');
      const bIsGate = b.name.toLowerCase().includes('gate') || b.name.toLowerCase().includes('entry');
      if (!aIsGate && bIsGate) return -1;
      if (aIsGate && !bIsGate) return 1;
      return 0;
    });

    container.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div class="bg-gradient-to-r from-[#FFFBF5] to-white p-8 rounded-2xl border border-[#EADFD0] mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="px-3 py-1 rounded-full bg-[#9F3E41] text-white text-xs font-label uppercase font-bold tracking-wider inline-block mb-3">INTELLIGENT WAYFINDING</span>
            <h1 class="font-headline text-3xl font-medium text-[#450D0D] mb-1">Plan Your Event Journey</h1>
            <p class="font-body text-xs text-[#615E57]">Select any starting point and destination room in <strong class="text-[#450D0D]">${eventTitle}</strong> for indoor crowd-balanced directions.</p>
          </div>
          <button onclick="window.app.navigate('visitor-find')" class="hidden sm:inline-flex items-center gap-1 text-xs font-label uppercase font-bold text-[#827473] hover:text-[#450D0D]">
            <span class="material-symbols-outlined text-base">arrow_back</span> Back
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <!-- Journey Config Form -->
          <div class="paper-card rounded-2xl p-6 bg-white border border-[#EADFD0] shadow-sm">
            <h3 class="font-headline text-lg font-medium text-[#450D0D] mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-xl">tune</span>
              <span>Journey Preferences</span>
            </h3>
            <div class="space-y-4 font-body text-xs">
              <div>
                <label class="block font-label font-bold uppercase text-[#827473] mb-1">Starting Location / Gate</label>
                <select id="journey-start" class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] p-2.5 text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]">
                  ${startOptions.map(z => `
                    <option value="${z.id}">${z.name}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block font-label font-bold uppercase text-[#827473] mb-1">Destination Room / Area on Map</label>
                <select id="journey-session" class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] p-2.5 text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]">
                  ${destOptions.map(z => `
                    <option value="${z.id}">${z.name}</option>
                  `).join('')}
                </select>
              </div>
              <div class="pt-2">
                <button onclick="window.app.visitor.submitJourneyPlan()" class="w-full py-3 rounded-xl bg-[#9F3E41] hover:bg-[#450D0D] text-white font-label font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-base">near_me</span>
                  <span>Calculate Optimal Route</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Dynamic Route Recommendations Output -->
          <div id="journey-results-box" class="paper-card rounded-2xl p-6 bg-[#FFFBF5] border border-[#EADFD0]">
            <h3 class="font-headline text-lg font-medium text-[#450D0D] mb-2">Route Recommendations</h3>
            <p class="font-body text-xs text-[#827473] mb-4">Click 'Calculate Optimal Route' to generate live path suggestions.</p>
            <div class="p-6 text-center text-[#827473] font-body text-xs border border-dashed border-[#EADFD0] rounded-xl bg-white">
              <span class="material-symbols-outlined text-3xl text-[#9F3E41] mb-2">alt_route</span>
              <p>Ready to calculate fastest crowd-aware walking route.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async submitJourneyPlan() {
    const sessionSelect = document.getElementById('journey-session');
    const startSelect   = document.getElementById('journey-start');
    const resultsBox    = document.getElementById('journey-results-box');
    if (!resultsBox) return;

    const destId    = sessionSelect ? sessionSelect.value : '';
    const startZone = startSelect ? startSelect.value : '';

    const destZoneObj  = (this._currentZones || []).find(z => z.id === destId) || (this.allSessions || []).find(s => s.id === destId);
    const startZoneObj = (this._currentZones || []).find(z => z.id === startZone);

    resultsBox.innerHTML = `
      <div class="p-8 text-center text-[#827473] animate-pulse font-body text-xs">
        <span class="material-symbols-outlined text-3xl text-[#9F3E41] mb-2 animate-spin">progress_activity</span>
        <p>Analyzing live crowd density and gate throughput…</p>
      </div>
    `;

    try {
      const data = await window.EventosAPI.planJourney(this.userId, this.eventId, destId, startZone, destZoneObj, startZoneObj);
      this.activeJourney = data;

      resultsBox.innerHTML = `
        <div>
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#EADFD0]">
            <div>
              <span class="text-[10px] font-label font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">OPTIMAL PATH FOUND</span>
              <h4 class="font-headline text-base font-bold text-[#450D0D] mt-1">${data.route_title}</h4>
            </div>
            <div class="text-right">
              <span class="font-headline text-xl font-bold text-[#450D0D]">${data.eta_minutes} min</span>
              <span class="text-[11px] font-label text-[#827473] block uppercase font-bold">EST. WALKING TIME</span>
            </div>
          </div>

          ${data.crowd_warning ? `
            <div class="p-3 rounded-xl ${data.alternate_suggested ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-amber-50 border border-amber-200 text-amber-900'} text-xs font-body mb-4 flex items-start gap-2">
              <span class="material-symbols-outlined text-base mt-0.5">${data.alternate_suggested ? 'verified' : 'warning'}</span>
              <span>${data.crowd_warning}</span>
            </div>
          ` : ''}

          <div class="space-y-2 mb-4 font-body text-xs">
            ${(data.steps || []).map((s, idx) => {
              const stepNum = typeof s === 'object' ? (s.step || idx + 1) : (idx + 1);
              const title   = typeof s === 'object' ? (s.title || 'Navigation Waypoint') : s;
              const detail  = typeof s === 'object' ? (s.detail || 'Follow digital signage and floor markers') : 'Proceed along indoor corridor';
              const icon    = typeof s === 'object' ? (s.icon || 'directions_walk') : 'directions_walk';
              const isRec   = typeof s === 'object' && s.status === 'recommended';
              return `
                <div class="p-3 rounded-xl border bg-white flex items-center justify-between ${isRec ? 'border-emerald-300 bg-emerald-50/40' : 'border-[#EADFD0]'}">
                  <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-[#450D0D] text-white flex items-center justify-center font-bold text-xs">${stepNum}</span>
                    <div>
                      <p class="font-bold text-[#450D0D]">${title}</p>
                      <p class="text-[11px] text-[#827473]">${detail}</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-base text-[#827473]">${icon}</span>
                </div>
              `;
            }).join('')}
          </div>

          <button onclick="window.app.navigate('visitor-live')" class="w-full py-2.5 rounded-xl bg-[#9F3E41] hover:bg-[#450D0D] text-white font-label font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-base">navigation</span>
            <span>Start Live Navigation</span>
          </button>
        </div>
      `;
    } catch (err) {
      this.app.toast('Could not calculate route. Using default directions.');
      this.app.navigate('visitor-live');
    }
  }

  /* 4. MY TICKET & SCHEDULE VIEW */
  async renderMyJourney(container) {
    const eventId = this.eventId;
    let eventTitle = 'My Event Pass';
    let eventSessions = [];

    // Load active event details & sessions
    try {
      const ev = await window.EventosAPI.getEvent(eventId);
      if (ev) {
        eventTitle = ev.title;
        eventSessions = ev.sessions || [];
      }
    } catch (e) {}

    // Load user itinerary bookmarks
    try {
      const savedItems = await window.EventosAPI.getItinerary(this.userId);
      this.userItinerary = (savedItems || []).map(s => s.id);
      this.app.setState('itinerary', this.userItinerary);
    } catch (e) {}

    // Load user passes
    try {
      const user = await window.EventosAPI.getUser(this.userId);
      if (user && user.passes && user.passes.length) {
        this.userPasses = user.passes.map(p => ({
          id: p.id,
          eventId: p.event_id,
          eventName: p.event_title || eventTitle,
          passType:  p.pass_type || 'Standard Summit Access',
          holder:    user.name || this.app.getState('userName') || 'Visitor',
          validDates:p.valid_dates || 'Active'
        }));
        this.app.setState('userPasses', this.userPasses);
      }
    } catch (e) {}

    // Find pass matching active event, or use the latest pass
    const currentPass = this.userPasses.find(p => p.eventId === eventId) || this.userPasses[this.userPasses.length - 1];

    if (!eventSessions.length) {
      let zones = [];
      try {
        zones = await window.EventosAPI.getZones(eventId);
      } catch (e) {}
      const zNames = (zones && zones.length) ? zones.map(z => z.name) : ['Quad Area (Main Stage & Lawn)', 'Canteen & Food Court (Gate 03)', 'Multipurpose Sports Complex'];
      this.allSessions = [
        { id: `s-${eventId}-1`, time_label: '09:30 AM', title: `${eventTitle} - Opening Ceremony`, stage: zNames[0] || 'Main Stage', speaker: 'Keynote Presenter' },
        { id: `s-${eventId}-2`, time_label: '11:30 AM', title: `Technical Exhibition & Demonstrations`, stage: zNames[2] || zNames[1] || 'Sports Complex', speaker: 'Department Leads' },
        { id: `s-${eventId}-3`, time_label: '01:00 PM', title: `Networking & Refreshment Session`, stage: zNames[1] || 'Canteen Area', speaker: 'All Attendees' },
        { id: `s-${eventId}-4`, time_label: '03:00 PM', title: `Interactive Workshop & Innovation Showcase`, stage: zNames[6] || zNames[3] || 'Innovation Centre', speaker: 'Research Mentors' },
        { id: `s-${eventId}-5`, time_label: '05:00 PM', title: `Valedictory & Awards Ceremony`, stage: zNames[0] || 'Main Stage', speaker: 'Organizing Committee' }
      ];
    } else {
      this.allSessions = eventSessions;
    }

    container.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-body mb-8 flex items-center gap-3">
          <span class="material-symbols-outlined text-amber-700">info</span>
          <span><strong>Digital QR Badge:</strong> Show this QR code at the venue gate for instant check-in. Tap any session below to bookmark it to your live schedule.</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <!-- Digital Ticket Card -->
          <div class="paper-card rounded-2xl p-6 bg-gradient-to-b from-white to-[#FFFBF5] border-2 border-[#450D0D] text-center shadow-md">
            <div class="w-10 h-10 rounded-full bg-[#450D0D] text-white flex items-center justify-center font-headline font-bold text-lg mx-auto mb-3">E</div>
            <h3 class="font-headline text-xl font-medium text-[#450D0D] mb-1">${currentPass ? currentPass.eventName : eventTitle}</h3>
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-label font-bold uppercase tracking-wider inline-block mb-4">CONFIRMED PASS</span>
            <!-- QR Code -->
            <div class="w-40 h-40 mx-auto bg-white p-3 border border-[#EADFD0] rounded-xl shadow-inner flex items-center justify-center mb-4">
              <div class="grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-[#FCF6EC]">
                ${Array.from({ length: 25 }).map(() => `
                  <div class="${Math.random() > 0.35 ? 'bg-[#450D0D]' : 'bg-transparent'} rounded-xs"></div>
                `).join('')}
              </div>
            </div>
            <span class="font-label text-xs font-bold text-[#827473] block uppercase">${currentPass ? currentPass.id : 'PASS-DIGITAL'} · ${currentPass ? currentPass.holder : (this.app.getState('userName') || 'Visitor')}</span>
            <div class="mt-4 pt-3 border-t border-[#EADFD0] space-y-2">
              <button onclick="window.app.navigate('visitor-live')" class="w-full py-2.5 rounded-lg bg-[#9F3E41] text-white text-xs font-label font-bold uppercase tracking-wider hover:bg-[#450D0D] transition-colors">
                Open Venue Map & Directions
              </button>
              <button onclick="window.app.navigate('visitor-plan-journey')" class="w-full py-2 rounded-lg border border-[#EADFD0] text-[#450D0D] text-xs font-label font-bold uppercase tracking-wider hover:border-[#9F3E41] transition-colors">
                Plan Session Journey
              </button>
            </div>
          </div>

          <!-- My Schedule -->
          <div class="paper-card rounded-2xl p-6 bg-white border border-[#EADFD0]">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-headline text-lg font-medium text-[#450D0D]">Event Schedule</h3>
              <span class="text-xs font-label font-bold text-[#9F3E41]">${this.userItinerary.length} Bookmarked</span>
            </div>
            <p class="font-body text-xs text-[#827473] mb-4">Tap sessions to customize your personal schedule.</p>
            <div class="space-y-3">
              ${this.allSessions.map(s => {
                const isSelected = this.userItinerary.includes(s.id);
                return `
                  <div onclick="window.app.visitor.toggleSession('${s.id}')" class="p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-[#9F3E41] bg-[#FFFBF5]' : 'border-[#EADFD0] bg-white hover:border-[#9F3E41]'}">
                    <div>
                      <span class="text-[11px] font-label font-bold text-[#9F3E41]">${s.time_label} · ${s.stage}</span>
                      <h4 class="font-headline text-sm font-medium text-[#450D0D]">${s.title}</h4>
                      <p class="text-[11px] text-[#827473]">Speaker: ${s.speaker || 'Presenter'}</p>
                    </div>
                    <span class="material-symbols-outlined text-lg ${isSelected ? 'text-[#9F3E41]' : 'text-[#827473]'}">
                      ${isSelected ? 'check_circle' : 'add_circle_outline'}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async toggleSession(sessionId) {
    const idx = this.userItinerary.indexOf(sessionId);
    const adding = idx < 0;

    try {
      if (adding) {
        await window.EventosAPI.addToItinerary(this.userId, sessionId);
        this.userItinerary.push(sessionId);
        this.app.toast('Added to schedule!');
      } else {
        await window.EventosAPI.removeFromItinerary(this.userId, sessionId);
        this.userItinerary.splice(idx, 1);
        this.app.toast('Removed from schedule');
      }
    } catch {
      if (adding) { this.userItinerary.push(sessionId); this.app.toast('Added to schedule!'); }
      else         { this.userItinerary.splice(idx, 1); this.app.toast('Removed from schedule'); }
    }

    this.app.setState('itinerary', this.userItinerary);
    this.renderMyJourney(document.getElementById('view-container'));
  }

  /* 5. VENUE MAP & DIRECTIONS VIEW */
  renderLiveJourney(container) {
    const eventId = this.eventId;

    container.innerHTML = `
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-[#EADFD0]">
          <div>
            <h1 class="font-headline text-2xl font-medium text-[#450D0D]">Live Venue Directions</h1>
            <p class="font-body text-xs text-[#827473]">Step-by-step indoor wayfinding with real-time crowd alerts.</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="visitor-live-status-pill" class="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-label font-bold uppercase">
              🟢 Flow Optimal
            </span>
          </div>
        </div>

        <!-- Real-Time Rebalance Banner -->
        <div id="visitor-rebalance-banner" class="hidden mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 flex items-start gap-3 shadow-sm transition-all">
          <span class="material-symbols-outlined text-amber-700 text-2xl">alt_route</span>
          <div class="flex-1">
            <span class="font-label font-bold uppercase text-xs text-amber-800 block mb-0.5">⚠️ LIVE TRAFFIC RECOMMENDATION</span>
            <p id="visitor-rebalance-text" class="font-body text-xs font-bold leading-relaxed">
              Main stage is busy. We recommend visiting other pavilions to avoid queue delays.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 paper-card rounded-2xl p-4 bg-white border border-[#EADFD0]">
            <div class="relative w-full h-[380px] rounded-xl overflow-hidden border border-[#EADFD0]">
              <canvas id="visitor-map-canvas" width="600" height="480" class="w-full h-full object-cover"></canvas>
            </div>
          </div>
          <div class="space-y-4">
            <div class="paper-card rounded-2xl p-5 bg-[#FFFBF5] border border-[#EADFD0]">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-headline text-base font-medium text-[#450D0D]">Active Navigation Steps</h3>
                <button onclick="window.app.navigate('visitor-plan-journey')" class="text-[11px] font-label font-bold uppercase text-[#9F3E41] hover:underline">Change Route</button>
              </div>
              <div id="visitor-live-steps" class="space-y-3 font-body text-xs">
                ${(this.activeJourney && this.activeJourney.steps && this.activeJourney.steps.length) ? this.activeJourney.steps.map((s, idx) => {
                  const stepNum = typeof s === 'object' ? (s.step || idx + 1) : (idx + 1);
                  const title   = typeof s === 'object' ? (s.title || `Step ${stepNum}`) : s;
                  const detail  = typeof s === 'object' ? (s.detail || '') : '';
                  const isDest  = typeof s === 'object' ? (s.status === 'destination' || idx === this.activeJourney.steps.length - 1) : false;
                  return `
                    <div class="p-3 rounded-lg ${isDest ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold' : 'bg-white border border-[#EADFD0]'} flex items-start gap-3">
                      <span class="w-6 h-6 rounded-full ${isDest ? 'bg-emerald-700' : 'bg-[#450D0D]'} text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">${stepNum}</span>
                      <div>
                        <p class="font-bold text-[#450D0D]">${title}</p>
                        ${detail ? `<p class="text-[11px] text-[#827473] font-normal mt-0.5">${detail}</p>` : ''}
                      </div>
                    </div>
                  `;
                }).join('') : `
                  <div class="p-3 rounded-lg bg-white border border-[#EADFD0] flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-[#450D0D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                    <div>
                      <p class="font-bold text-[#450D0D]">Check in at Gate Entry</p>
                      <p class="text-[11px] text-[#827473] mt-0.5">Scan digital QR pass at turnstile display</p>
                    </div>
                  </div>
                  <div class="p-3 rounded-lg bg-white border border-[#EADFD0] flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-[#450D0D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                    <div>
                      <p class="font-bold text-[#450D0D]">Follow Smart Indoor Markers</p>
                      <p class="text-[11px] text-[#827473] mt-0.5">Dynamic crowd-balanced corridor routing</p>
                    </div>
                  </div>
                  <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 font-bold">
                    <span class="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                    <div>
                      <p class="font-bold text-emerald-900">Arrive at Session Room</p>
                      <p class="text-[11px] text-emerald-700 font-normal mt-0.5">Present digital badge for seat access</p>
                    </div>
                  </div>
                `}
              </div>
            </div>
            <div id="zone-crowd-panel" class="paper-card rounded-2xl p-5 bg-white border border-[#EADFD0]">
              <h3 class="font-headline text-sm font-medium text-[#450D0D] mb-3">Room Crowdedness <span class="text-[10px] text-emerald-600 font-label">● LIVE</span></h3>
              <div class="space-y-2 text-xs font-label text-[#827473]">Loading live telemetry…</div>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      new window.SpatialMapEngine('visitor-map-canvas', { mode: 'visitor', eventId });
    }, 100);

    // Initial instant telemetry load
    window.EventosAPI.getEventLiveState(eventId).then(state => {
      this._updateVisitorLiveView(state);
    }).catch(() => {});

    // Start Live Telemetry Polling (every 3s)
    window.EventosAPI.startLiveStatePolling(eventId, 3000, (liveState) => {
      this._updateVisitorLiveView(liveState);
    });
  }

  _updateVisitorLiveView(liveState) {
    if (!liveState) return;

    const banner   = document.getElementById('visitor-rebalance-banner');
    const bText    = document.getElementById('visitor-rebalance-text');
    const pill     = document.getElementById('visitor-live-status-pill');

    const flowRec = liveState.flow_recommendation || liveState.recommendation;
    if (flowRec && flowRec.active) {
      if (banner) banner.classList.remove('hidden');
      if (bText && flowRec.text) bText.innerText = flowRec.text;
      if (pill) {
        pill.innerText = '⚠️ Flow Rerouted';
        pill.className = 'px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-label font-bold uppercase';
      }
    } else {
      if (banner) banner.classList.add('hidden');
      if (pill) {
        pill.innerText = '🟢 Flow Optimal';
        pill.className = 'px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-label font-bold uppercase';
      }
    }

    const panel = document.getElementById('zone-crowd-panel');
    const rawZones = liveState.zones || liveState.stations || [];
    if (panel && rawZones.length) {
      panel.innerHTML = `
        <h3 class="font-headline text-sm font-medium text-[#450D0D] mb-3">Room Crowdedness <span class="text-[10px] text-emerald-600 font-label font-bold">● LIVE</span></h3>
        <div class="space-y-2 text-xs font-label">
          ${rawZones.map(z => {
            const occ = z.current_occ !== undefined ? z.current_occ : (z.occ || 500);
            const cap = z.capacity || z.cap || 1000;
            const p = z.pct !== undefined ? z.pct : Math.round((occ / cap) * 100);
            const color = p >= 88 ? 'text-rose-700' : p >= 70 ? 'text-amber-700' : 'text-emerald-700';
            const dot   = p >= 88 ? '🔴' : p >= 70 ? '🟡' : '🟢';
            const label = p >= 88 ? `Busy (${p}% Full)` : p >= 70 ? `Moderate (${p}%)` : `Space (${p}%)`;
            const name = (z.name || 'Zone').split('(')[0].trim();
            return `<div class="flex justify-between items-center py-0.5 border-b border-[#EADFD0]/40 last:border-0"><span class="text-[#450D0D] font-medium">${name}:</span><span class="${color} font-bold">${dot} ${label}</span></div>`;
          }).join('')}
        </div>
      `;
    }
  }

  openTicketModal(eventId, eventName) {
    const html = `
      <div class="p-6 text-center">
        <h3 class="font-headline text-2xl font-medium text-[#450D0D] mb-2">Get Pass for ${eventName}</h3>
        <p class="font-body text-xs text-[#827473] mb-6">Instantly generates a digital QR entry pass in your app.</p>
        <button onclick="window.app.visitor.confirmPurchase('${eventId}','${(eventName || '').replace(/'/g,"\\'")}')" class="w-full py-3 rounded-lg bg-[#9F3E41] hover:bg-[#450D0D] text-white font-label font-bold text-xs uppercase tracking-wider transition-colors mb-2">
          Confirm & Issue My Pass
        </button>
        <button onclick="window.app.closeModal()" class="text-xs font-label text-[#827473] hover:underline">Cancel</button>
      </div>
    `;
    this.app.openModal(html);
  }

  async confirmPurchase(eventId, eventName) {
    this.app.closeModal();
    try {
      const pass = await window.EventosAPI.issuePass(this.userId, eventId, 'Standard Summit Access');
      this.userPasses.push({
        id:         pass.id,
        eventId:    eventId,
        eventName:  pass.event_title || eventName,
        passType:   pass.pass_type,
        holder:     this.app.getState('userName') || 'Visitor',
        validDates: pass.valid_dates
      });
    } catch (err) {
      if (err.message && err.message.includes('already issued')) {
        this.app.toast('You already have a pass for this event.', 'warning');
        return;
      }
      this.userPasses.push({
        id:         `PASS-${Math.floor(10000 + Math.random() * 90000)}`,
        eventId:    eventId,
        eventName:  eventName || 'Summit Access',
        passType:   'Standard Summit Access',
        holder:     this.app.getState('userName') || 'Visitor',
        validDates: 'Active'
      });
    }
    this.app.setState('userPasses', this.userPasses);
    this.app.toast('Pass Confirmed! Added to My Ticket.');
    this.app.switchEvent(eventId);
    this.app.navigate('visitor-my-journey');
  }
};
