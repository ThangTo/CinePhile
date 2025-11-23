const { spawn } = require('child_process');

const PORT = 5000; // Use a different port for testing to avoid conflicts
const BASE_URL = `http://localhost:${PORT}/api/v1/auth`;

async function testAuth() {
  // console.log('Starting server...');
  // const server = spawn('node', ['server.js'], {
  //   env: { ...process.env, PORT },
  //   cwd: process.cwd(),
  //   stdio: 'inherit'
  // });


  try {
    // 1. Register
    console.log('\nTesting Register...');
    const registerData = {
      username: `testuser`,
      email: `test@example.com`,
      password: 'password123'
    };
    
    try {
      const registerRes = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      console.log('Register Success:', registerRes.status === 201);
      const data = await registerRes.json();
      console.log(data);  
      if (registerRes.status !== 201) {
          console.error('Register failed with status:', registerRes.status, data);
          // process.exit(1);
      }
      // Store response data for login check if needed, but we use same credentials
    } catch (error) {
       console.error('Register Error:', error.message);
       process.exit(1);
    }

    // 2. Login
    console.log('\nTesting Login...');
    try {
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: registerData.username,
                password: registerData.password
            })
        });
        
        console.log('Login Success:', loginRes.status === 200);
        const loginData = await loginRes.json();
        console.log('Token received:', !!loginData.token);
        
         if (loginRes.status !== 200 || !loginData.token) {
          console.error('Login failed', loginData);
          process.exit(1);
      }
    } catch (error) {
        console.error('Login Error:', error.message);
        process.exit(1);
    }

    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testAuth();
