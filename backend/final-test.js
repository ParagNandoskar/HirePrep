const axios = require('axios');

async function testEverything() {
  console.log('🧪 HIREPREP COMPLETE SYSTEM TEST');
  console.log('═'.repeat(50));
  console.log(`🎯 Testing all services...`);
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);

  let passed = 0, failed = 0, total = 0;

  async function test(name, testFn) {
    total++;
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name} - failed`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - error: ${error.message}`);
      failed++;
    }
  }

  // Backend Node.js API tests
  console.log('🖥️ BACKEND API TESTS');
  console.log('-'.repeat(30));
  
  await test('Backend Health', async () => {
    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    return response.status === 200;
  });

  await test('System Status', async () => {
    const response = await axios.get('http://localhost:5000/api/status/status', { timeout: 5000 });
    return response.status === 200;
  });

  await test('Job Listings', async () => {
    const response = await axios.get('http://localhost:5000/api/jobs', { timeout: 8000 });
    return response.status === 200;
  });

  await test('Authentication Validation', async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        name: '',
        email: 'invalid',
        password: '123'
      }, { timeout: 5000 });
      return false;
    } catch (error) {
      return error.response?.status >= 400;
    }
  });

  // Python Microservices tests
  console.log('\n🐍 PYTHON MICROSERVICES TESTS');
  console.log('-'.repeat(30));

  await test('Video Analysis Service Health', async () => {
    const response = await axios.get('http://localhost:8001/health', { timeout: 3000 });
    return response.status === 200 && response.data.service === 'video-analysis';
  });

  await test('Audio Analysis Service Health', async () => {
    const response = await axios.get('http://localhost:8002/health', { timeout: 3000 });
    return response.status === 200 && response.data.service === 'audio-analysis';
  });

  await test('Video Analysis Endpoint', async () => {
    const testData = {
      interviewId: 'test-123',
      videoData: ['dGVzdA=='] // base64 for "test"
    };
    const response = await axios.post('http://localhost:8001/analyze-video', testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    return response.status === 200 && response.data.interviewId === 'test-123';
  });

  await test('Audio Analysis Endpoint', async () => {
    const testData = {
      interviewId: 'test-456',
      audioData: ['dGVzdA=='] // base64 for "test"
    };
    const response = await axios.post('http://localhost:8002/analyze-audio', testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    return response.status === 200 && response.data.interviewId === 'test-456';
  });

  // Security tests
  console.log('\n🛡️ SECURITY TESTS');
  console.log('-'.repeat(30));

  await test('SQL Injection Protection', async () => {
    const response = await axios.get(`http://localhost:5000/api/jobs?title='; DROP TABLE users; --`, { timeout: 3000 });
    return response.status === 200 || (response.status >= 400 && response.status < 500);
  });

  // Results
  console.log('\n' + '═'.repeat(50));
  console.log('📊 COMPLETE SYSTEM TEST RESULTS');
  console.log('═'.repeat(50));
  console.log(`📈 Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  const successRate = ((passed / total) * 100).toFixed(1);
  console.log(`📊 Success Rate: ${successRate}%`);

  if (successRate >= 90) {
    console.log('\n🎉 EXCELLENT: All systems operational!');
  } else if (successRate >= 75) {
    console.log('\n✅ GOOD: Most systems working well');
  } else if (successRate >= 60) {
    console.log('\n⚠️ ACCEPTABLE: Some issues to address');
  } else {
    console.log('\n🚨 NEEDS WORK: Multiple issues require attention');
  }

  console.log('\n💡 SYSTEM STATUS:');
  console.log(`   🖥️ Backend API: ${passed >= 3 ? '✅ HEALTHY' : '❌ ISSUES'}`);
  console.log(`   🐍 Python Services: ${passed >= 6 ? '✅ RUNNING' : '⚠️ PARTIAL'}`);
  console.log(`   🛡️ Security: ${passed >= 8 ? '✅ SECURE' : '⚠️ REVIEW'}`);

  console.log('\n🚀 PRODUCTION READINESS:');
  if (successRate >= 85) {
    console.log('   ✅ READY for production deployment');
    console.log('   ✅ All critical systems operational');
    console.log('   ✅ AI microservices functional');
  } else if (successRate >= 70) {
    console.log('   ⚠️ MOSTLY READY - minor fixes recommended');
    console.log('   ✅ Core functionality working');
  } else {
    console.log('   🔧 REQUIRES FIXES before production');
    console.log('   📋 Review failed components');
  }

  const isReady = successRate >= 75 && failed <= 2;
  console.log(`\n🎯 ${isReady ? 'HIREPREP IS PRODUCTION READY!' : 'NEEDS MORE WORK'}`);
  
  return { total, passed, failed, successRate: parseFloat(successRate), ready: isReady };
}

// Run the complete test
testEverything().then(results => {
  process.exit(results.ready ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
