/* routes/passes.js */
const express = require('express');
const router  = express.Router();
const DataService = require('../db/dataService');

router.post('/', async (req, res) => {
  try {
    const { user_id, event_id, pass_type } = req.body;
    if (!user_id || !event_id)
      return res.status(400).json({ error: 'user_id and event_id are required' });

    const user = await DataService.getUserById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const event = await DataService.getEventById(event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'sold_out') return res.status(409).json({ error: 'Event is sold out' });

    const dup = await DataService.findExistingPass(user_id, event_id);
    if (dup) return res.status(409).json({ error: 'Pass already issued for this event' });

    const passId = `PASS-${Math.floor(10000 + Math.random() * 90000)}`;
    const now    = new Date().toISOString();

    await DataService.createPass({
      id: passId,
      user_id,
      event_id,
      pass_type: pass_type || 'Standard Summit Access',
      valid_dates: event.date_label,
      status: 'confirmed',
      issued_at: now
    });

    const pass = await DataService.getPassById(passId);
    res.status(201).json({ data: pass });
  } catch (err) {
    console.error('[passes POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to issue pass' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pass = await DataService.getPassById(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Pass not found' });
    res.json({ data: pass });
  } catch (err) {
    console.error('[passes/:id GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch pass' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pass = await DataService.getPassById(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Pass not found' });
    await DataService.cancelPass(req.params.id);
    res.json({ data: { id: req.params.id, status: 'cancelled' } });
  } catch (err) {
    console.error('[passes/:id DELETE error]', err);
    res.status(500).json({ error: err.message || 'Failed to cancel pass' });
  }
});

module.exports = router;
