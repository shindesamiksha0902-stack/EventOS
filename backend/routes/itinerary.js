/* routes/itinerary.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');

router.get('/:userId', async (req, res) => {
  try {
    const user = await DataService.getUserById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const items = await DataService.getItineraryByUserId(req.params.userId);
    res.json({ data: items });
  } catch (err) {
    console.error('[itinerary GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch itinerary' });
  }
});

router.post('/:userId/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const user = await DataService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const session = await DataService.getSessionById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const exists = await DataService.hasItineraryItem(userId, sessionId);
    if (exists) return res.status(409).json({ error: 'Session already in itinerary' });

    const result = await DataService.addItineraryItem(userId, sessionId);
    res.status(201).json({ data: result });
  } catch (err) {
    console.error('[itinerary POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to add itinerary item' });
  }
});

router.delete('/:userId/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const exists = await DataService.hasItineraryItem(userId, sessionId);
    if (!exists) return res.status(404).json({ error: 'Item not in itinerary' });

    const result = await DataService.removeItineraryItem(userId, sessionId);
    res.json({ data: result });
  } catch (err) {
    console.error('[itinerary DELETE error]', err);
    res.status(500).json({ error: err.message || 'Failed to remove itinerary item' });
  }
});

module.exports = router;
