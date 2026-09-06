/* routes/users.js */
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const DataService = require('../db/dataService');
const { parseFileData, generateEventStructure } = require('../db/eventParser');
const { v4: uuidv4 } = require('uuid');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return testHash === hash;
}

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, address, role,
      event_name, event_id, event_location, event_date,
      start_time, end_time, location_permission,
      file_name, file_data, max_capacity
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return res.status(400).json({ error: 'Full name must be at least 2 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Valid email address is required' });
    if (!password || password.length < 4)
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (!['visitor', 'organizer'].includes(role))
      return res.status(400).json({ error: 'Role must be visitor or organizer' });

    const existing = await DataService.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const userId = uuidv4();
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();

    const newUser = await DataService.createUser({
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hash,
      password_salt: salt,
      address: address ? address.trim() : null,
      location_permission: location_permission ? 1 : 0,
      role,
      created_at: now
    });

    // Handle Event Association
    const rawEventId = event_id ? event_id.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-') : '';
    const finalEventId = rawEventId || (event_name ? event_name.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').slice(0, 20) : 'aarpo-26');
    const finalEventTitle = event_name ? event_name.trim() : (finalEventId === 'aarpo-26' ? 'AARPO World Summit 2026' : 'Custom Event');
    const finalLocation = event_location ? event_location.trim() : 'Convention Center';
    const finalDate = event_date ? event_date.trim() : 'SEP 14-16, 2026';
    const finalCapacity = parseInt(max_capacity) || 12000;

    let event = await DataService.getEventById(finalEventId);

    if (!event) {
      // Parse uploaded file if present
      const parsedFile = parseFileData(file_data, file_name);

      // Create new event with real parsed data
      event = await DataService.createEvent({
        id: finalEventId,
        title: finalEventTitle,
        subtitle: `${finalEventTitle} Experience`,
        category: 'General',
        date_label: finalDate,
        location: finalLocation,
        address: address ? address.trim() : finalLocation,
        start_time: start_time || '09:00 AM',
        end_time: end_time || '06:00 PM',
        organizer_id: role === 'organizer' ? userId : 'user-organizer-admin',
        file_name: file_name || null,
        file_data: file_data || null,
        price_cents: 15000,
        currency: 'INR',
        status: 'available',
        description: `Event managed on EVENTOS platform at ${finalLocation} with intelligent pedestrian telemetry.`,
        max_capacity: finalCapacity,
        created_at: now
      });

      // Generate real tailored sessions, zones, and flow balancer stations
      const generated = generateEventStructure(
        finalEventId,
        finalEventTitle,
        finalLocation,
        start_time,
        end_time,
        name.trim(),
        finalCapacity,
        parsedFile,
        file_name,
        file_data
      );

      const sessionsToUse = (Array.isArray(req.body.sessions) && req.body.sessions.length) ? req.body.sessions : generated.sessions;
      const zonesToUse = (Array.isArray(req.body.custom_zones) && req.body.custom_zones.length) 
        ? req.body.custom_zones 
        : ((Array.isArray(req.body.zones) && req.body.zones.length) ? req.body.zones : generated.zones);

      for (const s of sessionsToUse) {
        await DataService.createSession({ ...s, event_id: finalEventId });
      }

      for (const z of zonesToUse) {
        await DataService.createZone({ ...z, event_id: finalEventId });
      }

      await DataService.upsertFlowState(generated.flowState);
    } else if (role === 'organizer' && !event.organizer_id) {
      event = await DataService.updateEvent(finalEventId, {
        organizer_id: userId,
        file_name: file_name || event.file_name,
        file_data: file_data || event.file_data
      });
    }

    // If visitor: register for event + issue pass
    if (role === 'visitor') {
      await DataService.registerVisitorForEvent(userId, finalEventId);
      const passId = `PASS-${Math.floor(10000 + Math.random() * 90000)}`;
      await DataService.createPass({
        id: passId,
        user_id: userId,
        event_id: finalEventId,
        pass_type: 'Standard Entry Badge',
        valid_dates: finalDate,
        status: 'confirmed',
        issued_at: now
      });
    }

    res.status(201).json({
      data: {
        user: {
          id: userId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          address: address ? address.trim() : null,
          location_permission: location_permission ? 1 : 0,
          role
        },
        event
      }
    });
  } catch (err) {
    console.error('[users/register error]', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await DataService.getUserByEmail(email);
    if (!user)
      return res.status(401).json({ error: 'Account not found. Please register first.' });

    // If user has a password_hash, verify it
    if (user.password_hash && user.password_salt) {
      const valid = verifyPassword(password, user.password_salt, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const effectiveRole = role || user.role || 'visitor';
    const events = await DataService.getUserEvents(user.id, effectiveRole);
    const activeEvent = events[0] || null;

    res.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          address: user.address,
          location_permission: user.location_permission,
          role: effectiveRole
        },
        events,
        active_event: activeEvent
      }
    });
  } catch (err) {
    console.error('[users/login error]', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await DataService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passes = await DataService.getPassesByUserId(req.params.id);
    const itinerary = await DataService.getItineraryByUserId(req.params.id);
    const events = await DataService.getUserEvents(user.id, user.role);

    res.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        location_permission: user.location_permission,
        role: user.role,
        passes,
        itinerary,
        events
      }
    });
  } catch (err) {
    console.error('[users/:id error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

// GET /api/users/:id/events
router.get('/:id/events', async (req, res) => {
  try {
    const user = await DataService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const events = await DataService.getUserEvents(user.id, user.role);
    res.json({ data: events });
  } catch (err) {
    console.error('[users/:id/events error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch user events' });
  }
});

// POST /api/users/:id/events — Add another event for user with real data parsing
router.post('/:id/events', async (req, res) => {
  try {
    const userId = req.params.id;
    const { event_id, event_name, event_location, event_date, start_time, end_time, address, file_name, file_data, role, max_capacity } = req.body;
    
    const user = await DataService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const effectiveRole = role || user.role || 'visitor';
    const now = new Date().toISOString();

    let finalEventId = event_id ? event_id.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-') : '';
    if (!finalEventId && event_name) {
      finalEventId = event_name.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').slice(0, 20);
    }

    let event = await DataService.getEventById(finalEventId);

    if (!event) {
      if (!event_name) return res.status(400).json({ error: 'Event name or valid Event ID is required' });
      finalEventId = finalEventId || `ev-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalCapacity = parseInt(max_capacity) || 12000;

      // Parse uploaded file if present
      const parsedFile = parseFileData(file_data, file_name);

      event = await DataService.createEvent({
        id: finalEventId,
        title: event_name.trim(),
        subtitle: `${event_name.trim()} Experience`,
        category: 'General',
        date_label: event_date || 'Upcoming 2026',
        location: event_location || 'Convention Center',
        address: address ? address.trim() : (event_location || 'Convention Center'),
        start_time: start_time || '09:00 AM',
        end_time: end_time || '06:00 PM',
        organizer_id: effectiveRole === 'organizer' ? userId : 'user-organizer-admin',
        file_name: file_name || null,
        file_data: file_data || null,
        price_cents: 12000,
        currency: 'INR',
        status: 'available',
        description: `Added event ${event_name.trim()} on EVENTOS platform.`,
        max_capacity: finalCapacity,
        created_at: now
      });

      // Generate real tailored sessions, zones, and flow balancer stations
      const generated = generateEventStructure(
        finalEventId,
        event_name.trim(),
        event_location || 'Convention Center',
        start_time,
        end_time,
        user.name,
        finalCapacity,
        parsedFile,
        file_name,
        file_data
      );

      const sessionsToUse = (Array.isArray(req.body.sessions) && req.body.sessions.length) ? req.body.sessions : generated.sessions;
      const zonesToUse = (Array.isArray(req.body.custom_zones) && req.body.custom_zones.length) 
        ? req.body.custom_zones 
        : ((Array.isArray(req.body.zones) && req.body.zones.length) ? req.body.zones : generated.zones);

      for (const s of sessionsToUse) {
        await DataService.createSession({ ...s, event_id: finalEventId });
      }

      for (const z of zonesToUse) {
        await DataService.createZone({ ...z, event_id: finalEventId });
      }

      await DataService.upsertFlowState(generated.flowState);
    } else if (effectiveRole === 'organizer') {
      event = await DataService.updateEvent(finalEventId, { organizer_id: userId });
    }

    if (effectiveRole === 'visitor') {
      await DataService.registerVisitorForEvent(userId, finalEventId);
      const passId = `PASS-${Math.floor(10000 + Math.random() * 90000)}`;
      await DataService.createPass({
        id: passId,
        user_id: userId,
        event_id: finalEventId,
        pass_type: 'Summit Access Pass',
        valid_dates: event.date_label,
        status: 'confirmed',
        issued_at: now
      });
    }

    res.status(201).json({ data: { success: true, event } });
  } catch (err) {
    console.error('[users/:id/events POST error]', err);
    res.status(500).json({ error: err.message || 'Failed to associate event' });
  }
});

// Legacy POST /api/users for backwards compatibility
router.post('/', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const existing = await DataService.getUserByEmail(email);
    if (existing) {
      await DataService.updateUser(existing.id, { role: role || existing.role });
      return res.json({ data: { ...existing, role: role || existing.role } });
    }

    const id = uuidv4();
    const created = await DataService.createUser({
      id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'visitor',
      created_at: new Date().toISOString()
    });

    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[users POST legacy error]', err);
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

module.exports = router;
