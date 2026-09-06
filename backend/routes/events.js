/* routes/events.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');

// GET /api/events?category=Architecture
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const events = await DataService.getEvents(category);
    res.json({ data: events });
  } catch (err) {
    console.error('[events GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch events' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await DataService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const sessions = await DataService.getSessionsByEventId(req.params.id);
    const zones    = await DataService.getZonesByEventId(req.params.id);
    res.json({ data: { ...event, sessions, zones } });
  } catch (err) {
    console.error('[events/:id GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch event details' });
  }
});

// GET /api/events/:id/zones — live zone telemetry with ±2% drift
router.get('/:id/zones', async (req, res) => {
  try {
    const zones = await DataService.getZonesByEventId(req.params.id);
    if (!zones.length) return res.status(404).json({ error: 'No zones found for event' });

    const live = zones.map(z => {
      const drift = Math.floor((Math.random() - 0.5) * z.capacity * 0.02);
      const occ   = Math.max(0, Math.min(z.capacity, z.current_occ + drift));
      return { ...z, current_occ: occ, pct: Math.round((occ / z.capacity) * 100) };
    });
    res.json({ data: live });
  } catch (err) {
    console.error('[events/:id/zones GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch zones' });
  }
});

// POST/PUT /api/events/:id/zones — Save/replace custom zones for event
router.post('/:id/zones', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { zones } = req.body;
    if (!Array.isArray(zones)) return res.status(400).json({ error: 'Zones array is required' });
    const saved = await DataService.replaceEventZones(eventId, zones);
    res.json({ data: { success: true, zones: saved } });
  } catch (err) {
    console.error('[events/:id/zones POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to save zones' });
  }
});

router.put('/:id/zones', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { zones } = req.body;
    if (!Array.isArray(zones)) return res.status(400).json({ error: 'Zones array is required' });
    const saved = await DataService.replaceEventZones(eventId, zones);
    res.json({ data: { success: true, zones: saved } });
  } catch (err) {
    console.error('[events/:id/zones PUT error]', err);
    res.status(500).json({ error: err.message || 'Failed to save zones' });
  }
});

// GET /api/events/:id/live-state — unified live telemetry for Visitors & Organizers
router.get('/:id/live-state', async (req, res) => {
  try {
    const eventId = req.params.id;
    const event   = await DataService.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const rawZones = await DataService.getZonesByEventId(eventId);
    const zones = rawZones.map(z => ({
      ...z,
      pct: Math.round((z.current_occ / z.capacity) * 100),
      isBottleneck: (z.current_occ / z.capacity) > 0.9
    }));

    const flow = (await DataService.getFlowState(eventId)) || {
      recommendation_active: 0,
      recommendation_text: ''
    };

    const latestAlert = await DataService.getLatestAlert(eventId);
    const totalOcc = zones.reduce((s, z) => s + (z.current_occ || 0), 0);

    res.json({
      data: {
        event_id: eventId,
        title: event.title,
        total_occupancy: totalOcc,
        max_capacity: event.max_capacity,
        occupancy_pct: Math.round((totalOcc / event.max_capacity) * 100),
        zones,
        flow_recommendation: {
          active: flow.recommendation_active === 1,
          text: flow.recommendation_text || (flow.recommendation_active === 1 ? 'Station A is getting crowded. We recommend Station B instead.' : null),
          divert_b: flow.divert_b_count,
          divert_c: flow.divert_c_count,
          updated_at: flow.updated_at
        },
        latest_alert: latestAlert ? {
          message: latestAlert.message,
          sent_at: latestAlert.sent_at
        } : null,
        recommended_station: flow.recommendation_active === 1 ? 'Station B (Exhibition Pavilion A)' : 'Station A (Main Auditorium)'
      }
    });
  } catch (err) {
    console.error('[events/:id/live-state GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch live state' });
  }
});

// DELETE /api/events/:id — Delete an event and associated data
router.delete('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    await DataService.deleteEvent(eventId);
    res.json({ data: { success: true, id: eventId } });
  } catch (err) {
    console.error('[events/:id DELETE error]', err);
    res.status(500).json({ error: err.message || 'Failed to delete event' });
  }
});

module.exports = router;
