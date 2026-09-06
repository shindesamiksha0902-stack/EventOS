/* js/spatial-map.js — Dynamic Event-Driven Spatial Map Engine with Blueprint Support */
window.SpatialMapEngine = class SpatialMapEngine {
  constructor(canvasId, options = {}) {
    if (window._activeSpatialEngine && typeof window._activeSpatialEngine.stopAnimation === 'function') {
      window._activeSpatialEngine.stopAnimation();
    }
    window._activeSpatialEngine = this;

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
    this._isRunning = true;

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
      : 'blueprint_ground_floor.jpg';

    this.blueprintImg = new Image();
    this.blueprintImg.crossOrigin = 'anonymous';
    this.blueprintImg.onload = () => {
      this.hasBlueprint = true;
    };
    this.blueprintImg.onerror = () => {
      if (imgSrc !== 'blueprint_ground_floor.jpg') {
        this.blueprintImg.src = 'blueprint_ground_floor.jpg';
      } else {
        this.hasBlueprint = false;
      }
    };
    this.blueprintImg.src = imgSrc;

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

    // Mobile touch support
    this.canvas.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches.length) return;
      const touch = e.touches[0];
      const pos = getPos(touch);
      const clickedZone = this.zones.find(z => 
        pos.x >= z.x && pos.x <= z.x + z.width &&
        pos.y >= z.y && pos.y <= z.y + z.height
      );

      if (clickedZone) {
        this.selectedZone = clickedZone;
        this.hoveredZone = clickedZone;
        if (this.onZoneSelect) this.onZoneSelect(clickedZone);
      }
    }, { passive: true });
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

    // 4. Visitor Dynamic Wayfinding Route
    if (this.mode === 'visitor' && this.zones.length >= 2) {
      const activeJourney = window.app && window.app.visitor && window.app.visitor.activeJourney;

      let zStart = null;
      let zDest  = null;
      let zInter = null;

      if (activeJourney && activeJourney.waypoints && activeJourney.waypoints.length >= 2) {
        const wpStart = activeJourney.waypoints[0];
        const wpInter = activeJourney.waypoints.length >= 3 ? activeJourney.waypoints[1] : null;
        const wpDest  = activeJourney.waypoints[activeJourney.waypoints.length - 1];

        zStart = this.zones.find(z => z.id === wpStart.id || z.name.toLowerCase().includes(wpStart.name.toLowerCase()));
        if (wpInter) {
          zInter = this.zones.find(z => z.id === wpInter.id || z.name.toLowerCase().includes(wpInter.name.toLowerCase()));
        }
        zDest  = this.zones.find(z => z.id === wpDest.id || z.name.toLowerCase().includes(wpDest.name.toLowerCase()));
      }

      // If not from active journey, fallback to selected zone or gates
      if (!zStart) {
        zStart = this.zones.find(z => z.name.toLowerCase().includes('gate') || z.name.toLowerCase().includes('entry')) || this.zones[this.zones.length - 1];
      }
      if (!zDest) {
        zDest = this.selectedZone || this.zones.find(z => z.id !== zStart.id && !z.name.toLowerCase().includes('gate')) || this.zones[0];
      }

      if (zStart && zDest && zStart.id !== zDest.id) {
        const sX = zStart.x + zStart.width / 2;
        const sY = zStart.y + zStart.height / 2;
        const dX = zDest.x + zDest.width / 2;
        const dY = zDest.y + zDest.height / 2;

        let mX = (sX + dX) / 2;
        let mY = (sY + dY) / 2;

        if (zInter) {
          mX = zInter.x + zInter.width / 2;
          mY = zInter.y + zInter.height / 2;
        } else {
          // Find closest intermediate zone center
          let bestDist = Infinity;
          this.zones.forEach(z => {
            if (z.id !== zStart.id && z.id !== zDest.id) {
              const cx = z.x + z.width / 2;
              const cy = z.y + z.height / 2;
              const dist = Math.hypot(cx - mX, cy - mY);
              if (dist < bestDist) {
                bestDist = dist;
                zInter = z;
                mX = cx;
                mY = cy;
              }
            }
          });
        }

        // A. Route Outer Halo
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(159, 62, 65, 0.22)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(sX, sY);
        if (zInter) ctx.lineTo(mX, mY);
        ctx.lineTo(dX, dY);
        ctx.stroke();

        // B. Animated Dotted Walking Line
        ctx.beginPath();
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -this.animTime * 16;
        ctx.strokeStyle = '#9F3E41';
        ctx.lineWidth = 3.5;
        ctx.moveTo(sX, sY);
        if (zInter) ctx.lineTo(mX, mY);
        ctx.lineTo(dX, dY);
        ctx.stroke();
        ctx.setLineDash([]);

        // C. Start Pin (Green Node)
        ctx.beginPath();
        ctx.arc(sX, sY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2D6A4F'; ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#2D6A4F';
        ctx.font = 'bold 9px "Archivo Narrow", sans-serif';
        ctx.fillText('START', sX - 12, sY - 9);

        // D. Waypoint Node (if applicable)
        if (zInter) {
          ctx.beginPath();
          ctx.arc(mX, mY, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#D97706'; ctx.fill();
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke();
        }

        // E. Destination Pin (Pulsing Red Marker)
        const pulse = 6 + Math.sin(this.animTime * 4) * 2;
        ctx.beginPath();
        ctx.arc(dX, dY, pulse + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(159, 62, 65, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dX, dY, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#450D0D'; ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#450D0D';
        ctx.font = 'bold 9px "Archivo Narrow", sans-serif';
        ctx.fillText('DESTINATION', dX - 22, dY - 10);
      }
    }
  }

  startAnimation() {
    let lastTime = 0;
    const loop = (time) => {
      if (!this._isRunning) return;
      if (!this.canvas || !this.canvas.isConnected) {
        this.stopAnimation();
        return;
      }
      // Cap at ~40 FPS for super smooth battery-friendly performance
      if (time - lastTime >= 24) {
        lastTime = time;
        this.draw();
      }
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stopAnimation() {
    this._isRunning = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }
};
