/* routes/journey.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');

// POST /api/journey/plan
router.post('/plan', async (req, res) => {
  try {
    const { user_id, event_id, start_zone, destination_session, avoid_crowds } = req.body;
    const eventId = event_id || 'aarpo-26';

    const event = await DataService.getEventById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let session = null;
    if (destination_session) {
      session = await DataService.getSessionById(destination_session);
    } else {
      const sessions = await DataService.getSessionsByEventId(eventId);
      session = sessions[0] || null;
    }

    const flow = (await DataService.getFlowState(eventId)) || { recommendation_active: 0 };
    const isRebalanced = flow.recommendation_active === 1;

    let steps = [];
    let etaMinutes = 6;
    let recommendedRouteTitle = 'Primary Fast Corridor';
    let crowdWarning = null;
    let alternateSuggested = false;

    const sessionTitle = session ? session.title : 'Keynote Session';
    const sessionStage = session ? session.stage : 'Main Auditorium';

    if (isRebalanced) {
      alternateSuggested = true;
      recommendedRouteTitle = 'Smart Flow Route via Station B & Courtyard';
      etaMinutes = 4;
      crowdWarning = 'Station A is busy (76%). Rerouting via Station B & Courtyard to save 3 mins.';
      steps = [
        { step: 1, title: 'Depart Gate 3 Concourse', detail: 'Proceed North towards Gate 2 digital sign array', duration_sec: 60, icon: 'directions_walk', status: 'normal' },
        { step: 2, title: 'Follow Smart Wayfinding to Station B', detail: 'Take the open Exhibition A walking corridor (48% capacity)', duration_sec: 120, icon: 'alt_route', status: 'recommended' },
        { step: 3, title: 'Cross Culinary Courtyard (Station C)', detail: 'Pass the Courtyard central fountain towards Studio B link', duration_sec: 90, icon: 'local_cafe', status: 'normal' },
        { step: 4, title: 'Arrive at ' + sessionStage, detail: 'Check-in with digital pass for ' + sessionTitle, duration_sec: 30, icon: 'check_circle', status: 'destination' }
      ];
    } else {
      crowdWarning = 'Station A is currently at 94% capacity. Expect moderate check-in queues at Door 2.';
      steps = [
        { step: 1, title: 'Depart South Concourse & Gate 3', detail: 'Walk North past Food Court (2 min)', duration_sec: 120, icon: 'directions_walk', status: 'normal' },
        { step: 2, title: 'Enter Main Auditorium Concourse', detail: 'Turn Right into Station A Main Hall', duration_sec: 120, icon: 'turn_right', status: 'warning' },
        { step: 3, title: 'Arrive at ' + sessionStage, detail: 'Doors open · Present digital pass at Door 2', duration_sec: 60, icon: 'meeting_room', status: 'destination' }
      ];
    }

    const journeyId = 'JRN-' + Math.floor(10000 + Math.random() * 90000);
    const now = new Date().toISOString();

    if (user_id) {
      await DataService.createJourney({
        id: journeyId,
        user_id,
        event_id: eventId,
        start_zone: start_zone || 'zone-south-gate',
        destination_session: session ? session.id : 's1',
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
        session: session || { title: 'General Event Walkthrough', stage: 'Main Stage' },
        route_title: recommendedRouteTitle,
        eta_minutes: etaMinutes,
        steps,
        crowd_warning: crowdWarning,
        alternate_suggested: alternateSuggested,
        flow_rebalanced: isRebalanced
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
