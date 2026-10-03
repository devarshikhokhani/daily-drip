const http = require('http');

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const reqOptions = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Daily Drip Integration Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('1. Health & Config:');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'API health status healthy');

    const config = await request('/api/config');
    assert(config.status === 200 && config.data.cafeName === 'DAILY DRIP', 'API config returns Daily Drip & dynamic network IP');
    console.log(`     Network Address: ${config.data.networkUrl}`);

    // 2. Authentication
    console.log('\n2. Authentication & Roles:');
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@dailydrip.cafe', password: 'coffee123' }
    });
    assert(custLogin.status === 200 && custLogin.data.token, 'Customer login succeeded');
    const custToken = custLogin.data.token;

    const staffLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'barista@dailydrip.cafe', password: 'barista123' }
    });
    assert(staffLogin.status === 200 && staffLogin.data.user.role === 'staff', 'Barista staff login verified');
    const staffToken = staffLogin.data.token;

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@dailydrip.cafe', password: 'admin123' }
    });
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Admin login verified');
    const adminToken = adminLogin.data.token;

    // 3. User profile & RBAC
    console.log('\n3. Profile & RBAC Protection:');
    const profile = await request('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${custToken}` }
    });
    assert(profile.status === 200 && profile.data.user.email === 'customer@dailydrip.cafe', 'Profile fetch verified');

    // Customer trying to access Admin analytics should get 403 Forbidden
    const unauthAdmin = await request('/api/analytics', {
      headers: { 'Authorization': `Bearer ${custToken}` }
    });
    assert(unauthAdmin.status === 403, 'RBAC correctly blocks Customer from accessing Admin analytics (403)');

    const authAdmin = await request('/api/analytics', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(authAdmin.status === 200 && authAdmin.data.summary, 'Admin access granted for analytics');

    // 4. Menu System & Search
    console.log('\n4. Menu System & Dynamic Search:');
    const menu = await request('/api/menu');
    assert(menu.status === 200 && Array.isArray(menu.data) && menu.data.length >= 10, `Menu returned ${menu.data?.length} specialty items`);

    const searchLatte = await request('/api/menu?search=Latte');
    assert(searchLatte.status === 200 && searchLatte.data.some(d => d.name.includes('Latte')), 'Search filter works for "Latte"');

    // 5. Rush Meter & Smart Queue
    console.log('\n5. Rush Meter & Smart Queue:');
    const rush = await request('/api/orders/rush');
    assert(rush.status === 200 && rush.data.label, `Rush meter calculated: ${rush.data.label} (~${rush.data.waitMinutes}m wait)`);

    const queue = await request('/api/orders/queue');
    assert(queue.status === 200 && Array.isArray(queue.data.activeOrders), `Queue contains ${queue.data.totalInQueue} active orders`);

    // 6. Order Creation & Live Workflow
    console.log('\n6. Order Workflow:');
    const newOrder = await request('/api/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${custToken}` },
      body: {
        items: [
          {
            name: 'Madagascar Vanilla Bean Latte',
            basePrice: 210,
            quantity: 1,
            customization: {
              size: 'Large (480ml)',
              milk: 'Oat Milk (Barista Blend)',
              sweetness: 'Normal (50%)',
              temperature: 'Hot',
              flavor: 'Madagascar Vanilla',
              addOns: ['Extra Espresso Shot']
            }
          }
        ],
        tableNumber: 7,
        guestName: 'Aria Chen',
        notes: 'Integration test order'
      }
    });
    assert(newOrder.status === 201 && newOrder.data.order.order_number, `Order created with number #${newOrder.data?.order?.order_number}`);
    const orderId = newOrder.data.order.id;

    // Table 7 should now be occupied
    const tables = await request('/api/tables');
    const table7 = tables.data.find(t => t.table_number === 7);
    assert(table7 && table7.status === 'occupied', 'Table 7 automatically marked OCCUPIED after order');

    // 7. Barista Status Progression
    console.log('\n7. Barista Workflow (Status Progression):');
    const prepRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${staffToken}` },
      body: { status: 'preparing' }
    });
    assert(prepRes.status === 200 && prepRes.data.order.status === 'preparing', 'Barista marked order "preparing"');

    const readyRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${staffToken}` },
      body: { status: 'ready' }
    });
    assert(readyRes.status === 200 && readyRes.data.order.status === 'ready', 'Barista marked order "ready"');

    const compRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${staffToken}` },
      body: { status: 'completed' }
    });
    assert(compRes.status === 200 && compRes.data.order.status === 'completed', 'Barista marked order "completed"');

    // Table 7 should now be free
    const tablesAfter = await request('/api/tables');
    const table7After = tablesAfter.data.find(t => t.table_number === 7);
    assert(table7After && table7After.status === 'available', 'Table 7 automatically freed (AVAILABLE) after completion');

    // 8. Coffee DNA & Public QR Sharing
    console.log('\n8. Coffee DNA & Public Sharing:');
    const dnaRes = await request('/api/coffee-dna', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${custToken}` },
      body: {
        drinkName: 'Large Artisan Hazelnut Cappuccino',
        customization: {
          strength: 'Intense',
          sweetness: 'Less (25%)',
          milk: 'Oat Milk (Barista Blend)',
          temperature: 'Hot',
          addOns: ['Extra Espresso Shot']
        }
      }
    });
    assert(dnaRes.status === 201 && dnaRes.data.dna.id, `Generated Coffee DNA ID: ${dnaRes.data?.dna?.id}`);
    const createdDnaId = dnaRes.data.dna.id;

    // Public view (No Auth required for QR scanning)
    const publicDna = await request(`/api/coffee-dna/${createdDnaId}`);
    assert(publicDna.status === 200 && publicDna.data.personality_name, `Public QR endpoint accessed without auth: "${publicDna.data.personality_name}"`);

    // 9. Coffee Passport
    console.log('\n9. Coffee Passport:');
    const passport = await request('/api/passport', {
      headers: { 'Authorization': `Bearer ${custToken}` }
    });
    assert(passport.status === 200 && passport.data.totalDiscovered >= 4, `Passport has ${passport.data.totalDiscovered} / ${passport.data.totalGoals} discovered drinks`);

    // 10. Cross-Device Café Portal Session
    console.log('\n10. Cross-Device Café Portal Session:');
    const sessionRes = await request('/api/cafe/session', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(sessionRes.status === 200 || sessionRes.status === 201, `Active Café session with Code: ${sessionRes.data?.session?.code}`);
    const sessionCode = sessionRes.data.session.code;

    const joinSession = await request(`/api/cafe/session/code/${sessionCode}`);
    assert(joinSession.status === 200 && joinSession.data.session.code === sessionCode, 'Phone device joins session by 4-digit code');

    // Two-way live draft update
    const updateDraft = await request(`/api/cafe/session/${joinSession.data.session.id}/draft`, {
      method: 'PUT',
      body: {
        draft: { sweetness: 'Extra (100%)', temperature: 'Iced', baseDrink: 'Nitro Cold Brew' },
        sourceDevice: 'customer'
      }
    });
    assert(updateDraft.status === 200 && updateDraft.data.draft.sweetness === 'Extra (100%)', 'Two-way live draft updated');

    console.log('\n=======================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('=======================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Integration test suite encountered error:', err);
    process.exit(1);
  }
}

// Start server child process and run tests
const { spawn } = require('child_process');
const serverProcess = spawn('node', ['server/server.js'], { stdio: 'inherit' });

setTimeout(() => {
  runTests().then(() => {
    serverProcess.kill();
    process.exit(0);
  }).catch(() => {
    serverProcess.kill();
    process.exit(1);
  });
}, 2000);
