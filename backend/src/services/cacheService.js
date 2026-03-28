const redisClient = require('../config/redis');
const { isRedisConnected } = require('../config/redis');

/**
 * Cache Service - Manages Redis caching with automatic TTL
 * Supports JSON serialization and cache invalidation
 * Falls back gracefully if Redis is unavailable
 */

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL, 10) || 3600; // 1 hour default

class CacheService {
  /**
   * Get cached value by key
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached data or null if not found/expired
   */
  async get(key) {
    try {
      // Disable cache if configured
      if (process.env.CACHE_DISABLED === 'true') {
        return null;
      }

      // Skip Redis if not connected (non-blocking fallback)
      if (!isRedisConnected()) {
        return null;
      }

      const cachedData = await redisClient.get(key);
      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      // Don't crash - return null and let caller fetch from DB
      return null;
    }
  }

  /**
   * Set cached value with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
   * @returns {Promise<boolean>} - Success/failure
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      // Disable cache if configured
      if (process.env.CACHE_DISABLED === 'true') {
        return false;
      }

      // Skip Redis if not connected (non-blocking fallback)
      if (!isRedisConnected()) {
        return false;
      }

      const serialized = JSON.stringify(value);
      await redisClient.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      // Don't crash the app if caching fails
      return false;
    }
  }

  /**
   * Delete cached value by key
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success/failure
   */
  async delete(key) {
    try {
      // Skip if Redis not connected
      if (!isRedisConnected()) {
        return false;
      }

      const result = await redisClient.del(key);
      return result > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * Useful for invalidating related cache entries
   * @param {string} pattern - Key pattern (e.g., "user:123:*")
   * @returns {Promise<number>} - Count of deleted keys
   */
  async deletePattern(pattern) {
    try {
      // Skip if Redis not connected
      if (!isRedisConnected()) {
        return 0;
      }

      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      const result = await redisClient.del(...keys);
      return result;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear all cache (use with caution!)
   * @returns {Promise<boolean>} - Success/failure
   */
  async clear() {
    try {
      if (!isRedisConnected()) {
        return false;
      }

      await redisClient.flushdb();
      console.log('⚠️  Cache cleared completely');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if cache is available
   * @returns {Promise<boolean>} - Is Redis connected and responsive
   */
  async isAvailable() {
    try {
      if (!isRedisConnected()) {
        return false;
      }

      const pong = await redisClient.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} - Cache stats (memory, keys count, etc.)
   */
  async getStats() {
    try {
      if (!isRedisConnected()) {
        return {
          connected: false,
          memoryUsage: 'N/A',
          keysCount: 0,
        };
      }

      const info = await redisClient.info('memory');
      const dbsize = await redisClient.dbsize();
      return {
        connected: true,
        memoryUsage: info.split('used_memory_human:')[1]?.split('\r')[0] || 'N/A',
        keysCount: dbsize,
      };
    } catch (error) {
      return {
        connected: false,
        memoryUsage: 'N/A',
        keysCount: 0,
      };
    }
  }

  /**
   * Wrap a data-fetching function with automatic caching
   * Get from cache -> if miss -> fetch from source -> store in cache
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>} - Cached or freshly fetched data
   */
  async wrap(key, fetchFn, ttl = DEFAULT_TTL) {
    try {
      // Try cache only if Redis is connected
      if (isRedisConnected()) {
        const cached = await this.get(key);
        if (cached !== null) {
          return cached;
        }
      }

      // Cache miss or Redis unavailable -> fetch from source
      const fresh = await fetchFn();
      
      // Cache the fresh data if Redis is available
      if (fresh !== null && fresh !== undefined && isRedisConnected()) {
        await this.set(key, fresh, ttl);
      }
      
      return fresh;
    } catch (error) {
      // Don't crash - throw to let caller handle
      console.error(`Cache WRAP error for key "${key}":`, error.message);
      throw error;
    }
  }
}

module.exports = new CacheService();
