const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { isRedisConnected } = require('../config/redis');

/**
 * Production-grade rate limiting using Redis
 * Falls back to memory store if Redis is unavailable
 * Prevents brute force attacks and API abuse
 */

// Parse configuration from environment
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000; // 1 minute default
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100; // 100 requests per window
const DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';

/**
 * Helper: Create rate limiter with Redis or memory fallback
 */
function createLimiter(options) {
  const { prefix, windowMs, max, message, skip: skipFn } = options;

  // Check if Redis is available
  const useRedis = isRedisConnected() && !DISABLED;

  let store = null;

  if (useRedis) {
    try {
      store = new RedisStore({
        client: redisClient,
        prefix: prefix || 'rl:',
        expiry: windowMs / 1000, // Convert to seconds
      });
    } catch (error) {
      console.warn('⚠️  Redis store creation failed, using memory store');
      // Fall back to memory
      store = new (require('express-rate-limit').MemoryStore)();
    }
  } else {
    // Redis not available - use memory store
    if (!DISABLED) {
      console.log('⚠️  Redis unavailable, using in-memory rate limiting (not persistent across restarts)');
    }
    store = new (require('express-rate-limit').MemoryStore)();
  }

  return rateLimit({
    store,
    windowMs,
    max,
    skip: skipFn,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      // Use IP address as rate limit key
      return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message?.error || 'Too many requests, please try again later.',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  });
}

/**
 * General API rate limiter
 * Applied to all API routes globally
 * 100 requests per minute
 */
const apiLimiter = createLimiter({
  prefix: 'rl:api:',
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  skip: () => DISABLED,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes
 */
const authLimiter = createLimiter({
  prefix: 'rl:auth:',
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => DISABLED,
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
});

/**
 * Resume upload rate limiter
 * 10 uploads per hour
 */
const uploadLimiter = createLimiter({
  prefix: 'rl:upload:',
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip: () => DISABLED,
  message: {
    success: false,
    error: 'Upload limit exceeded. Maximum 10 uploads per hour.',
  },
});

/**
 * AI API rate limiter (for Gemini, OpenAI calls)
 * 20 requests per 10 minutes
 */
const aiLimiter = createLimiter({
  prefix: 'rl:ai:',
  windowMs: 10 * 60 * 1000,
  max: 20,
  skip: () => DISABLED,
  message: {
    success: false,
    error: 'AI API rate limit exceeded. Please wait before making another request.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter,
};
