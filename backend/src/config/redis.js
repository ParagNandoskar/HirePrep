const Redis = require('ioredis');
const { EventEmitter } = require('events');

const REDIS_ENABLED = (process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

let redisReady = false;
let connectionErrorLogged = false;

class MockRedisClient extends EventEmitter {
  constructor() {
    super();
    this.status = 'disabled';
    this.options = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    };
  }

  async get() { return null; }
  async setex() { return 'OK'; }
  async del() { return 0; }
  async keys() { return []; }
  async flushdb() { return 'OK'; }
  async ping() { throw new Error('Redis disabled'); }
  async info() { return ''; }
  async dbsize() { return 0; }
}

let redisClient;

if (!REDIS_ENABLED) {
  redisClient = new MockRedisClient();
  console.log('ℹ️  Redis disabled (REDIS_ENABLED=false). Using in-memory/MongoDB fallbacks.');
} else {
  const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: (times) => {
      if (times > 2) return null;
      return Math.min(times * 200, 1000);
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: false,
  };

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    console.log(`✅ Redis connected at ${redisClient.options.host}:${redisClient.options.port}`);
    connectionErrorLogged = false;
    redisReady = true;
  });

  redisClient.on('ready', () => {
    redisReady = true;
  });

  redisClient.on('error', (err) => {
    if (!connectionErrorLogged) {
      const errorMsg = err.message || err.code || 'Unknown error';
      console.warn(`⚠️  Redis unavailable: ${errorMsg}`);
      console.warn('⚠️  Using MongoDB fallback for session/cache storage');
      connectionErrorLogged = true;
    }
    redisReady = false;
  });

  redisClient.on('close', () => {
    redisReady = false;
  });
}

async function checkRedisHealth() {
  if (!REDIS_ENABLED) return false;
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    return false;
  }
}

function isRedisConnected() {
  return REDIS_ENABLED && redisReady && redisClient.status === 'ready';
}

module.exports = redisClient;
module.exports.REDIS_ENABLED = REDIS_ENABLED;
module.exports.checkRedisHealth = checkRedisHealth;
module.exports.isRedisConnected = isRedisConnected;
module.exports.redisReady = () => redisReady;
