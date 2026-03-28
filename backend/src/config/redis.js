const Redis = require('ioredis');

// Redis connection status flag - track if Redis is available
let redisReady = false;
let connectionErrorLogged = false;

// Production-grade Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  
  // Connection configuration - SHORT timeouts so app doesn't block
  connectTimeout: 5000,  // 5 seconds (reduced from 10)
  commandTimeout: 3000,  // 3 seconds (reduced from 5)
  
  // Retry strategy: exponential backoff, but give up after retries
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    if (times > 5) {
      // Stop retrying after 5 attempts
      // Server will continue without Redis (fallback to MongoDB)
      return null;
    }
    return delay;
  },
  
  // Request queue settings - CRITICAL for non-blocking
  maxRetriesPerRequest: 3, // Reduced from null
  enableReadyCheck: false,
  enableOfflineQueue: false, // CRITICAL: don't queue commands if Redis is down
  
  // Reconnection behavior
  autoResubscribe: true,
  autoRessubscribe: true,

  // Don't fail on connection errors - let app continue
  lazyConnect: false,
};

const redisClient = new Redis(redisConfig);

// Event: Initial connection attempt starting
redisClient.on('connecting', () => {
  console.log('🔌 Redis: Attempting to connect...');
});

// Event: Connection established
redisClient.on('connect', () => {
  console.log(`✅ Redis connected at ${redisClient.options.host}:${redisClient.options.port}`);
  connectionErrorLogged = false;
  redisReady = true; // Mark as ready
});

// Event: Connection ready for commands
redisClient.on('ready', () => {
  console.log('✅ Redis ready for commands');
  redisReady = true; // Mark as ready
});

// Event: Attempting to reconnect after disconnect
redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
  redisReady = false; // Mark as not ready
});

// Event: Connection error (non-critical, MongoDB fallback available)
// CRITICAL: DO NOT THROW - let app continue
redisClient.on('error', (err) => {
  if (!connectionErrorLogged) {
    const errorMsg = err.message || err.code || 'Unknown error';
    console.warn(`⚠️  Redis unavailable: ${errorMsg}`);
    console.warn('⚠️  Using MongoDB fallback for session/cache storage');
    connectionErrorLogged = true;
  }
  redisReady = false; // Mark as not ready
});

// Event: Connection closed unexpectedly
redisClient.on('close', () => {
  console.log('⚠️  Redis: Connection closed');
  redisReady = false; // Mark as not ready
});

// Health check function
async function checkRedisHealth() {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    return false;
  }
}

// Check if Redis is connected (non-blocking)
function isRedisConnected() {
  return redisReady && redisClient.status === 'ready';
}

module.exports = redisClient;
module.exports.checkRedisHealth = checkRedisHealth;
module.exports.isRedisConnected = isRedisConnected;
module.exports.redisReady = () => redisReady;
