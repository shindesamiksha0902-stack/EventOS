/* js/app.js - EVENTOS Simplified Application Controller */
window.EventosApp = class EventosApp {
  constructor() {
    const saved = JSON.parse(localStorage.getItem('eventos_state')) || {};
    this.state = {
      role: saved.role || 'visitor', // 'visitor' or 'organizer'
      currentRoute: saved.currentRoute || 'auth',
      userId: saved.userId || null,
      userName: saved.userName || 'Alex Morgan',
      userEvents: saved.userEvents || [
        {
          id: 'aarpo-26',
          title: "AARPO World Summit 2026",
          category: 'Architecture',
          date_label: 'SEP 14-16, 2026',
          location: 'Lisbon Congress Center',
          start_time: '09:00 AM',
          end_time: '06:00 PM'
        },
        {
          id: 'lisbon-ux',
          title: "Lisbon UX & Design Expo",
          category: 'Design',
          date_label: 'SEP 18-19, 2026',
          location: 'FIL Pavilion 2',
          start_time: '10:00 AM',
          end_time: '05:30 PM'
        }
      ],
      activeEventId: saved.activeEventId || 'aarpo-26',
      itinerary: saved.itinerary || ['s1', 's3'],
      userPasses: saved.userPasses || [
        {
          id: 'PASS-88219',
          eventName: "AARPO World Summit 2026",
          passType: 'Standard Summit Access',
          holder: saved.userName || 'Alex Morgan',
          validDates: 'SEP 14-16, 2026'
        }
      ]
    };

    this.visitor = new window.VisitorModule(this);
    this.organizer = new window.OrganizerModule(this);

    this.setupEvents();
    this.init();
  }

  getState(key) {
    return this.state[key];
  }

  setState(key, val) {
    this.state[key] = val;
    localStorage.setItem('eventos_state', JSON.stringify(this.state));
  }

  getActiveEventId() {
    if (this.state.activeEventId) return this.state.activeEventId;
    if (this.state.userEvents && this.state.userEvents.length > 0) {
      return this.state.userEvents[0].id;
    }
    return 'aarpo-26';
  }

  getActiveEvent() {
    const id = this.getActiveEventId();
    if (this.state.userEvents && this.state.userEvents.length) {
      const found = this.state.userEvents.find(e => e.id === id);
      if (found) return found;
    }
    return {
      id: 'aarpo-26',
      title: "AARPO World Summit 2026",
      date_label: 'SEP 14-16, 2026',
      location: 'Lisbon Congress Center'
    };
  }

  setupEvents() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    const hash = window.location.hash.replace('#', '') || 'auth';
    this.navigate(hash);
    this.updateHeader();

    // Live API health check - poll every 8s
    window.EventosAPI.onLiveChange(live => this._updateLiveDot(live));
    window.EventosAPI.checkHealth();
    setInterval(() => window.EventosAPI.checkHealth(), 8000);
  }

  _updateLiveDot(live) {
    const dot   = document.getElementById('api-live-dot');
    const label = document.getElementById('api-live-label');
    if (!dot) return;
    dot.title     = live ? 'Backend API connected (Click to configure)' : 'Backend offline (Click to configure API URL)';
    dot.className = `w-2 h-2 rounded-full transition-colors ${live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`;
    if (label) label.innerText = live ? 'Live' : 'Offline';
  }

  openModal(html) {
    const backdrop = document.getElementById('global-modal-backdrop');
    const content = document.getElementById('global-modal-content');
    if (!backdrop || !content) return;
    content.innerHTML = html;
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
  }

  closeModal() {
    const backdrop = document.getElementById('global-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
  }

  showApiSettingsModal() {
    const currentBase = (window.EVENTOS_CONFIG && window.EVENTOS_CONFIG.API_BASE) || 'http://localhost:3001/api';
    const isLive = window.EventosAPI && window.EventosAPI.isLive;

    this.openModal(`
      <div class="p-6">
        <div class="flex items-center justify-between pb-4 border-b border-[#EADFD0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#9F3E41]">cloud_sync</span>
            <h3 class="font-headline font-bold text-lg text-[#450D0D]">API Connection Settings</h3>
          </div>
          <button onclick="window.app.closeModal()" class="text-gray-400 hover:text-gray-600">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="mt-4 space-y-4 font-body text-sm text-[#450D0D]">
          <div>
            <span class="text-xs font-label uppercase font-bold text-[#827473]">Current Status:</span>
            <span class="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              <span class="w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
              ${isLive ? 'Connected & Live' : 'Disconnected / Offline'}
            </span>
          </div>

          <div>
            <label class="block text-xs font-label uppercase font-bold text-[#827473] mb-1">Backend API Base URL</label>
            <input id="api-setting-input" type="url" value="${currentBase}" placeholder="https://your-backend.onrender.com/api" 
                   class="w-full px-3 py-2 border border-[#EADFD0] rounded-lg text-xs font-mono focus:outline-none focus:border-[#9F3E41] bg-[#FFFBF5]" />
            <p class="text-[11px] text-[#827473] mt-1">Example for Render: <code class="bg-[#FCF6EC] px-1 rounded">https://eventos-backend.onrender.com/api</code></p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-[#EADFD0] gap-2">
            <button onclick="window.EVENTOS_CONFIG.resetApiBase(); document.getElementById('api-setting-input').value = window.EVENTOS_CONFIG.API_BASE; window.app.toast('Reset to default localhost API');" 
                    class="text-xs font-label uppercase font-bold text-[#827473] hover:text-[#450D0D]">
              Reset to Localhost
            </button>
            <div class="flex gap-2">
              <button onclick="window.app.closeModal()" class="px-3 py-1.5 rounded-lg border border-[#EADFD0] text-xs font-label uppercase font-bold text-[#450D0D]">Cancel</button>
              <button onclick="const val = document.getElementById('api-setting-input').value; window.EVENTOS_CONFIG.setApiBase(val); window.app.toast('API URL Updated'); window.app.closeModal();" 
                      class="px-4 py-1.5 rounded-lg bg-[#9F3E41] text-white text-xs font-label uppercase font-bold hover:bg-[#450D0D] transition-colors">
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  switchEvent(eventId) {
    if (!eventId) return;
    this.setState('activeEventId', eventId);
    if (this.organizer) this.organizer.eventId = eventId;
    const ev = this.getActiveEvent();
    this.toast(`Active Event: ${ev ? ev.title : eventId}`);
    this.updateHeader();

    // Reload current view
    const current = this.state.currentRoute || 'visitor-find';
    this.navigate(current);
  }

  async deleteCurrentEvent() {
    const activeId = this.getActiveEventId();
    await this.deleteEventById(activeId);
  }

  async deleteEventById(eventId, skipConfirm = false) {
    if (!eventId) return;
    const events = this.state.userEvents || [];
    const target = events.find(e => e.id === eventId) || { id: eventId, title: eventId };
    
    if (!skipConfirm) {
      const ok = confirm(`Are you sure you want to remove and delete the event "${target.title || target.id}"? This will clear its zones, passes, and blueprints.`);
      if (!ok) return;
    }

    try {
      await window.EventosAPI.deleteEvent(eventId);
    } catch (e) {
      console.warn('[EventOS] Delete error:', e);
    }

    // Filter out from local state
    const updatedEvents = events.filter(e => e.id !== eventId);
    this.setState('userEvents', updatedEvents);

    // If active event was the deleted one, switch to next available
    if (this.state.activeEventId === eventId) {
      const nextId = updatedEvents.length > 0 ? updatedEvents[0].id : 'aarpo-26';
      this.setState('activeEventId', nextId);
      if (this.organizer) this.organizer.eventId = nextId;
    }

    this.toast(`Event "${target.title || eventId}" removed.`);
    this.updateHeader();
    const current = this.state.currentRoute || 'visitor-find';
    this.navigate(current);
  }

  setRole(role) {
    this._pendingRole = role;
    this.renderRegister(document.getElementById('view-container'), role);
  }

  showLogin(role) {
    this._pendingRole = role || this.getState('role') || 'visitor';
    this.renderLogin(document.getElementById('view-container'), this._pendingRole);
  }

  showRegister(role) {
    this._pendingRole = role || this.getState('role') || 'visitor';
    this.renderRegister(document.getElementById('view-container'), this._pendingRole);
  }

  /* =========================================================================
     1. REGISTRATION PAGE (Dual Section: Visitor & Organizer)
     Flow: Home → Register → Login → Application
     ========================================================================= */
  renderRegister(container, defaultRole = 'visitor') {
    const role = defaultRole || 'visitor';
    this._pendingRole = role;

    container.innerHTML = `
      <div class="min-h-[85vh] flex items-center justify-center px-4 py-10">
        <div class="w-full max-w-2xl">
          <!-- Back to Home -->
          <div class="flex items-center justify-between mb-4">
            <button onclick="window.app.navigate('auth')" class="flex items-center gap-1 text-xs font-label uppercase font-bold text-[#827473] hover:text-[#450D0D]">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Back to Home
            </button>
            <div class="text-xs font-label text-[#827473]">
              Step 1 of 2: <strong class="text-[#450D0D]">Registration</strong>
            </div>
          </div>

          <!-- Main Card -->
          <div class="paper-card rounded-2xl p-6 sm:p-8 bg-white border border-[#EADFD0] shadow-xl">
            <!-- Header Cluster -->
            <div class="text-center mb-6">
              <span class="px-3 py-1 rounded-full bg-[#FFFBF5] border border-[#EADFD0] text-[10px] font-label uppercase font-bold tracking-widest text-[#9F3E41] mb-2 inline-block">
                CREATE YOUR ACCOUNT
              </span>
              <h2 class="font-headline text-2xl sm:text-3xl font-medium text-[#450D0D]">Register for EVENTOS</h2>
              <p class="font-body text-xs text-[#827473] mt-1">Select your account type below to get started.</p>
            </div>

            <!-- Role Selector Tabs -->
            <div class="grid grid-cols-2 gap-2 p-1.5 bg-[#FFFBF5] border border-[#EADFD0] rounded-xl mb-6 font-label text-xs font-bold uppercase">
              <button type="button" id="tab-visitor" onclick="window.app.toggleRegisterTab('visitor')"
                class="py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${role === 'visitor' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#615E57] hover:text-[#450D0D]'}">
                <span class="material-symbols-outlined text-base">confirmation_number</span>
                <span>Visitor Registration</span>
              </button>
              <button type="button" id="tab-organizer" onclick="window.app.toggleRegisterTab('organizer')"
                class="py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${role === 'organizer' ? 'bg-[#450D0D] text-white shadow-sm' : 'text-[#615E57] hover:text-[#450D0D]'}">
                <span class="material-symbols-outlined text-base">analytics</span>
                <span>Organizer Registration</span>
              </button>
            </div>

            <!-- VISITOR FORM -->
            <form id="form-visitor" onsubmit="window.app.handleRegister(event, 'visitor')" class="space-y-4 ${role === 'visitor' ? '' : 'hidden'}">
              <div class="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-xs font-body text-[#9F3E41] flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-base">info</span>
                <span><strong>Visitor Account:</strong> Manage passes, personalized itineraries &amp; live indoor walking routes.</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Full Name *</label>
                  <input id="v-name" type="text" placeholder="Alex Morgan" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                </div>
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Email Address *</label>
                  <input id="v-email" type="email" placeholder="alex@eventos.io" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Password *</label>
                  <input id="v-password" type="password" placeholder="••••••••" minlength="4" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                </div>
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Home / City Address *</label>
                  <input id="v-address" type="text" placeholder="124 Alameda, Lisbon, Portugal" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                </div>
              </div>

              <!-- Event Details -->
              <div class="pt-2 border-t border-[#EADFD0]">
                <p class="text-[11px] font-label font-bold uppercase text-[#827473] mb-3">Event Registration Details</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Name</label>
                    <input id="v-event-name" type="text" value="AARPO World Summit 2026"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event ID</label>
                    <input id="v-event-id" type="text" value="aarpo-26"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Location</label>
                    <input id="v-event-loc" type="text" value="Lisbon Congress Center"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Date</label>
                    <input id="v-event-date" type="text" value="SEP 14-16, 2026"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Start &amp; End Time</label>
                    <input id="v-event-time" type="text" value="09:00 AM - 06:00 PM"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
                  </div>
                </div>

                <!-- Live Location Permission -->
                <div class="p-3 bg-[#FFFBF5] border border-[#EADFD0] rounded-xl flex items-center gap-3">
                  <input id="v-location-perm" type="checkbox" checked
                    class="rounded border-[#EADFD0] text-[#9F3E41] focus:ring-[#9F3E41] w-4 h-4 cursor-pointer"/>
                  <label for="v-location-perm" class="text-xs font-body text-[#450D0D] cursor-pointer">
                    <strong>Enable Live Location Permission</strong> for turn-by-turn indoor wayfinding and crowd bottleneck rerouting.
                  </label>
                </div>
              </div>

              <button type="submit"
                class="w-full py-3 rounded-xl bg-[#9F3E41] hover:bg-[#450D0D] text-white text-xs font-label font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
                <span>Complete Visitor Registration →</span>
              </button>
            </form>

            <!-- ORGANIZER FORM -->
            <form id="form-organizer" onsubmit="window.app.handleRegister(event, 'organizer')" class="space-y-4 ${role === 'organizer' ? '' : 'hidden'}">
              <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-body text-[#450D0D] flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-base text-[#9F3E41]">verified_user</span>
                <span><strong>Organizer Hub:</strong> Manage live telemetry, crowd flow balancer, staff dispatch &amp; venue uploads.</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Full Name / Lead *</label>
                  <input id="o-name" type="text" placeholder="Jane Doe" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                </div>
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Work Email Address *</label>
                  <input id="o-email" type="email" placeholder="admin@eventos.io" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Password *</label>
                  <input id="o-password" type="password" placeholder="••••••••" minlength="4" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                </div>
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Company / HQ Address *</label>
                  <input id="o-address" type="text" placeholder="Avenida da Liberdade 100, Lisbon" required
                    class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                </div>
              </div>

              <!-- Event Details -->
              <div class="pt-2 border-t border-[#EADFD0]">
                <p class="text-[11px] font-label font-bold uppercase text-[#827473] mb-3">Event Creation &amp; Management Setup</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Name *</label>
                    <input id="o-event-name" type="text" placeholder="Global AI &amp; Urban Design Forum" required
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Identifier / Slug</label>
                    <input id="o-event-id" type="text" placeholder="ai-urban-26"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Venue / Location *</label>
                    <input id="o-event-loc" type="text" placeholder="Altice Arena, Lisbon" required
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Date *</label>
                    <input id="o-event-date" type="text" placeholder="OCT 22-24, 2026" required
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                  </div>
                  <div>
                    <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Operational Hours</label>
                    <input id="o-event-time" type="text" value="08:30 AM - 07:00 PM"
                      class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3.5 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#450D0D]"/>
                  </div>
                </div>

                <!-- File Upload (Image, PDF, Excel, Data Files) -->
                <div>
                  <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">
                    Event Data File Upload (Optional: Venue Blueprint, Attendee Sheet, Schedule PDF, Excel, JSON)
                  </label>
                  <div class="border-2 border-dashed border-[#EADFD0] rounded-xl p-4 text-center bg-[#FFFBF5] hover:border-[#450D0D] transition-colors relative">
                    <input id="o-file" type="file"
                      accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls,.csv,.json,.txt"
                      onchange="window.app.handleFileSelected(event)"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                    <div class="flex flex-col items-center pointer-events-none">
                      <span class="material-symbols-outlined text-2xl text-[#9F3E41] mb-1">upload_file</span>
                      <p id="o-file-label" class="text-xs font-body text-[#450D0D]">
                        <strong>Click to select file</strong> or drag &amp; drop (PDF, Image, Excel, CSV)
                      </p>
                      <span class="text-[10px] font-label text-[#827473] mt-0.5">Supports: .pdf, .png, .jpg, .xlsx, .csv, .json</span>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit"
                class="w-full py-3 rounded-xl bg-[#450D0D] hover:bg-[#9F3E41] text-white text-xs font-label font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
                <span>Complete Organizer Setup →</span>
              </button>
            </form>

            <!-- Already Have Account Link -->
            <div class="mt-6 pt-5 border-t border-[#EADFD0] text-center">
              <p class="text-xs font-label text-[#827473]">
                Already have an account?
                <button type="button" onclick="window.app.showLogin('${role}')" class="text-[#9F3E41] font-bold hover:underline ml-1">
                  Sign in here →
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  toggleRegisterTab(role) {
    this._pendingRole = role;
    const tabV = document.getElementById('tab-visitor');
    const tabO = document.getElementById('tab-organizer');
    const formV = document.getElementById('form-visitor');
    const formO = document.getElementById('form-organizer');

    if (role === 'visitor') {
      if (tabV) tabV.className = 'py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-[#9F3E41] text-white shadow-sm';
      if (tabO) tabO.className = 'py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[#615E57] hover:text-[#450D0D]';
      if (formV) formV.classList.remove('hidden');
      if (formO) formO.classList.add('hidden');
    } else {
      if (tabV) tabV.className = 'py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[#615E57] hover:text-[#450D0D]';
      if (tabO) tabO.className = 'py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-[#450D0D] text-white shadow-sm';
      if (formV) formV.classList.add('hidden');
      if (formO) formO.classList.remove('hidden');
    }
  }

  handleFileSelected(e) {
    const file = e.target.files[0];
    const label = document.getElementById('o-file-label');
    if (file && label) {
      label.innerHTML = `<strong>Selected:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
  }

  async handleRegister(e, role) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.innerText = 'Creating account…';
      btn.disabled = true;
    }

    let payload = {};
    if (role === 'visitor') {
      const name = document.getElementById('v-name').value.trim();
      const email = document.getElementById('v-email').value.trim();
      const password = document.getElementById('v-password').value;
      const address = document.getElementById('v-address').value.trim();
      const event_name = document.getElementById('v-event-name').value.trim();
      const event_id = document.getElementById('v-event-id').value.trim();
      const event_location = document.getElementById('v-event-loc').value.trim();
      const event_date = document.getElementById('v-event-date').value.trim();
      const timeStr = document.getElementById('v-event-time').value.trim();
      const location_permission = document.getElementById('v-location-perm').checked;

      const [start_time, end_time] = timeStr.includes('-') ? timeStr.split('-').map(s => s.trim()) : [timeStr, '06:00 PM'];

      payload = {
        name, email, password, address, role: 'visitor',
        event_name, event_id, event_location, event_date,
        start_time, end_time, location_permission
      };
    } else {
      const name = document.getElementById('o-name').value.trim();
      const email = document.getElementById('o-email').value.trim();
      const password = document.getElementById('o-password').value;
      const address = document.getElementById('o-address').value.trim();
      const event_name = document.getElementById('o-event-name').value.trim();
      const event_id = document.getElementById('o-event-id').value.trim();
      const event_location = document.getElementById('o-event-loc').value.trim();
      const event_date = document.getElementById('o-event-date').value.trim();
      const timeStr = document.getElementById('o-event-time').value.trim();
      const [start_time, end_time] = timeStr.includes('-') ? timeStr.split('-').map(s => s.trim()) : [timeStr, '06:00 PM'];

      const fileInput = document.getElementById('o-file');
      let file_name = null;
      let file_data = null;

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        file_name = file.name;
        try {
          file_data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (err) {
          console.warn('File read warning:', err);
        }
      }

      payload = {
        name, email, password, address, role: 'organizer',
        event_name, event_id, event_location, event_date,
        start_time, end_time, file_name, file_data
      };
    }

    try {
      const res = await window.EventosAPI.registerUser(payload);
      if (res && res.event) {
        const currentEvents = this.state.userEvents || [];
        const updatedEvents = [res.event, ...currentEvents.filter(e => e.id !== res.event.id)];
        this.setState('userEvents', updatedEvents);
        this.setState('activeEventId', res.event.id);
      }
      this.toast(`Registration successful for ${payload.name}! Please sign in.`, 'info');

      // Seamlessly transition to Login page prefilling email
      this.renderLogin(document.getElementById('view-container'), role, payload.email);
    } catch (err) {
      this.toast(err.message || 'Registration failed. Please try again.', 'warning');
      if (btn) {
        btn.innerText = role === 'visitor' ? 'Complete Visitor Registration →' : 'Complete Organizer Setup →';
        btn.disabled = false;
      }
    }
  }

  /* =========================================================================
     2. LOGIN PAGE (Password Validation + Multi-event Loading)
     ========================================================================= */
  renderLogin(container, role = 'visitor', prefillEmail = '') {
    const isOrganizer = role === 'organizer';
    const accent  = isOrganizer ? '#450D0D' : '#9F3E41';
    const label   = isOrganizer ? 'Organizer Hub' : 'Visitor Portal';
    const icon    = isOrganizer ? 'analytics' : 'confirmation_number';
    const tagline = isOrganizer ? 'Access crowd maps, analytics & staff controls.' : 'Explore events, get passes & navigate the venue.';
    this._pendingRole = role;

    container.innerHTML = `
      <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-md">
          <div class="flex items-center justify-between mb-4">
            <button onclick="window.app.renderRegister(document.getElementById('view-container'), '${role}')" class="flex items-center gap-1 text-xs font-label uppercase font-bold text-[#827473] hover:text-[#450D0D]">
              <span class="material-symbols-outlined text-sm">arrow_back</span> Register Page
            </button>
            <div class="text-xs font-label text-[#827473]">
              Step 2 of 2: <strong class="text-[#450D0D]">Login</strong>
            </div>
          </div>

          <div class="paper-card rounded-2xl p-8 bg-white border border-[#EADFD0] shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm" style="background:${accent}">
                <span class="material-symbols-outlined text-2xl">${icon}</span>
              </div>
              <div>
                <p class="text-[10px] font-label uppercase font-bold text-[#827473]">${isOrganizer ? 'FOR EVENT ORGANIZERS' : 'FOR ATTENDEES'}</p>
                <h2 class="font-headline text-xl font-medium text-[#450D0D]">Sign in to ${label}</h2>
              </div>
            </div>
            <p class="font-body text-xs text-[#827473] mb-5">${tagline}</p>

            <!-- Quick Demo Credentials Box -->
            <div class="mb-5 p-3 rounded-xl bg-[#FFFBF5] border border-[#EADFD0]">
              <div class="text-[10px] font-label font-bold uppercase text-[#827473] mb-2 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm text-[#9F3E41]">bolt</span>
                <span>Instant 1-Click Demo Login:</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="window.app.quickLogin('visitor')" class="px-2.5 py-1.5 rounded-lg border border-[#9F3E41]/30 bg-rose-50/50 hover:bg-rose-100 text-[#9F3E41] text-[11px] font-label font-bold text-left flex items-center gap-1.5 transition-colors">
                  <span class="material-symbols-outlined text-sm">person</span>
                  <span>Visitor Demo</span>
                </button>
                <button type="button" onclick="window.app.quickLogin('organizer')" class="px-2.5 py-1.5 rounded-lg border border-[#450D0D]/30 bg-amber-50/50 hover:bg-amber-100 text-[#450D0D] text-[11px] font-label font-bold text-left flex items-center gap-1.5 transition-colors">
                  <span class="material-symbols-outlined text-sm">shield</span>
                  <span>Organizer Demo</span>
                </button>
              </div>
            </div>

            <form onsubmit="window.app.handleLogin(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Email Address</label>
                <input id="login-email" type="email" value="${prefillEmail || (isOrganizer ? 'admin@eventos.io' : 'alex@eventos.io')}" placeholder="you@example.com"
                  class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-4 py-2.5 text-sm font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41] focus:ring-1 focus:ring-[#9F3E41]" required/>
              </div>
              <div>
                <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Password</label>
                <input id="login-pass" type="password" value="${isOrganizer ? 'admin123' : 'alex123'}" placeholder="••••••••"
                  class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-4 py-2.5 text-sm font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41] focus:ring-1 focus:ring-[#9F3E41]" required/>
              </div>
              <div class="flex items-center justify-between text-[11px] font-label text-[#827473]">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked class="rounded border-[#EADFD0]"/> Remember me
                </label>
                <button type="button" onclick="window.app.toast('Default demo password: alex123 or admin123', 'info')" class="hover:underline hover:text-[#9F3E41]">Password hint</button>
              </div>
              <button type="submit"
                class="w-full py-3 rounded-xl text-white text-xs font-label font-bold uppercase tracking-wider transition-colors hover:opacity-90 shadow-sm"
                style="background:${accent}">
                Sign In &amp; Enter ${label} \u2192
              </button>
            </form>

            <div class="mt-6 pt-5 border-t border-[#EADFD0] text-center">
              <p class="text-[11px] font-label text-[#827473]">Don't have an account?
                <button type="button" onclick="window.app.renderRegister(document.getElementById('view-container'), '${role}')" class="text-[#9F3E41] font-bold hover:underline ml-1">
                  Register free
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  quickLogin(role = 'visitor') {
    this._pendingRole = role;
    const email = role === 'organizer' ? 'admin@eventos.io' : 'alex@eventos.io';
    const pass  = role === 'organizer' ? 'admin123' : 'alex123';

    const emailInput = document.getElementById('login-email');
    const passInput  = document.getElementById('login-pass');
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = pass;

    // Trigger form submit
    const form = document.querySelector('form');
    if (form) {
      const submitEv = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEv);
    }
  }

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passInput  = document.getElementById('login-pass');
    const email    = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';
    const btn      = document.querySelector('form button[type="submit"]');

    if (!email) {
      this.toast('Please enter your email address.', 'warning');
      return;
    }

    if (btn) { btn.innerText = 'Signing in…'; btn.disabled = true; }

    const role = this._pendingRole || this.getState('role') || 'visitor';

    try {
      const data = await window.EventosAPI.loginUserWithPassword(email, password, role);
      const user = data.user || { id: 'user-demo', name: email.split('@')[0], role };
      const events = data.events || [];
      const activeEvent = data.active_event || events[0] || null;

      this.setState('userId', user.id);
      this.setState('userName', user.name || 'Alex Morgan');
      this.setState('role', user.role || role);
      if (events.length) {
        this.setState('userEvents', events);
      }
      if (activeEvent) {
        this.setState('activeEventId', activeEvent.id);
      }

      if (this.visitor) this.visitor.userId = user.id;
      if (this.organizer) this.organizer.organizerId = user.id;

      this.toast(`Welcome back, ${user.name}!`);
      this.updateHeader();

      if (user.role === 'organizer' || role === 'organizer') {
        this.navigate('organizer-overview');
      } else {
        this.navigate('visitor-find');
      }
    } catch (err) {
      console.warn('[EventOS] Local session fallback activated for:', email, err.message);
      const name = email.split('@')[0].split(/[\._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'User';
      const userId = 'user-' + Date.now();
      const defaultEvent = { id: 'aarpo-26', title: 'AARPO World Summit 2026', location: 'Lisbon Congress Center', date_label: 'SEP 14-16, 2026' };

      this.setState('userId', userId);
      this.setState('userName', name);
      this.setState('role', role);
      this.setState('userEvents', [defaultEvent, { id: 'lisbon-ux', title: 'Lisbon UX & Design Expo', location: 'FIL Pavilion 2', date_label: 'SEP 18-19, 2026' }]);
      this.setState('activeEventId', 'aarpo-26');

      if (this.visitor) this.visitor.userId = userId;
      if (this.organizer) this.organizer.organizerId = userId;

      this.toast(`Welcome, ${name}!`);
      this.updateHeader();

      if (role === 'organizer') {
        this.navigate('organizer-overview');
      } else {
        this.navigate('visitor-find');
      }
    }
  }

  /* =========================================================================
     3. HEADER NAVIGATION WITH EVENT SELECTOR & [+ ADD EVENT] BUTTON
     ========================================================================= */
  updateHeader() {
    const route = this.state.currentRoute || window.location.hash.replace('#', '') || 'auth';
    const isAuthRoute = (route === 'auth' || route === 'login' || route === 'register');
    const role = this.getState('role') || 'visitor';
    const roleBadge = document.getElementById('header-role-badge');
    const navLinks = document.getElementById('header-nav-links');
    const rightActions = document.getElementById('header-right-actions');

    if (isAuthRoute) {
      // 1. Unauthenticated / Landing View: Clean header without internal event controls
      if (roleBadge) {
        roleBadge.className = 'hidden';
      }
      if (navLinks) {
        navLinks.innerHTML = '';
      }
      if (rightActions) {
        rightActions.innerHTML = `
          <button onclick="window.app.showApiSettingsModal ? window.app.showApiSettingsModal() : null" class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer" title="Click to view or change Backend API URL">
            <div id="api-live-dot" class="w-2 h-2 rounded-full ${window.EventosAPI && window.EventosAPI.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}"></div>
            <span id="api-live-label" class="text-[10px] font-label uppercase font-bold text-[#827473] hidden sm:inline">${window.EventosAPI && window.EventosAPI.isLive ? 'Live' : 'API'}</span>
          </button>
          <button onclick="window.app.renderLogin(document.getElementById('view-container'), 'visitor')" class="text-xs font-label uppercase font-bold text-[#9F3E41] hover:text-[#450D0D] flex items-center gap-1 border border-[#EADFD0] px-3.5 py-1.5 rounded-lg bg-white shadow-2xs">
            <span>Sign In</span>
            <span class="material-symbols-outlined text-sm">login</span>
          </button>
        `;
      }
      return;
    }

    // 2. Authenticated View: Show full header navigation & controls!
    if (roleBadge) {
      roleBadge.innerText = role === 'organizer' ? 'ORGANIZER MODE' : 'VISITOR MODE';
      roleBadge.className = `hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-label font-bold uppercase tracking-wider ${role === 'organizer' ? 'bg-[#450D0D] text-white' : 'bg-[#9F3E41] text-white'}`;
    }

    if (rightActions) {
      const nextRoleLabel = role === 'organizer' ? 'Visitor View' : 'Organizer Hub';
      const nextRoleIcon  = role === 'organizer' ? 'person' : 'analytics';
      rightActions.innerHTML = `
        <button onclick="window.app.showApiSettingsModal ? window.app.showApiSettingsModal() : null" class="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer" title="Click to view or change Backend API URL">
          <div id="api-live-dot" class="w-2 h-2 rounded-full ${window.EventosAPI && window.EventosAPI.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}"></div>
          <span id="api-live-label" class="text-[10px] font-label uppercase font-bold text-[#827473]">${window.EventosAPI && window.EventosAPI.isLive ? 'Live' : 'API'}</span>
        </button>
        <!-- Switch Mode Button -->
        <button onclick="window.app.toggleRole()" class="text-xs font-label uppercase font-bold text-[#450D0D] hover:text-[#9F3E41] flex items-center gap-1 border border-[#EADFD0] px-3 py-1.5 rounded-lg bg-[#FFFBF5] hover:bg-white transition-all shadow-2xs" title="Switch between Visitor & Organizer Mode">
          <span class="material-symbols-outlined text-sm text-[#9F3E41]">swap_horiz</span>
          <span>${nextRoleLabel}</span>
        </button>
        <button onclick="window.app.logout()" class="hidden md:flex text-xs font-label uppercase font-bold text-[#9F3E41] hover:text-[#450D0D] items-center gap-1 border border-[#EADFD0] px-3 py-1.5 rounded-lg bg-white shadow-2xs" title="Sign out / Switch account">
          <span>Sign Out</span>
          <span class="material-symbols-outlined text-sm">logout</span>
        </button>
        <!-- Mobile Hamburger Button -->
        <button onclick="window.app.toggleMobileMenu()" class="md:hidden p-2 rounded-lg bg-white border border-[#EADFD0] text-[#450D0D] hover:bg-[#FFFBF5] flex items-center justify-center shadow-2xs" aria-label="Toggle navigation menu">
          <span class="material-symbols-outlined text-xl">menu</span>
        </button>
      `;
    }

    const events = this.state.userEvents || [];
    const activeId = this.getActiveEventId();

    if (navLinks) {
      navLinks.className = 'hidden md:flex items-center gap-5 font-label text-xs uppercase font-bold text-[#450D0D]';
      let pageButtons = '';
      if (role === 'organizer') {
        pageButtons = `
          <button onclick="window.app.navigate('organizer-overview')" class="hover:text-[#9F3E41] transition-colors ${route === 'organizer-overview' ? 'text-[#9F3E41] font-extrabold' : ''}">Dashboard</button>
          <button onclick="window.app.navigate('organizer-flow-balancer')" class="hover:text-[#9F3E41] transition-colors ${route === 'organizer-flow-balancer' ? 'text-[#9F3E41] font-extrabold' : 'text-[#9F3E41] font-bold'}">Fix Crowd</button>
          <button onclick="window.app.navigate('organizer-live-map')" class="hover:text-[#9F3E41] transition-colors ${route === 'organizer-live-map' ? 'text-[#9F3E41] font-extrabold' : ''}">Crowd Map</button>
          <button onclick="window.app.navigate('organizer-simulation')" class="hover:text-[#9F3E41] transition-colors ${route === 'organizer-simulation' ? 'text-[#9F3E41] font-extrabold' : ''}">Simulator</button>
        `;
      } else {
        pageButtons = `
          <button onclick="window.app.navigate('visitor-find')" class="hover:text-[#9F3E41] transition-colors ${route === 'visitor-find' ? 'text-[#9F3E41] font-extrabold' : ''}">Explore Events</button>
          <button onclick="window.app.navigate('visitor-plan-journey')" class="hover:text-[#9F3E41] transition-colors ${route === 'visitor-plan-journey' ? 'text-[#9F3E41] font-extrabold' : ''}">Plan Journey</button>
          <button onclick="window.app.navigate('visitor-my-journey')" class="hover:text-[#9F3E41] transition-colors ${route === 'visitor-my-journey' ? 'text-[#9F3E41] font-extrabold' : ''}">My Passes</button>
          <button onclick="window.app.navigate('visitor-live')" class="hover:text-[#9F3E41] transition-colors ${route === 'visitor-live' ? 'text-[#9F3E41] font-extrabold' : ''}">Venue Map</button>
        `;
      }

      // Event Switcher Dropdown & Add Event Button
      const eventOptions = events.map(e => `
        <option value="${e.id}" ${e.id === activeId ? 'selected' : ''}>
          ${e.title || e.id}
        </option>
      `).join('');

      navLinks.innerHTML = `
        <div class="flex items-center gap-5">
          ${pageButtons}
          
          <!-- Event Switcher Cluster -->
          <div class="flex items-center gap-1.5 pl-3 border-l border-[#EADFD0]">
            <div class="relative flex items-center">
              <span class="material-symbols-outlined text-sm text-[#9F3E41] mr-1 pointer-events-none">festival</span>
              <select onchange="window.app.switchEvent(this.value)" 
                class="bg-white border border-[#EADFD0] rounded-lg px-2.5 py-1 text-xs font-label font-bold text-[#450D0D] cursor-pointer hover:border-[#9F3E41] focus:outline-none max-w-[170px] truncate">
                ${eventOptions || `<option value="aarpo-26">AARPO World Summit 2026</option>`}
              </select>
            </div>

            <!-- Delete Event Button -->
            <button onclick="window.app.deleteCurrentEvent()" 
              title="Remove / Delete this event"
              class="p-1 rounded-lg bg-[#FFFBF5] hover:bg-rose-600 hover:text-white border border-[#EADFD0] text-rose-700 text-xs transition-colors flex items-center justify-center">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>

            <!-- Add / Join Event Button -->
            <button onclick="window.app.openAddEventModal()" 
              title="${role === 'organizer' ? 'Add / Configure custom event' : 'Select / Register for another event'}"
              class="px-2.5 py-1 rounded-lg bg-[#FFFBF5] hover:bg-[#9F3E41] hover:text-white border border-[#EADFD0] text-[#9F3E41] text-xs font-label font-bold uppercase transition-colors flex items-center gap-0.5">
              <span class="material-symbols-outlined text-sm">add</span>
              <span class="hidden lg:inline">${role === 'organizer' ? 'Add Event' : 'Join Event'}</span>
            </button>
          </div>
        </div>
      `;
    }

    this.renderMobileDrawer();
  }

  toggleMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      this.renderMobileDrawer();
      drawer.classList.remove('hidden');
    } else {
      drawer.classList.add('hidden');
    }
  }

  closeMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) drawer.classList.add('hidden');
  }

  renderMobileDrawer() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!drawer) return;
    const route = this.state.currentRoute || 'auth';
    const isAuthRoute = (route === 'auth' || route === 'login' || route === 'register');
    if (isAuthRoute) {
      drawer.classList.add('hidden');
      drawer.innerHTML = '';
      return;
    }

    const role = this.getState('role') || 'visitor';
    const events = this.state.userEvents || [];
    const activeId = this.getActiveEventId();

    const eventOptions = events.map(e => `
      <option value="${e.id}" ${e.id === activeId ? 'selected' : ''}>
        ${e.title || e.id}
      </option>
    `).join('');

    let links = '';
    if (role === 'organizer') {
      links = `
        <button onclick="window.app.navigate('organizer-overview'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'organizer-overview' ? 'bg-[#450D0D] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">dashboard</span>
          <span>Operations Dashboard</span>
        </button>
        <button onclick="window.app.navigate('organizer-flow-balancer'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'organizer-flow-balancer' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#9F3E41] bg-rose-50 border border-rose-200'}">
          <span class="material-symbols-outlined text-base">alt_route</span>
          <span>Fix Crowd (Flow Balancer)</span>
        </button>
        <button onclick="window.app.navigate('organizer-live-map'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'organizer-live-map' ? 'bg-[#450D0D] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">map</span>
          <span>Live Blueprint Map</span>
        </button>
        <button onclick="window.app.navigate('organizer-simulation'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'organizer-simulation' ? 'bg-[#450D0D] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">play_circle</span>
          <span>Crowd Simulator</span>
        </button>
      `;
    } else {
      links = `
        <button onclick="window.app.navigate('visitor-find'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'visitor-find' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">search</span>
          <span>Explore Events</span>
        </button>
        <button onclick="window.app.navigate('visitor-plan-journey'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'visitor-plan-journey' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">route</span>
          <span>Plan Indoor Journey</span>
        </button>
        <button onclick="window.app.navigate('visitor-my-journey'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'visitor-my-journey' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">confirmation_number</span>
          <span>My Passes &amp; Schedule</span>
        </button>
        <button onclick="window.app.navigate('visitor-live'); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center gap-2.5 font-label font-bold text-xs uppercase ${route === 'visitor-live' ? 'bg-[#9F3E41] text-white shadow-sm' : 'text-[#450D0D] bg-white border border-[#EADFD0]'}">
          <span class="material-symbols-outlined text-base">navigation</span>
          <span>Live Venue Map</span>
        </button>
      `;
    }

    drawer.innerHTML = `
      <div class="space-y-3">
        <!-- Event Switcher -->
        <div class="p-3 rounded-xl bg-white border border-[#EADFD0] shadow-2xs">
          <label class="block text-[10px] font-label uppercase font-bold text-[#827473] mb-1.5 flex items-center justify-between">
            <span>Current Active Event</span>
            <span class="text-[#9F3E41] font-bold">${role === 'organizer' ? 'ORGANIZER' : 'VISITOR'}</span>
          </label>
          <div class="flex items-center gap-1.5">
            <select onchange="window.app.switchEvent(this.value); window.app.closeMobileMenu();"
              class="flex-1 bg-[#FFFBF5] border border-[#EADFD0] rounded-lg px-3 py-2 text-xs font-label font-bold text-[#450D0D] focus:outline-none">
              ${eventOptions || `<option value="aarpo-26">AARPO World Summit 2026</option>`}
            </select>
            <button onclick="window.app.deleteCurrentEvent(); window.app.closeMobileMenu();"
              class="px-2.5 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white text-xs font-label font-bold flex items-center gap-1 shrink-0 shadow-sm" title="Remove / Delete Active Event">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
            <button onclick="window.app.openAddEventModal(); window.app.closeMobileMenu();"
              class="px-3 py-2 rounded-lg bg-[#9F3E41] text-white text-xs font-label font-bold uppercase flex items-center gap-1 shrink-0 shadow-sm" title="${role === 'organizer' ? 'Add Event' : 'Join Event'}">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>

        <!-- Navigation Links -->
        <div class="space-y-1.5">
          ${links}
        </div>

        <!-- Quick Switch Role Action -->
        <div class="pt-2">
          <button onclick="window.app.toggleRole(); window.app.closeMobileMenu();" class="w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between font-label font-bold text-xs uppercase bg-[#FFFBF5] border border-[#EADFD0] text-[#450D0D] hover:bg-white transition-colors">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#9F3E41] text-base">swap_horiz</span>
              <span>Switch to ${role === 'organizer' ? 'Visitor Mode' : 'Organizer Mode'}</span>
            </div>
            <span class="text-[10px] text-[#9F3E41] font-bold">Switch →</span>
          </button>
        </div>

        <!-- Sign Out & Settings -->
        <div class="pt-3 border-t border-[#EADFD0] flex items-center justify-between">
          <button onclick="window.app.showApiSettingsModal(); window.app.closeMobileMenu();" class="text-xs font-label font-bold text-[#827473] hover:text-[#450D0D] flex items-center gap-1.5 py-1">
            <span class="material-symbols-outlined text-base">settings</span>
            <span>API Settings</span>
          </button>
          <button onclick="window.app.logout(); window.app.closeMobileMenu();" class="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-label font-bold uppercase flex items-center gap-1.5 shadow-2xs">
            <span>Sign Out</span>
            <span class="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </div>
    `;
  }

  toggleRole() {
    const current = this.getState('role') || 'visitor';
    const nextRole = current === 'organizer' ? 'visitor' : 'organizer';
    this.setState('role', nextRole);
    this.toast(`Switched to ${nextRole === 'organizer' ? 'Organizer Mode' : 'Visitor Mode'}`);
    this.updateHeader();
    if (nextRole === 'organizer') {
      this.navigate('organizer-overview');
    } else {
      this.navigate('visitor-find');
    }
  }

  logout() {
    this.setState('userId', null);
    this.toast('Signed out successfully.');
    this.navigate('auth');
  }

  /* =========================================================================
     4. ADD / JOIN EVENT MODAL (Role-Aware)
     ========================================================================= */
  openAddEventModal() {
    const role = this.getState('role') || 'visitor';
    const isOrganizer = role === 'organizer';
    const events = this.state.userEvents || [];

    const defaultRooms = [
      { name: 'Quad Area (Main Stage & Lawn)', cap: 5000, x: 155, y: 125, w: 230, h: 110 },
      { name: 'Canteen & Food Court (Gate 03)', cap: 1800, x: 35, y: 20, w: 100, h: 75 },
      { name: 'Multipurpose Sports Complex', cap: 2200, x: 520, y: 205, w: 105, h: 120 },
      { name: 'Gymkhana & Indoor Sports', cap: 1200, x: 520, y: 70, w: 105, h: 75 },
      { name: 'Football Ground Arena', cap: 3000, x: 520, y: 345, w: 105, h: 100 },
      { name: 'Central Library & Study Zone', cap: 900, x: 165, y: 75, w: 85, h: 45 },
      { name: 'Innovation & Research Centre', cap: 850, x: 395, y: 125, w: 100, h: 55 },
      { name: 'Engineering Workshop & Labs', cap: 1000, x: 380, y: 35, w: 110, h: 60 },
      { name: 'Department of IT & Classrooms', cap: 1100, x: 65, y: 205, w: 85, h: 95 },
      { name: 'Admin Wing & Principal Office', cap: 1200, x: 220, y: 250, w: 165, h: 75 },
      { name: 'Gate No. 01 Main Check-in', cap: 3000, x: 430, y: 415, w: 110, h: 50 }
    ];

    const eventsListHtml = events.length ? `
      <div class="mb-5 p-3.5 bg-[#FFFBF5] rounded-xl border border-[#EADFD0]">
        <label class="block text-[11px] font-label font-bold uppercase text-[#827473] mb-2 flex items-center justify-between">
          <span>Active Events (${events.length})</span>
          <span class="text-[10px] text-[#9F3E41]">Click 🗑️ to remove any event</span>
        </label>
        <div class="space-y-1.5 max-h-36 overflow-y-auto">
          ${events.map(ev => `
            <div class="flex items-center justify-between p-2 bg-white rounded-lg border border-[#EADFD0] text-xs">
              <div class="flex items-center gap-2 truncate pr-2">
                <span class="material-symbols-outlined text-sm text-[#9F3E41]">event</span>
                <span class="font-body font-semibold text-[#450D0D] truncate">${ev.title || ev.id}</span>
                <span class="text-[10px] font-label text-[#827473]">(${ev.location || 'Venue'})</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="window.app.switchEvent('${ev.id}'); window.app.closeModal();" class="px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-label font-bold uppercase hover:bg-amber-100">
                  Select
                </button>
                <button type="button" onclick="window.app.deleteEventById('${ev.id}'); window.app.openAddEventModal();" class="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors" title="Delete / Remove this event">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    let formContent = '';

    if (isOrganizer) {
      // 1. ORGANIZER FORM (Full Venue & Blueprint Controls)
      formContent = `
        <div class="pt-1 mb-3">
          <span class="text-xs font-label uppercase font-bold text-[#9F3E41]">➕ Add / Configure New Event</span>
        </div>

        <form onsubmit="window.app.handleAddEventSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Name *</label>
            <input id="modal-ev-name" type="text" placeholder="e.g. Pillai College Alegria Festival 2026" required
              class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event ID / Code</label>
              <input id="modal-ev-id" type="text" placeholder="e.g. pillai-alegria"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Date</label>
              <input id="modal-ev-date" type="text" placeholder="e.g. OCT 24-26, 2026"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Location / Venue</label>
              <input id="modal-ev-loc" type="text" placeholder="e.g. Pillai College of Engineering, New Panvel"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Total Max Capacity</label>
              <input id="modal-ev-cap" type="number" placeholder="15000" value="15000"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
          </div>

          <div>
            <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Attach Blueprint Floorplan (Image, PNG, JPG, PDF)</label>
            <input id="modal-ev-file" type="file" accept=".png,.jpg,.jpeg,.pdf,.webp"
              class="w-full text-xs font-body file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-label file:font-bold file:bg-[#450D0D] file:text-white hover:file:bg-[#9F3E41]"/>
          </div>

          <!-- Room / Zone Builder Section -->
          <div class="pt-2 border-t border-[#EADFD0]">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-label font-bold uppercase text-[#450D0D]">
                📍 Venue Rooms &amp; Zones (<span id="room-count">${defaultRooms.length}</span> rooms)
              </label>
              <button type="button" onclick="window.app.addCustomRoomRow()" class="text-[11px] font-label font-bold uppercase text-[#9F3E41] hover:underline flex items-center gap-0.5">
                <span class="material-symbols-outlined text-sm">add</span> Add Room
              </button>
            </div>
            <p class="font-body text-[11px] text-[#827473] mb-2.5">Define or customize the exact rooms and capacities to display on the map:</p>

            <div id="modal-rooms-container" class="space-y-2 max-h-48 overflow-y-auto p-1 bg-[#FFFBF5] rounded-xl border border-[#EADFD0]">
              ${defaultRooms.map((r, idx) => `
                <div class="room-row flex items-center gap-2 p-2 bg-white rounded-lg border border-[#EADFD0] text-xs">
                  <input type="text" class="room-name flex-1 bg-transparent border-0 border-b border-[#EADFD0] px-1 py-1 font-body text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]" value="${r.name}" placeholder="Room Name" required />
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] font-label text-[#827473]">Cap:</span>
                    <input type="number" class="room-cap w-16 bg-transparent border-0 border-b border-[#EADFD0] px-1 py-1 font-body text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]" value="${r.cap}" placeholder="Cap" required />
                  </div>
                  <input type="hidden" class="room-x" value="${r.x}" />
                  <input type="hidden" class="room-y" value="${r.y}" />
                  <input type="hidden" class="room-w" value="${r.w}" />
                  <input type="hidden" class="room-h" value="${r.h}" />
                  <button type="button" onclick="this.closest('.room-row').remove(); window.app.updateRoomCount();" class="text-rose-600 hover:text-rose-800 p-1" title="Remove Room">
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-[#EADFD0] flex justify-end gap-2">
            <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-lg border border-[#EADFD0] text-xs font-label text-[#827473]">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-[#9F3E41] hover:bg-[#450D0D] text-white text-xs font-label font-bold uppercase tracking-wider shadow">
              Save Event &amp; Load Map →
            </button>
          </div>
        </form>
      `;
    } else {
      // 2. VISITOR FORM (Clean Registration / Pass Issuance without Capacity or Blueprint Builder)
      formContent = `
        <div class="pt-1 mb-3">
          <span class="text-xs font-label uppercase font-bold text-[#9F3E41]">🎫 Register for Another Event</span>
        </div>

        <form onsubmit="window.app.handleAddEventSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Name *</label>
            <input id="modal-ev-name" type="text" placeholder="e.g. Pillai College Alegria Festival 2026" required
              class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Event Date</label>
              <input id="modal-ev-date" type="text" placeholder="e.g. OCT 24-26, 2026" value="OCT 24-26, 2026"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
            <div>
              <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Location / Venue</label>
              <input id="modal-ev-loc" type="text" placeholder="e.g. Pillai College, Panvel" value="Pillai College of Engineering, New Panvel"
                class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
            </div>
          </div>

          <div>
            <label class="block text-xs font-label font-bold uppercase text-[#615E57] mb-1">Attendee / Pass Holder Name</label>
            <input id="modal-holder-name" type="text" value="${this.getState('userName') || 'Alex Morgan'}" placeholder="Your Full Name"
              class="w-full rounded-lg border border-[#EADFD0] bg-[#FFFBF5] px-3 py-2 text-xs font-body text-[#450D0D] focus:outline-none focus:border-[#9F3E41]"/>
          </div>

          <div class="pt-3 border-t border-[#EADFD0] flex justify-end gap-2">
            <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 rounded-lg border border-[#EADFD0] text-xs font-label text-[#827473]">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-[#9F3E41] hover:bg-[#450D0D] text-white text-xs font-label font-bold uppercase tracking-wider shadow flex items-center gap-1">
              <span>Register &amp; Get Pass →</span>
            </button>
          </div>
        </form>
      `;
    }

    const html = `
      <div class="p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#EADFD0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-xl text-[#9F3E41]">${isOrganizer ? 'add_circle' : 'confirmation_number'}</span>
            <h3 class="font-headline text-lg font-medium text-[#450D0D]">
              ${isOrganizer ? 'Create / Manage Custom Event' : 'Select or Register for Event'}
            </h3>
          </div>
          <button onclick="window.app.closeModal()" class="text-[#827473] hover:text-[#450D0D]">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        ${eventsListHtml}
        ${formContent}
      </div>
    `;

    this.openModal(html);
  }

  addCustomRoomRow() {
    const container = document.getElementById('modal-rooms-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'room-row flex items-center gap-2 p-2 bg-white rounded-lg border border-[#EADFD0] text-xs';
    row.innerHTML = `
      <input type="text" class="room-name flex-1 bg-transparent border-0 border-b border-[#EADFD0] px-1 py-1 font-body text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]" value="New Zone" placeholder="Room Name" required />
      <div class="flex items-center gap-1">
        <span class="text-[10px] font-label text-[#827473]">Cap:</span>
        <input type="number" class="room-cap w-16 bg-transparent border-0 border-b border-[#EADFD0] px-1 py-1 font-body text-xs text-[#450D0D] focus:outline-none focus:border-[#9F3E41]" value="1000" placeholder="Cap" required />
      </div>
      <input type="hidden" class="room-x" value="100" />
      <input type="hidden" class="room-y" value="100" />
      <input type="hidden" class="room-w" value="120" />
      <input type="hidden" class="room-h" value="80" />
      <button type="button" onclick="this.closest('.room-row').remove(); window.app.updateRoomCount();" class="text-rose-600 hover:text-rose-800 p-1" title="Remove Room">
        <span class="material-symbols-outlined text-base">delete</span>
      </button>
    `;
    container.appendChild(row);
    this.updateRoomCount();
  }

  updateRoomCount() {
    const rows = document.querySelectorAll('#modal-rooms-container .room-row');
    const badge = document.getElementById('room-count');
    if (badge) badge.innerText = rows.length;
  }

  async handleAddEventSubmit(e) {
    e.preventDefault();
    const role = this.getState('role') || 'visitor';
    const isOrganizer = role === 'organizer';

    const event_name = document.getElementById('modal-ev-name').value.trim();
    const rawId = document.getElementById('modal-ev-id')?.value?.trim() || '';
    const event_id = rawId || event_name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const event_date = document.getElementById('modal-ev-date')?.value?.trim() || 'OCT 24-26, 2026';
    const event_location = document.getElementById('modal-ev-loc')?.value?.trim() || 'Campus Venue';

    if (!isOrganizer) {
      // VISITOR REGISTRATION FLOW:
      const holderName = document.getElementById('modal-holder-name')?.value?.trim() || this.getState('userName') || 'Alex Morgan';
      const passId = 'PASS-' + Math.floor(10000 + Math.random() * 90000);
      
      const newEv = {
        id: event_id,
        title: event_name,
        location: event_location,
        date_label: event_date,
        category: 'General'
      };

      const newPass = {
        id: passId,
        eventId: event_id,
        eventName: event_name,
        passType: 'Standard Event Access',
        holder: holderName,
        validDates: event_date
      };

      const existingPasses = this.state.userPasses || [];
      this.setState('userPasses', [newPass, ...existingPasses.filter(p => p.id !== passId)]);

      const existingEvs = this.state.userEvents || [];
      const updatedEvs = [newEv, ...existingEvs.filter(e => e.id !== event_id)];
      this.setState('userEvents', updatedEvs);

      this.toast(`Pass confirmed for "${event_name}"!`);
      this.closeModal();
      this.switchEvent(event_id);
      return;
    }

    // ORGANIZER CREATION FLOW:
    const max_capacity = parseInt(document.getElementById('modal-ev-cap')?.value) || 15000;
    let file_name = null;
    let file_data = null;
    const fileInput = document.getElementById('modal-ev-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      file_name = file.name;
      try {
        file_data = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      } catch (err) {}
    }

    // Collect custom rooms entered by the user
    const roomRows = document.querySelectorAll('#modal-rooms-container .room-row');
    const custom_zones = [];
    roomRows.forEach((row, idx) => {
      const name = row.querySelector('.room-name')?.value.trim() || `Zone ${idx + 1}`;
      const cap = parseInt(row.querySelector('.room-cap')?.value) || 1000;
      const x = parseInt(row.querySelector('.room-x')?.value) || (50 + (idx % 3) * 190);
      const y = parseInt(row.querySelector('.room-y')?.value) || (50 + Math.floor(idx / 3) * 140);
      const w = parseInt(row.querySelector('.room-w')?.value) || 160;
      const h = parseInt(row.querySelector('.room-h')?.value) || 90;

      custom_zones.push({
        id: `${event_id}-z${idx + 1}`,
        name,
        capacity: cap,
        current_occ: Math.round(cap * 0.7),
        x, y, width: w, height: h
      });
    });

    const payload = {
      event_name,
      event_id,
      event_date,
      event_location,
      max_capacity,
      file_name,
      file_data,
      custom_zones,
      role: 'organizer'
    };

    const userId = this.getState('userId') || 'user-organizer-admin';

    try {
      const res = await window.EventosAPI.addUserEvent(userId, payload);
      const newEv = res.event || {
        id: event_id,
        title: event_name,
        location: event_location,
        max_capacity,
        file_name,
        file_data
      };

      this.toast(`Event "${event_name}" saved with ${custom_zones.length} custom rooms & blueprint!`);
      this.closeModal();

      // Refresh events list and switch active event
      const existing = this.state.userEvents || [];
      const updated = [newEv, ...existing.filter(e => e.id !== newEv.id)];
      this.setState('userEvents', updated);
      this.switchEvent(newEv.id);
    } catch (err) {
      this.toast(err.message || 'Failed to create event', 'warning');
    }
  }

  /* =========================================================================
     5. ROUTING & WELCOME
     ========================================================================= */
  navigate(route) {
    if (window.EventosAPI && typeof window.EventosAPI.stopAllPolling === 'function') {
      window.EventosAPI.stopAllPolling();
    }

    // Protection
    const role = this.getState('role');
    if (route.startsWith('organizer-') && role !== 'organizer') {
      this.toast('Please sign in with organizer credentials first.', 'warning');
      this.showLogin('organizer');
      return;
    }

    this.setState('currentRoute', route);
    window.location.hash = route;
    this.updateHeader();
    const container = document.getElementById('view-container');
    if (!container) return;

    switch (route) {
      case 'auth':
        this.renderAuth(container);
        break;
      case 'register':
        this.renderRegister(container, role);
        break;
      case 'login':
        this.renderLogin(container, role);
        break;
      case 'visitor-find':
        this.visitor.renderFindEvents(container);
        break;
      case 'visitor-plan-journey':
        this.visitor.renderPlanJourney(container);
        break;
      case 'visitor-my-journey':
        this.visitor.renderMyJourney(container);
        break;
      case 'visitor-live':
        this.visitor.renderLiveJourney(container);
        break;
      case 'organizer-overview':
        this.organizer.renderOverview(container);
        break;
      case 'organizer-flow-balancer':
        this.organizer.renderFlowBalancer(container);
        break;
      case 'organizer-live-map':
        this.organizer.renderLiveMap(container);
        break;
      case 'organizer-simulation':
        this.organizer.renderSimulation(container);
        break;
      default:
        if (role === 'organizer') {
          this.organizer.renderOverview(container);
        } else {
          this.visitor.renderFindEvents(container);
        }
    }
  }

  handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'auth';
    this.navigate(hash);
  }

  renderAuth(container) {
    container.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div class="text-center max-w-xl mx-auto mb-10">
          <span class="px-3 py-1 rounded-full bg-[#FFFBF5] border border-[#EADFD0] text-xs font-label uppercase font-bold tracking-widest text-[#9F3E41] mb-3 inline-block">WELCOME TO EVENTOS</span>
          <h1 class="font-headline text-3xl sm:text-4xl font-medium text-[#450D0D] mb-3">Choose How You Want to Use EVENTOS</h1>
          <p class="font-body text-sm text-[#827473]">Register a new account or sign in to continue.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Visitor Card -->
          <div class="paper-card rounded-2xl p-8 hover:border-[#9F3E41] hover:shadow-xl transition-all group bg-white border border-[#EADFD0] flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-rose-50 text-[#9F3E41] flex items-center justify-center mb-5 group-hover:bg-[#9F3E41] group-hover:text-white transition-colors">
                <span class="material-symbols-outlined text-2xl">confirmation_number</span>
              </div>
              <span class="text-xs font-label uppercase font-bold text-[#827473] block mb-1">FOR ATTENDEES</span>
              <h2 class="font-headline text-2xl font-medium text-[#450D0D] mb-2">I am an Event Visitor</h2>
              <p class="font-body text-xs text-[#615E57] mb-6 leading-relaxed">Find events, register your pass, customize your itinerary, and get live indoor directions with crowd avoidance.</p>
            </div>
            <div class="space-y-2 pt-4 border-t border-[#EADFD0]">
              <button onclick="window.app.renderRegister(document.getElementById('view-container'), 'visitor')"
                class="w-full py-2.5 rounded-xl bg-[#9F3E41] hover:bg-[#450D0D] text-white text-xs font-label font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                <span>Register &amp; Enter Visitor Portal →</span>
              </button>
              <button onclick="window.app.renderLogin(document.getElementById('view-container'), 'visitor')"
                class="w-full py-2 rounded-xl border border-[#EADFD0] text-[#450D0D] hover:border-[#9F3E41] text-xs font-label font-bold uppercase transition-colors">
                Already registered? Sign In
              </button>
            </div>
          </div>

          <!-- Organizer Card -->
          <div class="paper-card rounded-2xl p-8 hover:border-[#450D0D] hover:shadow-xl transition-all group bg-[#450D0D] text-white flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-xl bg-amber-950/60 text-[#F98383] flex items-center justify-center mb-5 border border-[#5C1E1E]">
                <span class="material-symbols-outlined text-2xl">analytics</span>
              </div>
              <span class="text-xs font-label uppercase font-bold text-[#F98383] block mb-1">FOR EVENT ORGANIZERS</span>
              <h2 class="font-headline text-2xl font-medium text-white mb-2">I am an Event Organizer</h2>
              <p class="font-body text-xs text-amber-100/70 mb-6 leading-relaxed">Manage events, upload venue blueprints, monitor live crowd capacity maps, dispatch staff, and broadcast visitor updates.</p>
            </div>
            <div class="space-y-2 pt-4 border-t border-amber-900/60">
              <button onclick="window.app.renderRegister(document.getElementById('view-container'), 'organizer')"
                class="w-full py-2.5 rounded-xl bg-[#F98383] hover:bg-white text-[#450D0D] text-xs font-label font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                <span>Register &amp; Enter Organizer Hub →</span>
              </button>
              <button onclick="window.app.renderLogin(document.getElementById('view-container'), 'organizer')"
                class="w-full py-2 rounded-xl border border-amber-800 text-amber-100 hover:text-white text-xs font-label font-bold uppercase transition-colors">
                Already registered? Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* Modal & Toast Utilities */
  openModal(contentHtml) {
    const backdrop = document.getElementById('global-modal-backdrop');
    const content = document.getElementById('global-modal-content');
    if (!backdrop || !content) return;
    content.innerHTML = contentHtml;
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
  }

  closeModal() {
    const backdrop = document.getElementById('global-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
  }

  toast(msg, type = 'info') {
    const toastBox = document.getElementById('global-toast');
    if (!toastBox) return;
    toastBox.innerText = msg;
    toastBox.className = `fixed bottom-6 right-6 px-5 py-3 rounded-xl font-label font-bold text-xs uppercase tracking-wider text-white shadow-xl z-50 transition-all ${type === 'warning' ? 'bg-amber-600' : 'bg-[#450D0D]'}`;
    toastBox.classList.remove('hidden');
    setTimeout(() => toastBox.classList.add('hidden'), 3500);
  }
};

