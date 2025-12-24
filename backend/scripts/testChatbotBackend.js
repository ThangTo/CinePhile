/**
 * Comprehensive Chatbot Backend Test Suite
 * Tests both functional and non-functional requirements
 * 
 * Usage: node scripts/testChatbotBackend.js
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_PREFIX = '/api/v1/chat';

// Test user credentials (adjust if needed)
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456'
};

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
  performance: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colorsMap = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    test: colors.cyan,
    section: colors.magenta
  };
  const color = colorsMap[type] || colors.white;
  console.log(color(`[${timestamp}] ${message}`));
}

function logSection(title) {
  console.log('\n' + '='.repeat(80).magenta);
  log(title, 'section');
  console.log('='.repeat(80).magenta + '\n');
}

function logTest(testName) {
  log(`🧪 TEST: ${testName}`, 'test');
}

function logSuccess(message) {
  log(`✅ PASS: ${message}`, 'success');
  stats.passed++;
}

function logFailure(message, error = null) {
  log(`❌ FAIL: ${message}`, 'error');
  if (error) {
    log(`   Error: ${error.message || error}`, 'error');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'error');
      log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
  }
  stats.failed++;
}

function logSkip(message) {
  log(`⏭️  SKIP: ${message}`, 'warning');
  stats.skipped++;
}

function logPerformance(operation, duration) {
  stats.performance.push({ operation, duration });
  log(`⏱️  Performance: ${operation} took ${duration}ms`, 'info');
}

// ============================================
// AUTHENTICATION HELPERS
// ============================================

let authToken = null;
let testUserId = null;

async function authenticate() {
  try {
    log('🔐 Authenticating test user...', 'info');
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      testUserId = response.data.user?._id;
      logSuccess('Authentication successful');
      return true;
    }
    return false;
  } catch (error) {
    logSkip('Authentication failed - will test as guest user');
    return false;
  }
}

function getAuthHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

// ============================================
// TEST HELPERS
// ============================================

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const startTime = Date.now();
  try {
    const config = {
      method,
      url: `${BASE_URL}${API_PREFIX}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...headers
      },
      timeout: 30000 // 30 seconds
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;
    logPerformance(`${method} ${endpoint}`, duration);
    
    return { success: true, response, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logPerformance(`${method} ${endpoint} (FAILED)`, duration);
    return { success: false, error, duration };
  }
}

// ============================================
// FUNCTIONAL TESTS
// ============================================

async function testChatEndpoint() {
  logSection('FUNCTIONAL TESTS - Chat Endpoint (POST /)');

  // Test 1: Basic chat message
  logTest('1.1: Basic chat message (guest user)');
  stats.total++;
  const test1 = await makeRequest('POST', '/', {
    message: 'Xin chào',
    sessionId: 'test-session-1'
  });
  
  if (test1.success && test1.response.data.answer) {
    logSuccess('Basic chat message responded');
    log(`   Answer: ${test1.response.data.answer.substring(0, 100)}...`, 'info');
  } else {
    logFailure('Basic chat message failed', test1.error);
  }

  // Test 2: Movie info query - Top movies
  logTest('1.2: Movie info query - Top movies');
  stats.total++;
  const test2 = await makeRequest('POST', '/', {
    message: 'Cho tôi xem top phim hay nhất',
    sessionId: 'test-session-2'
  });
  
  if (test2.success && test2.response.data.answer) {
    logSuccess('Top movies query responded');
    log(`   Answer length: ${test2.response.data.answer.length} chars`, 'info');
  } else {
    logFailure('Top movies query failed', test2.error);
  }

  // Test 3: Movie info query - New movies
  logTest('1.3: Movie info query - New movies');
  stats.total++;
  const test3 = await makeRequest('POST', '/', {
    message: 'Phim mới cập nhật là gì?',
    sessionId: 'test-session-3'
  });
  
  if (test3.success && test3.response.data.answer) {
    logSuccess('New movies query responded');
  } else {
    logFailure('New movies query failed', test3.error);
  }

  // Test 4: Movie info query - Genre search
  logTest('1.4: Movie info query - Genre search');
  stats.total++;
  const test4 = await makeRequest('POST', '/', {
    message: 'Gợi ý phim hành động',
    sessionId: 'test-session-4'
  });
  
  if (test4.success && test4.response.data.answer) {
    logSuccess('Genre search query responded');
  } else {
    logFailure('Genre search query failed', test4.error);
  }

  // Test 5: Movie info query - Actor search
  logTest('1.5: Movie info query - Actor search');
  stats.total++;
  const test5 = await makeRequest('POST', '/', {
    message: 'Phim có diễn viên Tom Cruise',
    sessionId: 'test-session-5'
  });
  
  if (test5.success && test5.response.data.answer) {
    logSuccess('Actor search query responded');
  } else {
    logFailure('Actor search query failed', test5.error);
  }

  // Test 6: Movie info query - Keyword search
  logTest('1.6: Movie info query - Keyword search');
  stats.total++;
  const test6 = await makeRequest('POST', '/', {
    message: 'Tìm phim Avatar',
    sessionId: 'test-session-6'
  });
  
  if (test6.success && test6.response.data.answer) {
    logSuccess('Keyword search query responded');
  } else {
    logFailure('Keyword search query failed', test6.error);
  }

  // Test 7: General question
  logTest('1.7: General question');
  stats.total++;
  const test7 = await makeRequest('POST', '/', {
    message: 'Làm thế nào để đăng nhập?',
    sessionId: 'test-session-7'
  });
  
  if (test7.success && test7.response.data.answer) {
    logSuccess('General question responded');
  } else {
    logFailure('General question failed', test7.error);
  }

  // Test 8: Chat with history
  logTest('1.8: Chat with conversation history');
  stats.total++;
  const sessionId = 'test-session-history';
  
  // First message
  await makeRequest('POST', '/', {
    message: 'Xin chào',
    sessionId
  });
  
  // Second message with history
  const test8 = await makeRequest('POST', '/', {
    message: 'Bạn có thể giúp gì cho tôi?',
    sessionId,
    history: [
      { role: 'user', content: 'Xin chào' },
      { role: 'assistant', content: 'Chào bạn! Tôi có thể giúp gì?' }
    ]
  });
  
  if (test8.success && test8.response.data.answer) {
    logSuccess('Chat with history responded');
  } else {
    logFailure('Chat with history failed', test8.error);
  }

  // Test 9: Chat with metadata
  logTest('1.9: Chat with movie metadata');
  stats.total++;
  const test9 = await makeRequest('POST', '/', {
    message: 'Phim này có gì hay?',
    sessionId: 'test-session-metadata',
    metadata: {
      movieId: '507f1f77bcf86cd799439011' // Example ObjectId
    }
  });
  
  if (test9.success && test9.response.data.answer) {
    logSuccess('Chat with metadata responded');
  } else {
    logFailure('Chat with metadata failed', test9.error);
  }

  // Test 10: Empty message
  logTest('1.10: Empty message handling');
  stats.total++;
  const test10 = await makeRequest('POST', '/', {
    message: '',
    sessionId: 'test-session-empty'
  });
  
  if (!test10.success || test10.response.status >= 400) {
    logSuccess('Empty message properly rejected');
  } else {
    logFailure('Empty message should be rejected');
  }

  // Test 11: Very long message
  logTest('1.11: Very long message handling');
  stats.total++;
  const longMessage = 'A'.repeat(5000);
  const test11 = await makeRequest('POST', '/', {
    message: longMessage,
    sessionId: 'test-session-long'
  });
  
  if (test11.success) {
    logSuccess('Long message handled');
  } else {
    logFailure('Long message failed', test11.error);
  }

  // Test 12: Special characters
  logTest('1.12: Special characters handling');
  stats.total++;
  const test12 = await makeRequest('POST', '/', {
    message: 'Tìm phim có ký tự đặc biệt: @#$%^&*()',
    sessionId: 'test-session-special'
  });
  
  if (test12.success) {
    logSuccess('Special characters handled');
  } else {
    logFailure('Special characters failed', test12.error);
  }

  // Test 13: Authenticated user chat
  if (authToken) {
    logTest('1.13: Authenticated user chat');
    stats.total++;
    const test13 = await makeRequest('POST', '/', {
      message: 'Phim tôi đã xem gần đây?',
      sessionId: 'test-session-auth'
    });
    
    if (test13.success && test13.response.data.answer) {
      logSuccess('Authenticated user chat responded');
    } else {
      logFailure('Authenticated user chat failed', test13.error);
    }
  } else {
    logSkip('1.13: Authenticated user chat (no auth token)');
    stats.total++;
    stats.skipped++;
  }
}

async function testChatHistoryEndpoint() {
  logSection('FUNCTIONAL TESTS - Chat History Endpoint (GET /history)');

  // Test 1: Get history with sessionId
  logTest('2.1: Get history with sessionId');
  stats.total++;
  const sessionId = 'test-session-history-get';
  
  // Create some chat messages first
  await makeRequest('POST', '/', { message: 'Message 1', sessionId });
  await makeRequest('POST', '/', { message: 'Message 2', sessionId });
  
  const test1 = await makeRequest('GET', `/history?sessionId=${sessionId}&limit=10`);
  
  if (test1.success && Array.isArray(test1.response.data.chats)) {
    logSuccess(`Get history with sessionId (found ${test1.response.data.chats.length} chats)`);
  } else {
    logFailure('Get history with sessionId failed', test1.error);
  }

  // Test 2: Get history with limit
  logTest('2.2: Get history with limit parameter');
  stats.total++;
  const test2 = await makeRequest('GET', `/history?sessionId=${sessionId}&limit=2`);
  
  if (test2.success && test2.response.data.chats.length <= 2) {
    logSuccess('Get history with limit worked correctly');
  } else {
    logFailure('Get history with limit failed', test2.error);
  }

  // Test 3: Get history without sessionId or userId
  logTest('2.3: Get history without sessionId or userId (should fail)');
  stats.total++;
  const test3 = await makeRequest('GET', '/history');
  
  if (!test3.success && test3.error?.response?.status === 400) {
    logSuccess('Properly rejected request without sessionId/userId');
  } else {
    logFailure('Should reject request without sessionId/userId');
  }

  // Test 4: Get history for authenticated user
  if (authToken && testUserId) {
    logTest('2.4: Get history for authenticated user');
    stats.total++;
    const test4 = await makeRequest('GET', `/history?limit=10`);
    
    if (test4.success && Array.isArray(test4.response.data.chats)) {
      logSuccess('Get history for authenticated user worked');
    } else {
      logFailure('Get history for authenticated user failed', test4.error);
    }
  } else {
    logSkip('2.4: Get history for authenticated user (no auth)');
    stats.total++;
    stats.skipped++;
  }

  // Test 5: Invalid limit parameter
  logTest('2.5: Invalid limit parameter handling');
  stats.total++;
  const test5 = await makeRequest('GET', `/history?sessionId=${sessionId}&limit=abc`);
  
  if (test5.success) {
    logSuccess('Invalid limit handled gracefully');
  } else {
    logFailure('Invalid limit handling failed', test5.error);
  }
}

async function testClearHistoryEndpoint() {
  logSection('FUNCTIONAL TESTS - Clear History Endpoint (DELETE /history)');

  // Test 1: Clear history with sessionId
  logTest('3.1: Clear history with sessionId');
  stats.total++;
  const sessionId = 'test-session-clear';
  
  // Create some messages first
  await makeRequest('POST', '/', { message: 'Test message', sessionId });
  
  const test1 = await makeRequest('DELETE', '/history', { sessionId });
  
  if (test1.success && test1.response.data.message) {
    logSuccess('Clear history with sessionId worked');
  } else {
    logFailure('Clear history with sessionId failed', test1.error);
  }

  // Test 2: Clear history without sessionId or userId
  logTest('3.2: Clear history without sessionId or userId (should fail)');
  stats.total++;
  const test2 = await makeRequest('DELETE', '/history', {});
  
  if (!test2.success && test2.error?.response?.status === 400) {
    logSuccess('Properly rejected clear without sessionId/userId');
  } else {
    logFailure('Should reject clear without sessionId/userId');
  }

  // Test 3: Clear history for authenticated user
  if (authToken) {
    logTest('3.3: Clear history for authenticated user');
    stats.total++;
    const test3 = await makeRequest('DELETE', '/history', {});
    
    if (test3.success) {
      logSuccess('Clear history for authenticated user worked');
    } else {
      logFailure('Clear history for authenticated user failed', test3.error);
    }
  } else {
    logSkip('3.3: Clear history for authenticated user (no auth)');
    stats.total++;
    stats.skipped++;
  }
}

// ============================================
// NON-FUNCTIONAL TESTS
// ============================================

async function testPerformance() {
  logSection('NON-FUNCTIONAL TESTS - Performance');

  // Test 1: Response time for simple query
  logTest('4.1: Response time for simple query');
  stats.total++;
  const test1 = await makeRequest('POST', '/', {
    message: 'Xin chào',
    sessionId: 'perf-test-1'
  });
  
  if (test1.success) {
    if (test1.duration < 5000) {
      logSuccess(`Response time acceptable: ${test1.duration}ms`);
    } else {
      logFailure(`Response time too slow: ${test1.duration}ms (expected < 5000ms)`);
    }
  } else {
    logFailure('Performance test failed', test1.error);
  }

  // Test 2: Response time for complex query
  logTest('4.2: Response time for complex query');
  stats.total++;
  const test2 = await makeRequest('POST', '/', {
    message: 'Cho tôi xem top 10 phim hành động hay nhất năm 2023',
    sessionId: 'perf-test-2'
  });
  
  if (test2.success) {
    if (test2.duration < 10000) {
      logSuccess(`Complex query response time: ${test2.duration}ms`);
    } else {
      logFailure(`Complex query too slow: ${test2.duration}ms (expected < 10000ms)`);
    }
  } else {
    logFailure('Complex query performance test failed', test2.error);
  }

  // Test 3: Concurrent requests
  logTest('4.3: Concurrent requests handling');
  stats.total++;
  const concurrentRequests = 5;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(makeRequest('POST', '/', {
      message: `Concurrent test message ${i}`,
      sessionId: `perf-concurrent-${i}`
    }));
  }
  
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;
  
  const successCount = results.filter(r => r.success).length;
  if (successCount === concurrentRequests) {
    logSuccess(`All ${concurrentRequests} concurrent requests succeeded in ${totalDuration}ms`);
  } else {
    logFailure(`Only ${successCount}/${concurrentRequests} concurrent requests succeeded`);
  }
}

async function testLoad() {
  logSection('NON-FUNCTIONAL TESTS - Load Testing');

  // Test 1: Sequential load (10 requests)
  logTest('5.1: Sequential load (10 requests)');
  stats.total++;
  const sequentialCount = 10;
  const sequentialResults = [];
  const sequentialStart = Date.now();
  
  for (let i = 0; i < sequentialCount; i++) {
    const result = await makeRequest('POST', '/', {
      message: `Load test message ${i}`,
      sessionId: `load-seq-${i}`
    });
    sequentialResults.push(result);
  }
  
  const sequentialDuration = Date.now() - sequentialStart;
  const sequentialSuccess = sequentialResults.filter(r => r.success).length;
  
  if (sequentialSuccess === sequentialCount) {
    logSuccess(`Sequential load: ${sequentialSuccess}/${sequentialCount} succeeded in ${sequentialDuration}ms`);
    log(`   Average: ${(sequentialDuration / sequentialCount).toFixed(2)}ms per request`, 'info');
  } else {
    logFailure(`Sequential load: Only ${sequentialSuccess}/${sequentialCount} succeeded`);
  }

  // Test 2: Burst load (20 requests at once)
  logTest('5.2: Burst load (20 concurrent requests)');
  stats.total++;
  const burstCount = 20;
  const burstPromises = [];
  
  for (let i = 0; i < burstCount; i++) {
    burstPromises.push(makeRequest('POST', '/', {
      message: `Burst test message ${i}`,
      sessionId: `load-burst-${i}`
    }));
  }
  
  const burstStart = Date.now();
  const burstResults = await Promise.all(burstPromises);
  const burstDuration = Date.now() - burstStart;
  const burstSuccess = burstResults.filter(r => r.success).length;
  
  if (burstSuccess >= burstCount * 0.8) { // 80% success rate acceptable
    logSuccess(`Burst load: ${burstSuccess}/${burstCount} succeeded in ${burstDuration}ms`);
    log(`   Success rate: ${((burstSuccess / burstCount) * 100).toFixed(1)}%`, 'info');
  } else {
    logFailure(`Burst load: Only ${burstSuccess}/${burstCount} succeeded (expected >= ${burstCount * 0.8})`);
  }
}

async function testErrorHandling() {
  logSection('NON-FUNCTIONAL TESTS - Error Handling');

  // Test 1: Invalid JSON
  logTest('6.1: Invalid JSON handling');
  stats.total++;
  try {
    const response = await axios.post(
      `${BASE_URL}${API_PREFIX}/`,
      'invalid json',
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        validateStatus: () => true
      }
    );
    
    if (response.status >= 400) {
      logSuccess('Invalid JSON properly rejected');
    } else {
      logFailure('Invalid JSON should be rejected');
    }
  } catch (error) {
    logSuccess('Invalid JSON properly rejected');
  }

  // Test 2: Missing required fields
  logTest('6.2: Missing message field');
  stats.total++;
  const test2 = await makeRequest('POST', '/', {
    sessionId: 'test-missing-field'
  });
  
  if (!test2.success || test2.response.status >= 400) {
    logSuccess('Missing message field properly handled');
  } else {
    logFailure('Missing message field should be rejected');
  }

  // Test 3: Invalid sessionId format
  logTest('6.3: Invalid sessionId format');
  stats.total++;
  const test3 = await makeRequest('POST', '/', {
    message: 'Test',
    sessionId: null
  });
  
  // Should either work with null or fail gracefully
  if (test3.success || (test3.error && test3.error.response?.status < 500)) {
    logSuccess('Invalid sessionId handled gracefully');
  } else {
    logFailure('Invalid sessionId caused server error', test3.error);
  }

  // Test 4: Very large history array
  logTest('6.4: Very large history array');
  stats.total++;
  const largeHistory = Array(1000).fill(null).map((_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}`
  }));
  
  const test4 = await makeRequest('POST', '/', {
    message: 'Test with large history',
    sessionId: 'test-large-history',
    history: largeHistory
  });
  
  if (test4.success) {
    logSuccess('Large history array handled');
  } else {
    logFailure('Large history array failed', test4.error);
  }
}

async function testRateLimiting() {
  logSection('NON-FUNCTIONAL TESTS - Rate Limiting');

  // Test: Rapid requests
  logTest('7.1: Rapid sequential requests');
  stats.total++;
  const rapidCount = 30;
  const rapidResults = [];
  const rapidStart = Date.now();
  
  for (let i = 0; i < rapidCount; i++) {
    const result = await makeRequest('POST', '/', {
      message: `Rapid test ${i}`,
      sessionId: `rate-test-${i}`
    });
    rapidResults.push(result);
    
    // Small delay to avoid overwhelming
    if (i < rapidCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const rapidDuration = Date.now() - rapidStart;
  const rapidSuccess = rapidResults.filter(r => r.success).length;
  const rateLimited = rapidResults.filter(r => 
    r.error?.response?.status === 429
  ).length;
  
  if (rateLimited > 0) {
    logSuccess(`Rate limiting active: ${rateLimited} requests rate limited`);
  } else if (rapidSuccess >= rapidCount * 0.9) {
    logSuccess(`Rapid requests handled: ${rapidSuccess}/${rapidCount} succeeded`);
  } else {
    logFailure(`Rapid requests: Only ${rapidSuccess}/${rapidCount} succeeded`);
  }
  
  log(`   Total duration: ${rapidDuration}ms`, 'info');
  log(`   Rate limited: ${rateLimited}`, 'info');
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  logSection('CHATBOT BACKEND TEST SUITE');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`API Prefix: ${API_PREFIX}`, 'info');
  
  stats.startTime = Date.now();

  try {
    // Authenticate if possible
    await authenticate();

    // Functional Tests
    await testChatEndpoint();
    await testChatHistoryEndpoint();
    await testClearHistoryEndpoint();

    // Non-Functional Tests
    await testPerformance();
    await testLoad();
    await testErrorHandling();
    await testRateLimiting();

  } catch (error) {
    logFailure('Test suite crashed', error);
  }

  stats.endTime = Date.now();
  const totalDuration = stats.endTime - stats.startTime;

  // Print summary
  logSection('TEST SUMMARY');
  log(`Total Tests: ${stats.total}`, 'info');
  log(`Passed: ${stats.passed}`, 'success');
  log(`Failed: ${stats.failed}`, stats.failed > 0 ? 'error' : 'success');
  log(`Skipped: ${stats.skipped}`, 'warning');
  log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`, 'info');
  
  // Performance summary
  if (stats.performance.length > 0) {
    const avgDuration = stats.performance.reduce((sum, p) => sum + p.duration, 0) / stats.performance.length;
    const minDuration = Math.min(...stats.performance.map(p => p.duration));
    const maxDuration = Math.max(...stats.performance.map(p => p.duration));
    
    log('\n📊 Performance Statistics:', 'section');
    log(`   Average: ${avgDuration.toFixed(2)}ms`, 'info');
    log(`   Min: ${minDuration}ms`, 'info');
    log(`   Max: ${maxDuration}ms`, 'info');
    log(`   Total Requests: ${stats.performance.length}`, 'info');
  }

  // Exit code
  const exitCode = stats.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    logFailure('Fatal error in test suite', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };

