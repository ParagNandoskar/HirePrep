# Production-Grade Node.js Backend - Setup & Implementation Guide

## Overview
This guide covers implementing the following production-ready features without breaking existing APIs:
1. **Redis Caching** - Automatic cache management with TTL and invalidation
2. **Redis-Backed Rate Limiting** - Security middleware with configurable limits
3. **Background Job Queue (Bull)** - Async job processing with retries
4. **Security Middleware** - Helmet, CORS, sanitization, XSS protection
5. **Environment Configuration** - Centralized config via .env

---

## 1. Installation

```bash
# Install Bull/BullMQ (if not already installed)
npm install bullmq

# Other required packages (should already be installed):
# - helmet
# - ioredis
# - rate-limit-redis
# - express-rate-limit
# - express-mongo-sanitize
# - xss-clean

npm install
```

---

## 2. Environment Configuration

Update your `.env` file with:

```env
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=your_password  # For production

# Cache Configuration
CACHE_TTL=3600          # 1 hour default cache
CACHE_DISABLED=false    # Set to true to disable caching

# Rate Limiting
RATE_LIMIT_WINDOW=60000 # 1 minute window
RATE_LIMIT_MAX=100      # Max 100 requests per minute
RATE_LIMIT_DISABLED=false

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

## 3. Files Created/Modified

### **New Files Created:**

#### `backend/src/services/cacheService.js`
Provides Redis-based caching with automatic TTL and cache invalidation.

**Usage:**
```javascript
const cacheService = require('../services/cacheService');

// Get from cache or DB
const data = await cacheService.wrap(
  'user:123',
  async () => { return await User.findById(123); },
  3600 // 1 hour TTL
);

// Set cache
await cacheService.set('key', value, ttl);

// Delete cache
await cacheService.delete('key');

// Invalidate pattern
await cacheService.deletePattern('user:123:*');

// Check stats
const stats = await cacheService.getStats();
```

---

#### `backend/src/middlewares/rateLimiter.js`
Redis-backed rate limiting middleware with preset configurations.

**Exported Limiters:**
- `apiLimiter` - 100 requests per minute (global)
- `authLimiter` - 5 requests per 15 minutes (login brute-force protection)
- `uploadLimiter` - 10 uploads per hour
- `aiLimiter` - 20 requests per 10 minutes (expensive API calls)

**Usage:**
```javascript
const { authLimiter, uploadLimiter } = require('../middlewares/rateLimiter');

router.post('/login', authLimiter, loginHandler);
router.post('/upload', uploadLimiter, uploadHandler);
```

---

#### `backend/src/services/queue.js`
Bull queue setup for background job processing.

**Queues:**
1. `resume-processing` - Resume parsing with NLP
2. `interview-analysis` - AI interview analysis
3. `job-recommendations` - Job matching
4. `email-notifications` - Email sending

**Usage:**
```javascript
const { addResumeJob, getJobStatus } = require('../services/queue');

// Add job
const job = await addResumeJob(resumeId, { candidateId, fileUrl });

// Check progress
const status = await getJobStatus(job.id);
// Returns: { state: 'active', progress: 65, attempts: 0 }

// Get stats
const stats = await getQueueStats('resume-processing');
// Returns: { active: 2, completed: 145, failed: 3, ... }
```

---

#### `backend/src/services/worker.js`
Background job worker (runs as separate process).

**Workers:**
- Resume Parser Worker
- Interview Analyzer Worker
- Job Recommendation Worker
- Email Sender Worker

**Usage:**
```bash
# Run in separate terminal/process
node src/services/worker.js

# Or with PM2:
pm2 start src/services/worker.js --name "hireprep-worker"
```

---

#### `backend/src/controllers/exampleController.js`
Example controller showing production-grade patterns:
- Resume caching
- Job queue integration
- Cache invalidation on updates
- Error handling

---

#### `backend/src/routes/exampleRoutes.js`
Example routes demonstrating all features:
- `GET /api/example/resume/:resumeId` - Cached retrieval
- `POST /api/example/resume/upload` - Queue processing
- `PUT /api/example/resume/:resumeId` - Cache invalidation
- `GET /api/example/job/:jobId/progress` - Job status polling
- `GET /api/example/queue/stats` - Queue statistics
- `GET /api/example/cache/stats` - Cache statistics

**Register in app.js:**
```javascript
const exampleRoutes = require('./routes/exampleRoutes');
app.use('/api/example', exampleRoutes);
```

---

### **Modified Files:**

#### `backend/src/app.js`
Updates:
- ✅ Added Helmet security headers
- ✅ Added data sanitization (NoSQL injection prevention)
- ✅ Added XSS protection
- ✅ Updated CORS to use env variables
- ✅ Applied global rate limiting to all `/api/` routes
- ✅ Applied specific rate limiters to sensitive endpoints
- ✅ Better organized middleware structure

**Key Changes:**
```javascript
// Added imports
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const { apiLimiter, authLimiter, uploadLimiter, aiLimiter } = require('./middlewares/rateLimiter');

// Applied middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xssClean());
app.use('/api/', apiLimiter); // Global rate limit

// Specific limiters on routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/gemini-voice', aiLimiter, geminiVoiceRoutes);
```

#### `backend/.env`
- Added Redis cache and rate limiting configuration
- Made CORS configurable via environment variables

---

## 4. Implementation Patterns

### **Pattern 1: Caching Frequently Accessed Data**

```javascript
async function getUser(userId) {
  // Cache hits save DB queries
  return await cacheService.wrap(
    `user:${userId}`,
    () => User.findById(userId).lean(),
    3600 // 1 hour TTL
  );
}
```

**Benefits:**
- Automatic cache miss handling
- Graceful fallback to DB on cache failure
- Configurable TTL

---

### **Pattern 2: Cache Invalidation on Updates**

```javascript
async function updateUser(userId, updateData) {
  // Update database
  const updated = await User.findByIdAndUpdate(userId, updateData);

  // Invalidate cache (CRITICAL!)
  await cacheService.delete(`user:${userId}`);
  
  // Invalidate related caches
  await cacheService.deletePattern(`user:${userId}:*`);

  return updated;
}
```

**Why Important:** Prevents serving stale data after updates.

---

### **Pattern 3: Queue Long-Running Operations**

```javascript
async function uploadAndProcessResume(req, res) {
  const { candidateId, fileUrl } = req.body;

  // Queue background job immediately
  const job = await addResumeJob(resumeId, { candidateId, fileUrl });

  // Return 202 (Accepted) with job ID
  res.status(202).json({
    success: true,
    jobId: job.id,
    checkProgressUrl: `/api/resume/job/${job.id}/progress`
  });

  // Client polls for progress:
  // GET /api/resume/job/{jobId}/progress
}
```

**Benefits:**
- Non-blocking user experience
- Automatic retries on failure
- Progress tracking

---

### **Pattern 4: Rate Limiting by Endpoint Severity**

```javascript
// Very permissive - general API (100 per minute)
app.use('/api/', apiLimiter);

// Strict - authentication (5 per 15 minutes)
app.use('/api/auth', authLimiter, authRoutes);

// Medium - uploads (10 per hour)
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Strict - expensive AI calls (20 per 10 minutes)
app.use('/api/gemini-voice', aiLimiter, geminiVoiceRoutes);
```

---

## 5. Monitoring & Debugging

### **Check Cache Stats:**
```bash
GET /api/example/cache/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "memoryUsage": "2.5M",
    "keysCount": 342
  }
}
```

---

### **Check Queue Stats:**
```bash
GET /api/example/queue/stats?queueName=resume-processing
```

Response:
```json
{
  "success": true,
  "data": {
    "active": 2,
    "completed": 145,
    "failed": 3,
    "waiting": 5
  }
}
```

---

### **Manual Cache Clear (Development Only):**
```javascript
await cacheService.clear();
```

---

### **View Redis Keys (via CLI):**
```bash
redis-cli

# Inside redis-cli:
KEYS *
KEYS resume:*
GET resume:123
```

---

## 6. Production Deployment

### **Docker Compose Setup:**
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --appendfilename "appendonly.aof"

  backend:
    build: .
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - redis

  worker:
    build: .
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      NODE_ENV: production
    command: node src/services/worker.js
    depends_on:
      - redis

volumes:
  redis-data:
```

---

### **AWS Production (ElastiCache):**
```env
# Update .env for production
REDIS_HOST=your-elasticache-endpoint.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_auth_token
NODE_ENV=production
RATE_LIMIT_DISABLED=false
CACHE_TTL=3600
```

---

## 7. Troubleshooting

### **Issue: Redis Connection Refused**
```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Docker start
docker run -d -p 6379:6379 redis

# Or check if Redis is running
redis-cli PING
```

---

### **Issue: Rate Limit Too Strict**
```env
# Adjust in .env
RATE_LIMIT_MAX=200  # Increase from 100
RATE_LIMIT_WINDOW=120000  # Increase window to 2 minutes
```

---

### **Issue: Cache Stale Data**
```javascript
// Clear specific cache pattern
await cacheService.deletePattern('user:*');

// Or clear all
await cacheService.clear();
```

---

### **Issue: Job Never Completes**
```bash
# Check worker is running
pm2 list

# View worker logs
pm2 logs hireprep-worker

# Check queue stats
GET /api/example/queue/stats

# Delete stuck job
redis-cli
> DEL bull:resume-processing:job:id
```

---

## 8. Performance Metrics

### **Cache Impact:**
- **Without cache:** DB query = ~50ms
- **With cache:** Cache hit = ~5ms (10x faster)
- **Cache hit rate target:** 80%+

### **Rate Limiting Impact:**
- **Prevents API abuse:** 100 requests per minute = ~1.67 per second
- **Auth security:** 5 attempts per 15 minutes prevents brute force
- **Cost savings:** Rate limit expensive AI calls (20 per 10 min)

### **Queue Benefits:**
- **Non-blocking:** Resume parsing doesn't block user response
- **Automatic retries:** Failed jobs retry with exponential backoff
- **Monitor progress:** Clients can poll job status

---

## 9. Summary of Features

| Feature | File | Status | Break Existing? |
|---------|------|--------|-----------------|
| Redis Caching | `cacheService.js` | ✅ Ready | ❌ No |
| Rate Limiting | `rateLimiter.js` | ✅ Ready | ⚠️ May (tune limits if needed) |
| Background Queues | `queue.js` | ✅ Ready | ❌ No |
| Queue Workers | `worker.js` | ✅ Ready | ❌ No |
| Security Middleware | `app.js` | ✅ Ready | ❌ No |
| Example Implementation | `exampleController.js` | ✅ Ready | ❌ No |

---

## 10. Next Steps

1. **Test endpoints** using `exampleRoutes.js`
2. **Integrate caching** into existing controllers:
   ```javascript
   // Before
   const user = await User.findById(id);
   
   // After (with caching)
   const user = await cacheService.wrap(`user:${id}`, () => User.findById(id));
   ```

3. **Add queue jobs** to heavy operations:
   - Resume uploads
   - Interview analysis
   - Job recommendations

4. **Monitor in production:**
   - Cache hit rate
   - Queue job success rate
   - Rate limit violations

5. **Deploy worker** as separate service:
   ```bash
   pm2 start src/services/worker.js --name "hireprep-worker"
   ```

---

## Support

For issues or questions:
- Check Redis connection: `redis-cli PING`
- Check queue stats: `GET /api/example/queue/stats`
- Check cache: `GET /api/example/cache/stats`
- View worker logs: `pm2 logs hireprep-worker`
