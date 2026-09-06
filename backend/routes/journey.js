/* routes/journey.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');

// POST /api/journey/plan
router.post('/plan', async (req, res) => {
  try {
    const { user_id, event_id, start_zone, destination_session } = req.body;
    const eventId = event_id || 'aarpo-26';

    const event = await DataService.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const zones = (await DataService.getZonesByEventId(eventId)) || [];

    // Resolve start zone
    let startObj = zones.find(z => z.id === start_zone) || 
                   zones.find(z => z.name.toLowerCase().includes('gate') || z.name.toLowerCase().includes('entry')) || 
                   zones[0] || 
                   { id: 'start', name: 'Main Entry Gate', x: 430, y: 415, width: 110, height: 50 };

    // Resolve destination zone
    let destObj = zones.find(z => z.id === destination_session) || 
                  zones.find(z => z.name.toLowerCase().includes('quad') || z.name.toLowerCase().includes('stage')) || 
                  zones[1] || 
                  { id: 'dest', name: 'Main Auditorium', x: 155, y: 125, width: 230, height: 110 };

    const startClean = startObj.name.split('(')[0].trim();
    const destClean  = destObj.name.split('(')[0].trim();

    // Find best intermediate corridor / zone
    const startX = (startObj.x || 100) + (startObj.width || 100) / 2;
    const startY = (startObj.y || 100) + (startObj.height || 80) / 2;
    const destX  = (destObj.x || 400) + (destObj.width || 100) / 2;
    const destY  = (destObj.y || 200) + (destObj.height || 80) / 2;

    const midX = (startX + destX) / 2;
    const midY = (startY + destY) / 2;

    let intermediateZone = null;
    let shortestDist = Infinity;

    zones.forEach(z => {
      if (z.id !== startObj.id && z.id !== destObj.id) {
        const zCenterX = (z.x || 0) + (z.width || 100) / 2;
        const zCenterY = (z.y || 0) + (z.height || 80) / 2;
        const dist = Math.hypot(zCenterX - midX, zCenterY - midY);
        if (dist < shortestDist) {
          shortestDist = dist;
          intermediateZone = z;
        }
      }
    });

    if (!intermediateZone) {
      intermediateZone = zones.find(z => z.id !== startObj.id && z.id !== destObj.id) || { name: 'Central Concourse', current_occ: 500, capacity: 1000 };
    }

    const intermediateClean = intermediateZone.name.split('(')[0].trim();
    const intermediateOcc   = intermediateZone.current_occ || Math.round((intermediateZone.capacity || 1000) * 0.5);
    const intermediateCap   = intermediateZone.capacity || 1000;
    const intermediatePct   = Math.round((intermediateOcc / intermediateCap) * 100);

    const isBusy = intermediatePct >= 80;
    const distPx = Math.hypot(destX - startX, destY - startY);
    const etaMinutes = Math.max(1, Math.min(6, Math.round(distPx / 110) + (isBusy ? 1 : 0)));

    const steps = [
      {
        step: 1,
        title: `Depart from ${startClean}`,
        detail: `Proceed past entrance towards the main indoor walking aisle`,
        duration_sec: 60,
        icon: 'directions_walk',
        status: 'normal',
        zone_id: startObj.id
      },
      {
        step: 2,
        title: `Pass through ${intermediateClean}`,
        detail: isBusy 
          ? `High density alert (${intermediatePct}% full). Follow side corridor markers.`
          : `Corridor clear (${intermediatePct}% capacity). Maintain direct walking pace.`,
        duration_sec: 90,
        icon: 'alt_route',
        status: isBusy ? 'warning' : 'recommended',
        zone_id: intermediateZone.id
      },
      {
        step: 3,
        title: `Arrive at ${destClean}`,
        detail: `Welcome to ${destClean}. Present digital QR pass at room entrance.`,
        duration_sec: 45,
        icon: 'check_circle',
        status: 'destination',
        zone_id: destObj.id
      }
    ];

    const waypoints = [
      { id: startObj.id, name: startClean, x: startX, y: startY },
      { id: intermediateZone.id, name: intermediateClean, x: (intermediateZone.x || midX) + (intermediateZone.width || 100) / 2, y: (intermediateZone.y || midY) + (intermediateZone.height || 80) / 2, pct: intermediatePct },
      { id: destObj.id, name: destClean, x: destX, y: destY }
    ];

    const journeyId = 'JRN-' + Math.floor(10000 + Math.random() * 90000);
    const now = new Date().toISOString();

    if (user_id) {
      await DataService.createJourney({
        id: journeyId,
        user_id,
        event_id: eventId,
        start_zone: startObj.id,
        destination_session: destObj.id,
        route_steps_json: JSON.stringify(steps),
        eta_minutes: etaMinutes,
        status: 'active',
        created_at: now
      });
    }

    res.json({
      data: {
        journey_id: journeyId,
        event_id: eventId,
        route_title: `Optimal Route: ${startClean} → ${destClean}`,
        eta_minutes: etaMinutes,
        steps,
        waypoints,
        start_zone: startObj,
        dest_zone: destObj,
        crowd_warning: isBusy ? `${intermediateClean} is reaching high density (${intermediatePct}%). Rerouted via open corridor.` : null,
        alternate_suggested: isBusy
      }
    });
  } catch (err) {
    console.error('[journey/plan POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to plan journey' });
  }
});

// GET /api/journey/:userId/:eventId
router.get('/:userId/:eventId', async (req, res) => {
  try {
    const { userId, eventId } = req.params;
    const journeys = await DataService.getJourneysByUser(userId, eventId);
    res.json({ data: journeys });
  } catch (err) {
    console.error('[journey GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch journeys' });
  }
});

module.exports = router;
