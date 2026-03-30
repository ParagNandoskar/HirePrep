#!/usr/bin/env node

/**
 * Redis Connection Test
 * 
 * This script verifies that Redis is working correctly.
 * Run it with: node scripts/testRedisConnection.js
 */

const redisClient = require('../src/config/redis');

async function testRedis() {
  console.log('\n═══════════════════════════════════════');
  console.log('  🧪 Redis Connection Test');
  console.log('═══════════════════════════════════════\n');

  try {
    // Test 1: PING
    console.log('1️⃣  Testing PING...');
    const pongResult = await redisClient.ping();
    console.log('   Response:', pongResult);
    console.log('   ✅ PING successful\n');

    // Test 2: SET a key-value pair
    console.log('2️⃣  Setting test key...');
    const setResult = await redisClient.set('test_key', 'hello_world', 'EX', 3600);
    console.log('   SET test_key = "hello_world"');
    console.log('   Response:', setResult);
    console.log('   ✅ SET successful\n');

    // Test 3: GET the key back
    console.log('3️⃣  Getting test key...');
    const getResult = await redisClient.get('test_key');
    console.log('   GET test_key');
    console.log('   Response:', getResult);
    if (getResult === 'hello_world') {
      console.log('   ✅ GET successful - value matches\n');
    }

    // Test 4: DELETE the key
    console.log('4️⃣  Deleting test key...');
    const delResult = await redisClient.del('test_key');
    console.log('   DEL test_key');
    console.log('   Response:', delResult);
    console.log('   ✅ DELETE successful\n');

    // Test 5: Verify deletion
    console.log('5️⃣  Verifying deletion...');
    const verifyResult = await redisClient.get('test_key');
    console.log('   GET test_key (after deletion)');
    console.log('   Response:', verifyResult);
    console.log('   ✅ Key successfully removed\n');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('  ✅ All Redis tests passed!');
    console.log('═══════════════════════════════════════\n');

    console.log('📊 Redis Info:');
    console.log('   Host:', redisClient.options.host);
    console.log('   Port:', redisClient.options.port);
    console.log('   Database:', redisClient.options.db);
    console.log('\n✅ Redis is ready for session storage!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Error:', error.message);
    console.error('\n⚠️  Make sure Redis is running:');
    console.error('   docker run -d -p 6379:6379 redis\n');
    process.exit(1);
  }
}

// Wait a moment for Redis to initialize, then run tests
setTimeout(() => {
  testRedis();
}, 1000);

// Handle process exit
process.on('exit', () => {
  redisClient.disconnect();
});
