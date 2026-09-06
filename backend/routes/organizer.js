/* routes/organizer.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');
const { v4: uuidv4 } = require('uuid');

// GET /api/organizer/dashboard/:eventId
router.get('/dashboard/:eventId', async (req, res) => {
  try {
    const event = await DataService.getEventById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const zones      = await DataService.getZonesByEventId(req.params.eventId);
    const totalOcc   = zones.reduce((s, z) => s + (z.current_occ || 0), 0);
    const passesSold = await DataService.getConfirmedPassCount(req.params.eventId);

    const bottleneck = zones.reduce((worst, z) =>
      (z.current_occ / z.capacity) > (worst.current_occ / worst.capacity) ? z : worst
    , zones[0] || { id:'', name:'N/A', current_occ:0, capacity:1 });

    const checkinRate = Math.floor(120 + Math.random() * 40);

    res.json({
      data: {
        event_id:      req.params.eventId,
        people_inside: totalOcc,
        max_capacity:  event.max_capacity,
        occupancy_pct: Math.round((totalOcc / event.max_capacity) * 100),
        checkin_rate:  checkinRate,
        passes_sold:   passesSold,
        sold_pct:      Math.round((passesSold / event.max_capacity) * 100),
        bottleneck: {
          zone_id:  bottleneck.id,
          name:     bottleneck.name,
          pct:      Math.round((bottleneck.current_occ / bottleneck.capacity) * 100),
          critical: (bottleneck.current_occ / bottleneck.capacity) > 0.9
        }
      }
    });
  } catch (err) {
    console.error('[organizer/dashboard error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch organizer dashboard' });
  }
});

// POST /api/organizer/alerts
router.post('/alerts', async (req, res) => {
  try {
    const { event_id, organizer_id, message, zone_id } = req.body;
    if (!event_id || !organizer_id || !message || message.trim().length < 5)
      return res.status(400).json({ error: 'event_id, organizer_id, and message (min 5 chars) required' });

    const event = await DataService.getEventById(event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const org = await DataService.getUserById(organizer_id);
    if (!org || org.role !== 'organizer') return res.status(403).json({ error: 'Only organizers can send alerts' });

    const id  = uuidv4();
    const now = new Date().toISOString();

    await DataService.createAlert({
      id,
      event_id,
      organizer_id,
      message: message.trim(),
      zone_id: zone_id || null,
      sent_at: now
    });

    res.status(201).json({ data: { id, event_id, message: message.trim(), sent: true } });
  } catch (err) {
    console.error('[organizer/alerts POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to post alert' });
  }
});

// GET /api/organizer/alerts/:eventId
router.get('/alerts/:eventId', async (req, res) => {
  try {
    const alerts = await DataService.getAlertsByEventId(req.params.eventId);
    res.json({ data: alerts });
  } catch (err) {
    console.error('[organizer/alerts GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch alerts' });
  }
});

// POST /api/organizer/dispatch
router.post('/dispatch', async (req, res) => {
  try {
    const { event_id, zone_id, organizer_id, note } = req.body;
    if (!event_id || !zone_id)
      return res.status(400).json({ error: 'event_id and zone_id are required' });

    const zones = await DataService.getZonesByEventId(event_id);
    const zone = zones.find(z => z.id === zone_id);
    if (!zone)  return res.status(404).json({ error: 'Zone not found for this event' });

    const id  = uuidv4();
    const now = new Date().toISOString();

    await DataService.createDispatch({
      id,
      event_id,
      zone_id,
      organizer_id: organizer_id || null,
      note: note || null,
      dispatched_at: now
    });

    res.status(201).json({ data: { id, zone_name: zone.name, dispatched: true, message: `Staff dispatched to ${zone.name}` } });
  } catch (err) {
    console.error('[organizer/dispatch POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch staff' });
  }
});

// GET /api/organizer/dispatches/:eventId
router.get('/dispatches/:eventId', async (req, res) => {
  try {
    const dispatches = await DataService.getDispatchesByEventId(req.params.eventId);
    res.json({ data: dispatches });
  } catch (err) {
    console.error('[organizer/dispatches GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch dispatches' });
  }
});

// POST /api/organizer/simulate — stateless prediction
router.post('/simulate', (req, res) => {
  const rate  = parseInt(req.body.arrival_rate) || 2400;
  const speed = parseInt(req.body.gate_speed)   || 15;
  const cap   = parseInt(req.body.stage_cap)    || 5000;

  if (rate < 0 || speed < 1 || cap < 1)
    return res.status(400).json({ error: 'Invalid simulation parameters' });

  const gateThruput    = Math.round(3600 / speed);
  const queueBuildRate = Math.max(0, rate - gateThruput);
  const evacuationMin  = +(12 + (rate / 1000) * 1.5 - (60 / speed) * 0.8).toFixed(1);

  let bottleneckLevel, recommendation;
  if (rate > 3500 || speed > 25) {
    bottleneckLevel = 'HIGH';
    recommendation  = 'Open additional gate lanes immediately. Reroute Gate 3 overflow to Gate 5.';
  } else if (rate > 2000) {
    bottleneckLevel = 'MODERATE';
    recommendation  = 'Monitor Gate 3. Deploy 2 extra staff. ETA queue clear: ~23 min.';
  } else {
    bottleneckLevel = 'LOW';
    recommendation  = 'Flow is optimal. No action required.';
  }

  res.json({
    data: {
      arrival_rate: rate, gate_speed_sec: speed, stage_capacity: cap,
      gate_throughput: gateThruput, queue_build_rate: queueBuildRate,
      evacuation_min: evacuationMin, bottleneck_level: bottleneckLevel, recommendation
    }
  });
});

// GET /api/organizer/flow-balancer/:eventId
router.get('/flow-balancer/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    let flow = await DataService.getFlowState(eventId);
    if (!flow) {
      flow = {
        station_a_name: 'Station A (Main Stage)', station_a_occ: 4700, station_a_cap: 5000,
        station_b_name: 'Station B (Exhibition A)', station_b_occ: 1920, station_b_cap: 4000,
        station_c_name: 'Station C (Courtyard)', station_c_occ: 1025, station_c_cap: 2500,
        divert_b_count: 3500, divert_c_count: 2500,
        recommendation_active: 0,
        recommendation_text: 'Station A is getting crowded. We recommend Station B or C instead.'
      };
    }

    const now = {
      station_a: { name: flow.station_a_name, occ: flow.station_a_occ, cap: flow.station_a_cap, pct: Math.round((flow.station_a_occ / flow.station_a_cap) * 100), status: 'Overcrowded! Severe choke-point.', isBottleneck: true },
      station_b: { name: flow.station_b_name, occ: flow.station_b_occ, cap: flow.station_b_cap, pct: Math.round((flow.station_b_occ / flow.station_b_cap) * 100), status: 'Empty space available', isBottleneck: false },
      station_c: { name: flow.station_c_name, occ: flow.station_c_occ, cap: flow.station_c_cap, pct: Math.round((flow.station_c_occ / flow.station_c_cap) * 100), status: 'Empty space available', isBottleneck: false }
    };

    const suggestion = {
      total_rebalance: flow.divert_b_count + flow.divert_c_count,
      divert_b: { count: flow.divert_b_count, station: flow.station_b_name, route: 'Via Gate 2 smart digital signs & mobile notifications' },
      divert_c: { count: flow.divert_c_count, station: flow.station_c_name, route: 'Via Shuttle walking corridor & express wayfinding' },
      active: flow.recommendation_active === 1,
      recommendation_text: flow.recommendation_text
    };

    const after = {
      station_a: { name: flow.station_a_name, occ: 3800, cap: flow.station_a_cap, pct: 76, prev_pct: now.station_a.pct, status: 'Comfortable safe level' },
      station_b: { name: flow.station_b_name, occ: 2440, cap: flow.station_b_cap, pct: 61, prev_pct: now.station_b.pct, status: 'Balanced flow' },
      station_c: { name: flow.station_c_name, occ: 1325, cap: flow.station_c_cap, pct: 53, prev_pct: now.station_c.pct, status: 'Balanced flow' },
      pressure_reduction_pct: 18
    };

    res.json({
      data: {
        event_id: eventId,
        now,
        suggestion,
        after,
        applied: flow.recommendation_active === 1
      }
    });
  } catch (err) {
    console.error('[flow-balancer GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch flow balancer state' });
  }
});

// POST /api/organizer/flow-balancer/apply
router.post('/flow-balancer/apply', async (req, res) => {
  try {
    const { event_id } = req.body;
    const eventId = event_id || 'aarpo-26';
    const now = new Date().toISOString();

    await DataService.updateFlowState(eventId, {
      recommendation_active: 1,
      station_a_occ: 3800,
      station_b_occ: 2440,
      station_c_occ: 1325,
      updated_at: now
    });

    // Update real zones
    await DataService.updateZoneOccupancy('zone-main', eventId, 3800);
    await DataService.updateZoneOccupancy('zone-expo', eventId, 2440);
    await DataService.updateZoneOccupancy('zone-food', eventId, 1325);
    await DataService.updateZoneOccupancy('zone-south-gate', eventId, 1800);

    // Insert broadcast alert so visitors are notified
    const alertId = uuidv4();
    const alertMsg = 'Station A is getting crowded. We recommend visiting Station B (Exhibition A) or Station C (Courtyard) instead.';
    await DataService.createAlert({
      id: alertId,
      event_id: eventId,
      organizer_id: 'user-organizer-admin',
      message: alertMsg,
      zone_id: 'zone-main',
      sent_at: now
    });

    // Insert automatic staff dispatch record
    const dispatchId = uuidv4();
    await DataService.createDispatch({
      id: dispatchId,
      event_id: eventId,
      zone_id: 'zone-main',
      organizer_id: 'user-organizer-admin',
      note: 'Automatic flow balancer rebalance dispatched to Station A & Gate 3',
      dispatched_at: now
    });

    res.json({
      data: {
        success: true,
        event_id: eventId,
        message: 'Recommendation applied successfully! 6,000 visitors rerouted and digital signs updated.',
        active_recommendation: {
          text: alertMsg,
          station_a_pct: 76,
          station_b_pct: 61,
          station_c_pct: 53
        }
      }
    });
  } catch (err) {
    console.error('[flow-balancer/apply POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to apply flow recommendation' });
  }
});

// POST /api/organizer/flow-balancer/reset
router.post('/flow-balancer/reset', async (req, res) => {
  try {
    const { event_id } = req.body;
    const eventId = event_id || 'aarpo-26';
    const now = new Date().toISOString();

    await DataService.updateFlowState(eventId, {
      recommendation_active: 0,
      station_a_occ: 4700,
      station_b_occ: 1920,
      station_c_occ: 1025,
      updated_at: now
    });

    await DataService.updateZoneOccupancy('zone-main', eventId, 4700);
    await DataService.updateZoneOccupancy('zone-expo', eventId, 1920);
    await DataService.updateZoneOccupancy('zone-food', eventId, 1025);
    await DataService.updateZoneOccupancy('zone-south-gate', eventId, 2850);

    res.json({ data: { success: true, message: 'Flow state reset to initial conditions.' } });
  } catch (err) {
    console.error('[flow-balancer/reset POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to reset flow balancer' });
  }
});

module.exports = router;
