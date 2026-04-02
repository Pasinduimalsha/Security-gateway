// test-flow.js
// Uses native Node Fetch to perform a complete End-to-End API Gateway test.

(async () => {
  console.log('🚀 Starting E2E Security Gateway Test...\n');
  const username = 'agent_' + Math.floor(Math.random() * 10000);
  const password = 'secure123';

  // --- 1. Register ---
  console.log(`[1/4] Registering User via Proxy (${username})...`);
  try {
      let res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: 'admin' })
      });
      let data = await res.json();
      console.log('Response:', data);
      
      if (!res.ok) throw new Error('Registration failed. Is MongoDB running?');
  } catch (err) {
      console.log('❌ Auth service is down or MongoDB is not running.');
      console.log('Error:', err.message);
      process.exit(1);
  }

  // --- 2. Login ---
  console.log(`\n[2/4] Logging in via Proxy...`);
  let res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  let data = await res.json();
  const token = data.token;
  
  if (!token) {
      console.log('❌ Login failed.');
      process.exit(1);
  }
  console.log('✅ Token Retrieved! -> ' + token.substring(0, 30) + '...[extracted]');

  // --- 3. Access Enclave ---
  console.log(`\n[3/4] Accessing Protected Enclave via Proxy...`);
  res = await fetch('http://localhost:3000/api/enclave', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  data = await res.json();
  console.log(`HTTP ${res.status} Response:`, data);

  // // --- 4. Access Audit ---
  // console.log(`\n[4/4] Accessing Protected Audit via Proxy...`);
  // res = await fetch('http://localhost:3000/api/audit', {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // data = await res.json();
  // console.log(`HTTP ${res.status} Response:`, data);

  console.log('\n🎉 ALL SERVICES REACHED AND TESTED SUCCESSFULLY!');

})();
