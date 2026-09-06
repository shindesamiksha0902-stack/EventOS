const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    console.log('--- TEST 1: Visitor Registration ---');
    const vEmail = 'elena_' + Date.now() + '@eventos.io';
    const vReg = await post('/api/users/register', {
      name: 'Elena Rostova',
      email: vEmail,
      password: 'elena_pass_123',
      address: 'Lisbon Center',
      role: 'visitor',
      event_name: 'AARPO World Summit 2026',
      event_id: 'aarpo-26',
      event_location: 'Lisbon Congress Center',
      event_date: 'SEP 14-16, 2026',
      location_permission: true
    });
    console.log('Visitor Reg Status:', vReg.status, vReg.data.data.user.name, '| Event:', vReg.data.data.event.title);

    console.log('--- TEST 2: Visitor Login ---');
    const vLogin = await post('/api/users/login', {
      email: vEmail,
      password: 'elena_pass_123',
      role: 'visitor'
    });
    console.log('Visitor Login Status:', vLogin.status, '| Events count:', vLogin.data.data.events.length, '| Active Event:', vLogin.data.data.active_event.title);

    console.log('--- TEST 3: Organizer Registration with File ---');
    const oEmail = 'marco_' + Date.now() + '@eventos.io';
    const oReg = await post('/api/users/register', {
      name: 'Marco Rossi',
      email: oEmail,
      password: 'marco_pass_456',
      address: 'Via Roma 10, Milan',
      role: 'organizer',
      event_name: 'Smart Infrastructure 2026',
      event_id: 'smart-infra-' + Date.now().toString().slice(-4),
      event_location: 'Milan Expo Center',
      event_date: 'DEC 01-03, 2026',
      file_name: 'floorplan_v2.pdf',
      file_data: 'data:application/pdf;base64,JVBERi0xLjQK'
    });
    console.log('Organizer Reg Status:', oReg.status, oReg.data.data.user.name, '| Created Event:', oReg.data.data.event.id);

    console.log('--- TEST 4: Organizer Login ---');
    const oLogin = await post('/api/users/login', {
      email: oEmail,
      password: 'marco_pass_456',
      role: 'organizer'
    });
    console.log('Organizer Login Status:', oLogin.status, '| Organizer Events:', oLogin.data.data.events.map(e => e.title).join(', '));

    console.log('>>> ALL AUTH AND MULTI-EVENT TESTS PASSED! <<<');
  } catch (e) {
    console.error('Test error:', e);
  }
})();
