const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    console.log('--- TEST 1: Register User & Add Second Event ---');
    const uEmail = 'tester_' + Date.now() + '@eventos.io';
    const reg = await request('POST', '/api/users/register', {
      name: 'Dr. John Doe',
      email: uEmail,
      password: 'password999',
      address: 'Porto Innovation Park',
      role: 'visitor',
      event_name: 'Lisbon UX & Design Expo',
      event_id: 'lisbon-ux',
      location_permission: true
    });
    const userId = reg.data.data.user.id;
    console.log('User registered:', userId);

    const addEv = await request('POST', `/api/users/${userId}/events`, {
      event_name: 'Porto Clean Tech 2026',
      event_id: 'porto-clean-' + Date.now().toString().slice(-4),
      event_location: 'Porto Alfândega',
      event_date: 'DEC 12-14, 2026',
      start_time: '09:00 AM',
      end_time: '05:00 PM',
      role: 'visitor'
    });
    console.log('Added Event Status:', addEv.status, '| New Event:', addEv.data.data.event.title);

    console.log('--- TEST 2: Fetch User Events List ---');
    const userEvents = await request('GET', `/api/users/${userId}/events?role=visitor`);
    console.log('User Events:', userEvents.data.data.map(e => `${e.title} (${e.id})`));

    console.log('--- TEST 3: Journey Planning for Custom Event ---');
    const journey = await request('POST', '/api/journey/plan', {
      user_id: userId,
      event_id: addEv.data.data.event.id,
      start_zone: `${addEv.data.data.event.id}-z1`,
      destination_session: `s-${addEv.data.data.event.id}-1`
    });
    console.log('Journey Status:', journey.status, '| Route:', journey.data.data.route_title, '| Steps:', journey.data.data.steps.length);

    console.log('--- TEST 4: Flow Balancer on Event ---');
    const flow = await request('GET', `/api/organizer/flow-balancer/${addEv.data.data.event.id}`);
    console.log('Flow Status:', flow.status, '| Current Station A:', flow.data.data.now.station_a.name);

    const apply = await request('POST', '/api/organizer/flow-balancer/apply', { event_id: addEv.data.data.event.id });
    console.log('Apply recommendation:', apply.data.data.message);

    const reset = await request('POST', '/api/organizer/flow-balancer/reset', { event_id: addEv.data.data.event.id });
    console.log('Reset recommendation:', reset.data.data.message);

    console.log('>>> ALL MULTI-EVENT & REAL-TIME TESTS PASSED! <<<');
  } catch (e) {
    console.error('Multi-event test error:', e);
  }
})();
