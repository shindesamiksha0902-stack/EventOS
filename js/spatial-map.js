/* js/spatial-map.js — Dynamic Event-Driven Spatial Map Engine with Blueprint Support */
window.SpatialMapEngine = class SpatialMapEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.mode = options.mode || 'organizer'; // 'organizer' or 'visitor'
    this.viewStyle = options.viewStyle || 'blueprint'; // 'blueprint', 'grid', 'heatmap'
    this.eventId = options.eventId || (window.app && typeof window.app.getActiveEventId === 'function' ? window.app.getActiveEventId() : 'aarpo-26') || 'aarpo-26';
    this.onZoneSelect = options.onZoneSelect || null;

    this.zones = [];
    this.selectedZone = null;
    this.hoveredZone = null;
    this.particles = [];
    this.blueprintImg = null;
    this.hasBlueprint = false;
    this.animTime = 0;

    this.setupEvents();
    this.loadEventData(this.eventId);
    this.startAnimation();
  }

  async loadEventData(eventId) {
    this.eventId = eventId;
    let event = null;

    try {
      if (window.EventosAPI && typeof window.EventosAPI.getEvent === 'function') {
        const evData = await window.EventosAPI.getEvent(eventId);
        if (evData) event = evData.event || evData;
      }
    } catch (err) {
      console.warn('[SpatialMapEngine] Could not load event info:', err);
    }

    // Check if event has a blueprint image (uploaded data or campus floorplan)
    const isPillaiOrBlueprint = (eventId && eventId.includes('pillai')) || 
                                (event && event.title && event.title.toLowerCase().includes('pillai')) ||
                                (event && event.file_name && (event.file_name.includes('blueprint') || event.file_name.includes('ground') || event.file_name.includes('floor')));

    const imgSrc = (event && event.file_data && event.file_data.startsWith('data:image'))
      ? event.file_data
      : (isPillaiOrBlueprint ? 'blueprint_ground_floor.jpg' : null);

    if (imgSrc) {
      this.blueprintImg = new Image();
      this.blueprintImg.crossOrigin = 'anonymous';
      this.blueprintImg.onload = () => {
        this.hasBlueprint = true;
      };
      this.blueprintImg.onerror = () => {
        if (imgSrc !== 'blueprint_ground_floor.jpg') {
          this.blueprintImg.src = 'blueprint_ground_floor.jpg';
        }
      };
      this.blueprintImg.src = imgSrc;
    } else {
      this.hasBlueprint = false;
      this.blueprintImg = null;
    }

    // Load zones from API
    try {
      if (window.EventosAPI && typeof window.EventosAPI.getZones === 'function') {
        const rawZones = await window.EventosAPI.getZones(eventId);
        if (rawZones && rawZones.length) {
          this.setZones(rawZones);
          return;
        }
      }
    } catch (err) {
      console.warn('[SpatialMapEngine] Could not load API zones:', err);
    }

    // Fallback zones
    this.setZones([
      { id: `${this.eventId}-z1`, name: 'Quad Area (Main Stage)', capacity: 5500, current_occ: 4850, x: 155, y: 125, width: 230, height: 110 },
      { id: `${this.eventId}-z2`, name: 'Canteen & Food Court', capacity: 1800, current_occ: 1350, x: 35, y: 20, width: 100, height: 75 },
      { id: `${this.eventId}-z3`, name: 'Sports Complex', capacity: 2200, current_occ: 980, x: 520, y: 205, width: 105, height: 120 },
      { id: `${this.eventId}-z4`, name: 'Gate 01 Check-in', capacity: 3000, current_occ: 2450, x: 430, y: 415, width: 110, height: 50 }
    ]);
  }

  setZones(rawZones) {
    if (!rawZones || !rawZones.length) return;
    const w = this.canvas.width || 640;
    const h = this.canvas.height || 360;

    const baseW = 640;
    const baseH = 500;
    const scaleX = w / baseW;
    const scaleY = h / baseH;

    this.zones = rawZones.map((z, idx) => {
      const zX = z.x !== undefined ? Math.round(z.x * scaleX) : (50 + (idx % 3) * 190);
      const zY = z.y !== undefined ? Math.round(z.y * scaleY) : (50 + Math.floor(idx / 3) * 150);
      const zW = z.width !== undefined ? Math.round(z.width * scaleX) : 170;
      const zH = z.height !== undefined ? Math.round(z.height * scaleY) : 120;

      const occ = z.current_occ !== undefined ? z.current_occ : (z.current || Math.round(z.capacity * 0.65));
      const cap = z.capacity || 1000;

      return {
        id: z.id || `zone-${idx + 1}`,
        name: z.name || `Area ${idx + 1}`,
        x: zX,
        y: zY,
        width: zW,
        height: zH,
        capacity: cap,
        current: occ
      };
    });

    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    this.zones.forEach(zone => {
      const count = Math.min(45, Math.max(6, Math.floor((zone.current / zone.capacity) * 35)));
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: zone.x + Math.random() * (zone.width - 16) + 8,
          y: zone.y + Math.random() * (zone.height - 24) + 16,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          zoneId: zone.id
        });
      }
    });
  }

  setupEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getPos(e);
      this.hoveredZone = this.zones.find(z => 
        pos.x >= z.x && pos.x <= z.x + z.width &&
        pos.y >= z.y && pos.y <= z.y + z.height
      ) || null;
      this.canvas.style.cursor = this.hoveredZone ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      const pos = getPos(e);
      const clickedZone = this.zones.find(z => 
        pos.x >= z.x && pos.x <= z.x + z.width &&
        pos.y >= z.y && pos.y <= z.y + z.height
      );

      if (clickedZone) {
        this.selectedZone = clickedZone;
        if (this.onZoneSelect) this.onZoneSelect(clickedZone);
      } else {
        this.selectedZone = null;
      }
    });
  }

  setViewStyle(style) {
    this.viewStyle = style; // 'blueprint', 'grid', 'heatmap'
  }

  draw() {
    this.animTime += 0.03;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Draw Base Layer
    if (this.hasBlueprint && this.blueprintImg && this.viewStyle !== 'grid') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(this.blueprintImg, 0, 0, w, h);

      // Blueprint Overlay Tint for contrast
      ctx.fillStyle = 'rgba(252, 246, 236, 0.25)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Clean paper background
      ctx.fillStyle = '#FCF6EC';
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural grid
      ctx.strokeStyle = 'rgba(130, 116, 115, 0.09)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // 2. Draw Interactive Zones
    this.zones.forEach(zone => {
      const pct = zone.capacity > 0 ? (zone.current / zone.capacity) : 0;
      const isBottleneck = pct > 0.85;
      const isSelected = this.selectedZone && this.selectedZone.id === zone.id;
      const isHovered = this.hoveredZone && this.hoveredZone.id === zone.id;

      // Pulse effect on bottlenecks
      const pulseAlpha = isBottleneck ? 0.25 + Math.sin(this.animTime * 3) * 0.12 : 0.14;

      // Clean zone overlay fill
      if (isBottleneck) {
        ctx.fillStyle = `rgba(159, 62, 65, ${pulseAlpha + (isSelected || isHovered ? 0.18 : 0)})`;
      } else if (pct > 0.70) {
        ctx.fillStyle = `rgba(217, 119, 6, ${isSelected || isHovered ? 0.28 : 0.16})`;
      } else {
        ctx.fillStyle = `rgba(45, 106, 79, ${isSelected || isHovered ? 0.22 : 0.12})`;
      }
      
      // Draw rounded rectangle for room zone
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(zone.x, zone.y, zone.width, zone.height, radius) : ctx.rect(zone.x, zone.y, zone.width, zone.height);
      ctx.fill();

      // Zone border outline
      if (isSelected) {
        ctx.strokeStyle = '#450D0D';
        ctx.lineWidth = 3;
      } else if (isHovered) {
        ctx.strokeStyle = '#9F3E41';
        ctx.lineWidth = 2.5;
      } else if (isBottleneck) {
        ctx.strokeStyle = '#9F3E41';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(69, 13, 13, 0.45)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();

      // Room Title Tag
      const tagBg = isSelected ? '#450D0D' : (isHovered ? '#9F3E41' : 'rgba(255, 255, 255, 0.95)');
      ctx.fillStyle = tagBg;
      const tagH = 17;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(zone.x + 3, zone.y + 3, zone.width - 6, tagH, 3) : ctx.rect(zone.x + 3, zone.y + 3, zone.width - 6, tagH);
      ctx.fill();

      ctx.fillStyle = (isSelected || isHovered) ? '#FFFFFF' : '#450D0D';
      ctx.font = 'bold 9.5px "Archivo Narrow", sans-serif';
      
      const maxTextW = zone.width - 12;
      let displayName = zone.name.toUpperCase();
      if (ctx.measureText(displayName).width > maxTextW && maxTextW > 20) {
        displayName = displayName.substring(0, Math.floor(maxTextW / 6.5)) + '…';
      }
      ctx.fillText(displayName, zone.x + 6, zone.y + 15);

      // Status Pill (Percentage & Count)
      const statusBg = isBottleneck ? '#9F3E41' : (pct > 0.70 ? '#D97706' : '#2D6A4F');
      ctx.fillStyle = statusBg;
      const badgeW = Math.min(zone.width - 8, 56);
      const badgeH = 13;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(zone.x + 4, zone.y + zone.height - badgeH - 3, badgeW, badgeH, 3) : ctx.rect(zone.x + 4, zone.y + zone.height - badgeH - 3, badgeW, badgeH);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8.5px "Archivo Narrow", sans-serif';
      ctx.fillText(`${Math.round(pct * 100)}% FULL`, zone.x + 6, zone.y + zone.height - 5);
    });

    // 3. Draw Crowd Particles (Flow Simulation)
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      const zone = this.zones.find(z => z.id === p.zoneId);
      if (zone) {
        if (p.x < zone.x + 4 || p.x > zone.x + zone.width - 4) p.vx *= -1;
        if (p.y < zone.y + 20 || p.y > zone.y + zone.height - 16) p.vy *= -1;
      }

      const isHighTraffic = zone && (zone.current / zone.capacity > 0.82);

      // Particle Outer Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHighTraffic ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isHighTraffic ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.35)';
      ctx.fill();

      // Particle Core Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHighTraffic ? 2.2 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = isHighTraffic ? '#B91C1C' : '#047857';
      ctx.fill();
    });

    // 4. Visitor Wayfinding Route
    if (this.mode === 'visitor' && this.zones.length >= 2) {
      const zGate  = this.zones.find(z => z.name.includes('Gate') || z.id.includes('gate')) || this.zones[this.zones.length - 1];
      const zQuad  = this.zones.find(z => z.name.includes('Quad') || z.id.includes('quad')) || this.zones[0];
      const zDest  = this.zones.find(z => z.name.includes('Sports') || z.name.includes('Innovation') || z.name.includes('Canteen')) || this.zones[1];

      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#F98383';
      ctx.lineWidth = 3.5;
      ctx.moveTo(zGate.x + zGate.width / 2, zGate.y + zGate.height / 2);
      ctx.lineTo(zQuad.x + zQuad.width / 2, zQuad.y + zQuad.height / 2);
      ctx.lineTo(zDest.x + zDest.width / 2, zDest.y + zDest.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoint Pulse Node
      ctx.beginPath();
      ctx.arc(zQuad.x + zQuad.width / 2, zQuad.y + zQuad.height / 2, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#450D0D'; ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  startAnimation() {
    const loop = () => {
      this.draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  stopAnimation() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
};
