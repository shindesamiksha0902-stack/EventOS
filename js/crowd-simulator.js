/* EVENTOS Predictive Crowd Simulator Engine */
window.CrowdSimulatorEngine = class CrowdSimulatorEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.arrivalRate = options.arrivalRate || 2400; // attendees per hr
    this.gateSpeed = options.gateSpeed || 15; // sec per person
    this.stageCap = options.stageCap || 5000; // max capacity

    this.isRunning = false;
    this.timeElapsed = 0;
    this.evacuationTime = 14.2; // mins
    this.bottleneckLevel = 'Moderate (23m wait)';

    this.agents = [];
    this.initAgents();
    this.draw();
  }

  setParameters(arrivalRate, gateSpeed, stageCap) {
    this.arrivalRate = parseInt(arrivalRate);
    this.gateSpeed = parseInt(gateSpeed);
    this.stageCap = parseInt(stageCap);

    // Calculate evacuation time based on parameters
    this.evacuationTime = (12 + (this.arrivalRate / 1000) * 1.5 - (60 / this.gateSpeed) * 0.8).toFixed(1);
    if (this.arrivalRate > 3500 || this.gateSpeed > 25) {
      this.bottleneckLevel = 'HIGH (42m wait - Reroute Recommended)';
    } else if (this.arrivalRate > 2000) {
      this.bottleneckLevel = 'Moderate (23m wait)';
    } else {
      this.bottleneckLevel = 'Low (<8m wait)';
    }

    this.initAgents();
    if (!this.isRunning) this.draw();
  }

  initAgents() {
    this.agents = [];
    const count = Math.min(120, Math.floor(this.arrivalRate / 25));
    for (let i = 0; i < count; i++) {
      this.agents.push({
        x: Math.random() * (this.canvas.width - 40) + 20,
        y: Math.random() * (this.canvas.height - 40) + 20,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        color: Math.random() > 0.3 ? '#9F3E41' : '#2D6A4F'
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  pause() {
    this.isRunning = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  reset() {
    this.pause();
    this.timeElapsed = 0;
    this.initAgents();
    this.draw();
  }

  loop() {
    if (!this.isRunning) return;
    this.timeElapsed += 0.05;
    this.update();
    this.draw();
    this.animFrame = requestAnimationFrame(() => this.loop());
  }

  update() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const speedMultiplier = 60 / this.gateSpeed;

    this.agents.forEach(a => {
      a.x += a.vx * speedMultiplier;
      a.y += a.vy * speedMultiplier;

      if (a.x < 15 || a.x > w - 15) a.vx *= -1;
      if (a.y < 15 || a.y > h - 15) a.vy *= -1;
    });
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Canvas background
    ctx.fillStyle = '#1A1414';
    ctx.fillRect(0, 0, w, h);

    // Grid overlays
    ctx.strokeStyle = 'rgba(249, 131, 131, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Gate entry corridor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(20, h / 2 - 40, 100, 80);
    ctx.strokeStyle = '#F98383';
    ctx.strokeRect(20, h / 2 - 40, 100, 80);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px "Archivo Narrow"';
    ctx.fillText('ENTRY GATE 3', 30, h / 2 - 48);

    // Auditorium chamber
    ctx.fillStyle = 'rgba(159, 62, 65, 0.15)';
    ctx.fillRect(w - 200, 40, 170, h - 80);
    ctx.strokeStyle = '#9F3E41';
    ctx.strokeRect(w - 200, 40, 170, h - 80);
    ctx.fillStyle = '#F98383';
    ctx.fillText('MAIN AUDITORIUM', w - 190, 30);

    // Agents
    this.agents.forEach(a => {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
    });

    // Telemetry HUD overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 240, 45);
    ctx.fillStyle = '#00FFCC';
    ctx.font = 'bold 11px "Archivo Narrow"';
    ctx.fillText(`SIM TIME: T+${Math.floor(this.timeElapsed)}s`, 20, 28);
    ctx.fillText(`EST EVACUATION: ${this.evacuationTime} mins`, 20, 44);
  }
};
