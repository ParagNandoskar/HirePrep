/**
 * EXAMPLE: Fallback Pattern for Redis-Dependent Operations
 * 
 * This controller shows how to handle Redis being unavailable
 * while keeping the app running.
 */

const cacheService = require('../services/cacheService');
const { isRedisConnected } = require('../config/redis');

// Assume you have these models
// const Resume = require('../models/Resume');
// const User = require('../models/User');

/**
 * Example 1: Safe Cache Usage with DB Fallback
 * Works even if Redis is down
 */
async function getResumeWithCache(req, res) {
  try {
    const { resumeId } = req.params;

    // Attempt to get from cache (if Redis is available)
    let resume = null;
    
    if (isRedisConnected()) {
      resume = await cacheService.wrap(
        `resume:${resumeId}`,
        () => Resume.findById(resumeId), // DB fallback inside wrap
        3600 // 1 hour TTL
      );
    } else {
      // Redis is down - go straight to DB
      console.log('⚠️  Redis unavailable, fetching from DB');
      resume = await Resume.findById(resumeId);
    }

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    return res.json({ success: true, data: resume });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Example 2: Cache Invalidation with Fallback
 * Doesn't crash if Redis is unavailable
 */
async function updateResumeWithCacheInvalidation(req, res) {
  try {
    const { resumeId } = req.params;
    const updateData = req.body;

    // Update in DB
    const updated = await Resume.findByIdAndUpdate(resumeId, updateData, { new: true });

    // Try to invalidate cache (but don't crash if Redis is down)
    if (isRedisConnected()) {
      await cacheService.delete(`resume:${resumeId}`);
      console.log('✅ Cache invalidated');
    } else {
      console.log('⚠️  Redis unavailable, cache not invalidated (will expire naturally)');
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Example 3: Redis Session Storage with MongoDB Fallback
 * For the geminiVoiceService-style session management
 */
async function storeInterviewSession(sessionId, context, req, res) {
  try {
    // If Redis is available, use it (fast, temporary)
    if (isRedisConnected()) {
      const result = await cacheService.set(`interview:${sessionId}`, context, 3600);
      if (result) {
        console.log('✅ Session stored in Redis');
        return res.json({ success: true, storage: 'redis' });
      }
    }

    // Fallback: Store in MongoDB (persistent, slower)
    console.log('⚠️  Storing session in MongoDB (Redis unavailable)');
    // const interview = await Interview.findByIdAndUpdate(sessionId, {
    //   sessionData: context,
    //   updatedAt: new Date()
    // });

    return res.json({ success: true, storage: 'mongodb' });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Example 4: Graceful Service with Redis Status
 * Returns HTTP 200 even if metrics are missing
 */
async function getAppMetrics(req, res) {
  try {
    const metrics = {
      redis: {
        connected: isRedisConnected(),
        status: isRedisConnected() ? 'ready' : 'unavailable',
      },
      cacheEnabled: process.env.CACHE_DISABLED !== 'true',
      rateLimitingEnabled: process.env.RATE_LIMIT_DISABLED !== 'true',
    };

    // Try to get cache stats
    if (isRedisConnected()) {
      metrics.cache = await cacheService.getStats();
    }

    return res.json({
      success: true,
      data: metrics,
      message: 'API operational - some features degraded' 
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        redis: { connected: false, status: 'unavailable' },
        cacheEnabled: false,
        rateLimitingEnabled: false,
      },
      message: 'API operational - Redis unavailable, using MongoDB fallback'
    });
  }
}

module.exports = {
  getResumeWithCache,
  updateResumeWithCacheInvalidation,
  storeInterviewSession,
  getAppMetrics,
};
