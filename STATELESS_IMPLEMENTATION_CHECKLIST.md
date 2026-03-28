# HirePrep Stateless Backend - Implementation Checklist

## 📋 Pre-Implementation

- [ ] Read `STATELESS_EXECUTIVE_SUMMARY.md` (5 min)
- [ ] Review `STATELESS_QUICK_REFERENCE.md` (10 min)
- [ ] Understand architecture from `STATELESS_ARCHITECTURE_DIAGRAMS.md` (10 min)
- [ ] Set up development environment with Redis installed locally
- [ ] Create AWS S3 bucket for development testing
- [ ] Get AWS credentials for development account
- [ ] Backup current working code to git branch `backup/before-stateless`

---

## ✅ PHASE 1: Redis Session Storage (2-3 hours)

### Setup
- [ ] Terminal: `npm install redis ioredis`
- [ ] Install Redis locally (Docker or direct)
  ```bash
  # Option 1: Docker
  docker run -d -p 6379:6379 redis:7-alpine
  
  # Option 2: Homebrew (Mac)
  brew install redis
  brew services start redis
  
  # Option 3: Download (Windows/Linux)
  # Visit redis.io/download
  ```

### Code Changes
- [ ] Create `backend/src/config/redis.js` (copy from STATELESS_CODE_GUIDE.md)
  - [ ] Verify client connection on startup
  - [ ] Test: `redis-cli ping` returns PONG
  
- [ ] Update `backend/src/services/geminiVoiceService.js`
  - [ ] Import redis client at top
  - [ ] Replace `this.activeInterviews = new Map()` with redis setup
  - [ ] Add `getSessionContext()` helper method
  - [ ] Add `setSessionContext()` helper method
  - [ ] Add `deleteSessionContext()` helper method
  - [ ] Update `initializeInterview()` to use `setSessionContext()`
  - [ ] Update `generateNextQuestion()` to use `getSessionContext()`
  - [ ] Update `processAnswer()` to use `getSessionContext()`
  - [ ] Update `generateFinalAnalysis()` to use `getSessionContext()`
  - [ ] Update cleanup methods to delete from Redis
  - [ ] Test: Verify all `this.activeInterviews` references removed

### Testing Phase 1
- [ ] Terminal: `npm run dev` (or your dev command)
- [ ] Create interview session: Start an interview
- [ ] Test Redis storage
  ```bash
  redis-cli
  > KEYS interview:*
  # Should show active sessions
  > GET interview:abc123
  # Should show session JSON
  ```
- [ ] Test persistence: **Restart server while interview active**
  - [ ] Press Ctrl+C to stop server
  - [ ] Restart server
  - [ ] Try to continue interview
  - [ ] Verify: Interview session still exists ✅
  
- [ ] Test fallback: Clear Redis, continue interview
  ```bash
  redis-cli FLUSHDB
  # Continue interview → should rebuild from MongoDB
  ```

- [ ] Test TTL: Wait 1+ hour, verify session expires
  ```bash
  redis-cli
  > TTL interview:abc123
  # Should show remaining seconds
  ```

**Commit:** `git commit -m "Phase 1: Add Redis session storage"`

---

## ✅ PHASE 2: Socket.IO Redis Adapter (1-2 hours)

### Setup
- [ ] Terminal: `npm install @socket.io/redis-adapter`

### Code Changes
- [ ] Update `backend/server.js`
  - [ ] Import `@socket.io/redis-adapter`
  - [ ] Import Redis client
  - [ ] Create pub/sub clients from Redis
  - [ ] Pass adapter to Socket.IO constructor
  - [ ] Update all socket event handlers to async
  - [ ] Add logging to socket events
  - [ ] Remove `/uploads` static file serving (prepared for Phase 3)
  - [ ] Add `/health` endpoint

### Testing Phase 2
- [ ] Terminal: Start 2 instances on different ports
  ```bash
  # Terminal 1
  PORT=5000 npm run dev
  
  # Terminal 2 (new terminal)
  PORT=5001 npm run dev
  ```

- [ ] Open 2 browser/API windows
  - [ ] Window 1: Connect to `http://localhost:5000`
  - [ ] Window 2: Connect to `http://localhost:5001`

- [ ] Test cross-instance communication
  - [ ] Join same interview room from different instances
  - [ ] Send message from Window 1
  - [ ] Window 2 should receive it ✅
  - [ ] Send message from Window 2
  - [ ] Window 1 should receive it ✅

- [ ] Test WebRTC signaling
  - [ ] Simulate offer from one instance
  - [ ] Verify answer received on other instance ✅

- [ ] Test Redis Pub/Sub
  ```bash
  redis-cli
  > MONITOR
  # Send socket message, watch PUBLISH commands appear
  ```

**Commit:** `git commit -m "Phase 2: Add Socket.IO Redis adapter"`

---

## ✅ PHASE 3: AWS S3 File Storage (3-4 hours)

### Setup
- [ ] Create AWS S3 bucket
  ```bash
  # In AWS Console:
  # 1. S3 → Create bucket → hireprep-dev
  # 2. Enable versioning (for safety)
  # 3. Block all public access (security)
  # 4. Copy bucket name
  ```

- [ ] Create IAM user with S3 permissions
  - [ ] AWS Console → IAM → Users → Create user
  - [ ] Policy: AmazonS3FullAccess (or limited policy)
  - [ ] Save Access Key ID and Secret Access Key

- [ ] Install AWS SDK
  - [ ] Terminal: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

### Code Changes
- [ ] Create `backend/src/services/s3Service.js`
  - [ ] Copy from STATELESS_CODE_GUIDE.md
  - [ ] Test S3 connection on startup
  
- [ ] Update `backend/.env`
  ```bash
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=your_key
  AWS_SECRET_ACCESS_KEY=your_secret
  AWS_S3_BUCKET=hireprep-dev
  ```

- [ ] Update `backend/src/config/aws.js` (if exists)
  - [ ] Verify credentials are loaded

- [ ] Update `backend/middleware/upload.js`
  - [ ] Replace `multer.diskStorage()` with `multer.memoryStorage()`
  - [ ] Remove localStorage config
  - [ ] Remove deleteLocalFile function
  - [ ] Keep error handling

- [ ] Update `backend/src/controllers/resumeController.js` (and similar)
  - [ ] Import S3Service
  - [ ] In `uploadResume()`: 
    - [ ] Replace file system logic with S3Service.uploadFile()
    - [ ] Store S3 key in MongoDB, NOT local path
    - [ ] Generate signed URL for download
  - [ ] Add `getResumeDownloadUrl()` endpoint
  - [ ] Add `deleteResume()` endpoint with S3 delete
  - [ ] Test each method

- [ ] Update `backend/src/controllers/candidateController.js` (logo upload)
  - [ ] Replace local storage with S3Service
  - [ ] Store S3 key in MongoDB

- [ ] Remove static file serving
  - [ ] Delete from `server.js`: `app.use('/uploads', ...)`
  - [ ] Delete or empty `/backend/uploads` directory

### Testing Phase 3
- [ ] Upload a test resume
  ```bash
  curl -X POST http://localhost:5000/api/resumes/upload \
    -F "resume=@test.pdf" \
    -H "Authorization: Bearer token"
  
  # Response should show:
  # { fileKey: "resumes/1234567_abc_test.pdf" }
  ```

- [ ] Verify S3 bucket
  ```bash
  aws s3 ls s3://hireprep-dev/resumes/
  # Should see uploaded file
  ```

- [ ] Test download URL
  ```bash
  # Get signed URL from API
  curl http://localhost:5000/api/resumes/abc123/download \
    -H "Authorization: Bearer token"
  
  # Should return signed URL
  # Try downloading it in browser → works ✅
  ```

- [ ] Test from different instance
  ```bash
  PORT=5001 npm run dev
  # Upload to 5000, download from 5001 → works ✅
  ```

- [ ] Test deletion
  ```bash
  curl -X DELETE http://localhost:5000/api/resumes/abc123 \
    -H "Authorization: Bearer token"
  
  # Check S3: File should be deleted
  aws s3 ls s3://hireprep-dev/resumes/
  ```

- [ ] Verify MongoDB stores S3 keys
  ```bash
  # In MongoDB
  db.resumes.findOne()
  # Should show:
  # { fileKey: "resumes/1234567_abc_test.pdf" }
  # NOT { filePath: "/uploads/resumes/..." }
  ```

**Commit:** `git commit -m "Phase 3: Migrate file storage to AWS S3"`

---

## ✅ PHASE 4: PM2 Cluster Setup (1 hour)

### Setup
- [ ] Install PM2 globally
  ```bash
  npm install -g pm2
  npm install pm2 --save-dev
  ```

### Code Changes
- [ ] Create `backend/ecosystem.config.js`
  - [ ] Copy from STATELESS_CODE_GUIDE.md
  - [ ] Verify all environment variables set

- [ ] Update `backend/.env` (production)
  ```bash
  NODE_ENV=production
  REDIS_HOST=localhost
  REDIS_PORT=6379
  AWS_S3_BUCKET=hireprep-prod
  PORT=5000
  ```

- [ ] Create logs directory
  ```bash
  mkdir -p backend/logs
  ```

- [ ] Optional: Add npm scripts to `package.json`
  ```json
  {
    "scripts": {
      "start:cluster": "pm2 start ecosystem.config.js",
      "stop:cluster": "pm2 delete hireprep-api",
      "restart:cluster": "pm2 restart hireprep-api",
      "logs": "pm2 logs"
    }
  }
  ```

### Testing Phase 4 (Local)
- [ ] Start cluster
  ```bash
  cd backend
  pm2 start ecosystem.config.js
  
  # Check status
  pm2 status
  # Should show 1 instance running
  ```

- [ ] Test single instance
  ```bash
  curl http://localhost:5000/health
  # Should return { status: 'ok', ... }
  ```

- [ ] Start with 2 instances
  ```bash
  pm2 restart hireprep-api -i 2
  pm2 status
  # Should show 2 instances
  ```

- [ ] Test load balancing
  ```bash
  # Send 10 requests
  for i in {1..10}; do curl http://localhost:5000/health; done
  
  # Check logs - should be distributed
  pm2 logs hireprep-api
  ```

- [ ] Test graceful reload (zero-downtime)
  ```bash
  pm2 reload hireprep-api
  # While reloading, send requests
  # Should get 0 errors (rolling restart)
  ```

- [ ] Test disaster recovery
  ```bash
  # Start interview on instance 1
  # Kill instance 1
  pm2 delete hireprep-api --silent
  pm2 start ecosystem.config.js --instances 1
  
  # Try to continue interview
  # Should work (Redis + MongoDB) ✅
  ```

- [ ] Monitor resources
  ```bash
  pm2 monit
  # Watch CPU, memory for all instances
  ```

### Testing Phase 4 (Production Staging)
- [ ] Deploy to staging environment
  ```bash
  git push origin develop
  # Trigger staging build
  ssh staging-server
  cd /var/www/hireprep/backend
  pm2 start ecosystem.config.js --env production
  ```

- [ ] Run 24-hour stability test
  - [ ] Monitor logs for errors
  - [ ] Check memory usage (no leaks)
  - [ ] Monitor database connections
  - [ ] Verify session persistence

- [ ] Load testing
  ```bash
  # Use tool like k6 or locust
  # Simulate 100+ concurrent users
  # Verify no 500 errors
  # Check response times < 200ms
  ```

**Commit:** `git commit -m "Phase 4: Add PM2 cluster configuration"`

---

## 🔍 Final Verification Checklist

### Session Persistence
- [ ] Start interview
- [ ] Restart server (via PM2)
- [ ] Continue interview without data loss ✅
- [ ] Verify in Redis: `redis-cli KEYS interview:*`
- [ ] Verify in MongoDB: Interview history persists

### Multi-Instance Communication
- [ ] Start 2 instances
- [ ] Send Socket.IO message from instance 1
- [ ] Receive on instance 2 ✅
- [ ] WebRTC signaling works
- [ ] Real-time data flows correctly

### File Storage
- [ ] Upload file to instance 1
- [ ] Download from instance 2 ✅
- [ ] File persists after restart
- [ ] S3 bucket has file
- [ ] MongoDB has S3 key reference

### Scaling
- [ ] Scale to 4 instances: `pm2 restart hireprep-api -i 4`
- [ ] All work properly ✅
- [ ] No session/data loss
- [ ] Load distributes evenly

### Performance
- [ ] Response time < 200ms average
- [ ] No memory leaks (24h run)
- [ ] CPU usage reasonable (< 80%)
- [ ] Database connections stable

### Monitoring
- [ ] PM2 status shows all instances healthy
- [ ] Logs clean (no errors)
- [ ] Redis pub/sub working
- [ ] S3 requests succeeding
- [ ] MongoDB connections stable

---

## 🚀 Rollback Plan (If Issues Found)

### Rollback Phase 4
```bash
pm2 delete hireprep-api
npm run dev  # Back to single instance
```

### Rollback Phase 3
```bash
git revert <phase3-commit>
npm install
npm run dev
```

### Rollback Phase 2
```bash
git revert <phase2-commit>
npm install
npm run dev
```

### Rollback Phase 1
```bash
git revert <phase1-commit>
npm install
npm run dev
# Session data lost but system works
```

---

## 📊 Progress Tracking

- [ ] Phase 1 Complete: `__/__/____` 
- [ ] Phase 1 Tested: `__/__/____` ✅
- [ ] Phase 2 Complete: `__/__/____`
- [ ] Phase 2 Tested: `__/__/____` ✅
- [ ] Phase 3 Complete: `__/__/____`
- [ ] Phase 3 Tested: `__/__/____` ✅
- [ ] Phase 4 Complete: `__/__/____`
- [ ] Phase 4 Tested: `__/__/____` ✅
- [ ] Final Verification: `__/__/____` ✅
- [ ] Production Deployed: `__/__/____` ✅

---

## 📞 Support Resources

When stuck, consult:
1. **STATELESS_CODE_GUIDE.md** - Exact code to copy
2. **STATELESS_BACKEND_PLAN.md** - Full explanations
3. **STATELESS_ARCHITECTURE_DIAGRAMS.md** - How pieces fit together
4. **STATELESS_QUICK_REFERENCE.md** - Quick lookup

---

## ✅ Completion Criteria

All of the following must be true:

- [ ] Interview sessions survive server restart
- [ ] Real-time communication works across 2+ instances
- [ ] Files uploaded on one instance accessible from all
- [ ] PM2 cluster mode runs with 2-4 instances without errors
- [ ] No data loss during graceful restart
- [ ] MongoDB contains all historical data
- [ ] Redis contains active session state
- [ ] S3 contains all uploaded files
- [ ] Load distributes across instances
- [ ] Monitoring shows healthy state
- [ ] 24-hour stability test passes

---

**Start Date:** `__________`  
**Expected Completion:** `__________`  
**Status:** Ready to Begin ✅

