# HirePrep Stateless Backend - Design & Implementation Plan

## Executive Summary
Your backend has **3 critical stateless violations** preventing horizontal scaling. This doc provides exact code locations and implementation steps.

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### **ISSUE #1: In-Memory Interview Session Storage**

**Severity:** 🔴 CRITICAL  
**Location:** `backend/src/services/geminiVoiceService.js` (Line 16)

```javascript
// ❌ CURRENT - NOT STATELESS
class GeminiVoiceInterviewService {
  constructor() {
    this.activeInterviews = new Map();  // ← PROBLEM: Lost on restart!
    this.MIN_BASELINE_QUESTIONS = ...;
  }

  async initializeInterview(jobId, candidateName, options = {}) {
    // ... setup logic ...
    this.activeInterviews.set(sessionId, interviewContext);  // Line 118
    return { sessionId, ... };
  }

  async generateNextQuestion(sessionId) {
    let context = this.activeInterviews.get(sessionId);  // Line 135 - May be null!
    if (!context) {
      // Fallback: rebuild from DB (slower)
      const pastQuestions = await QuestionAnalysis.find({ sessionId });
    }
  }

  async processAnswer(sessionId, answerText, behavioralData) {
    const context = this.activeInterviews.get(sessionId);  // Line 313 - May be null!
    // ⚠️ Critical: If server restarts, context is gone
  }
}
```

**Why it's not stateless:**
- When Node process restarts (nodemon, deploy, crash), `Map` is cleared
- PM2 cluster mode: Req A hits instance 1 (stores in Map), Req B hits instance 2 (no Map data)
- Every restart loses active interview state
- 100+ concurrent users → data loss during scale events

**DependentCode:**
- [geminiVoiceController.js](geminiVoiceController.js#L209) - `processAnswer()` expects Map
- [geminiVoiceController.js](geminiVoiceController.js#L254) - `getInterviewProgress()` reads Map
- [geminiVoiceController.js](geminiVoiceController.js#L242) - `generateFinalAnalysis()` relies on Map

---

### **ISSUE #2: Socket.IO Real-Time Communication (Single Instance)**

**Severity:** 🟡 HIGH  
**Location:** `backend/server.js` (Lines 65-103)

```javascript
// ❌ CURRENT - Single Instance Only
const io = socketIo(server, { cors: { ... } });

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinInterview', (interviewId) => {
    socket.join(`interview_${interviewId}`);  // ← Local room only!
  });

  socket.on('interviewMessage', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('interviewMessage', data);
    // ↑ Only broadcasts to THIS instance's connected sockets
  });

  socket.on('offer', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('offer', data);
    // ↑ WebRTC signaling lost if peer connected to different instance
  });
});

app.set('io', io);  // ← Global state in app object
```

**Why it's not stateless:**
- Room joins only registered in single instance memory
- Multi-instance setup: Socket A on instance 1, Socket B on instance 2 → no communication
- WebRTC signaling fails across instances
- No way to broadcast to same user on different instances

**Dependent Code:**
- [interviewController.js](interviewController.js#L434) - `io.to().emit()` calls
- Real-time updates won't work with PM2 cluster

---

### **ISSUE #3: Local File System Storage**

**Severity:** 🟡 MODERATE  
**Location:** `backend/middleware/upload.js` (Lines 35-54)

```javascript
// ❌ CURRENT - Not Stateless (Disk Bound)
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = file.fieldname === 'logo' 
      ? path.join(__dirname, '../uploads/logos')  // ← Instance-specific filesystem
      : path.join(__dirname, '../uploads/resumes');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}_${file.originalname}`;
    cb(null, filename);
  }
});

module.exports = { resumeUpload, logoUpload, ... };
```

**Why it's not stateless:**
- Files stored in `/uploads/` on one instance's disk
- User uploads to instance 1, requests file from instance 2 → 404
- Multiple instances = multiple copies of same file
- No shared storage between instances
- Server restart = missing files

**Static Serving Problem:**
```javascript
// backend/server.js Line 12
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ↑ Only serves from THIS instance's filesystem
```

---

## ✅ STATELESS IMPLEMENTATION PLAN

### **Phase 1: Redis Session Storage (CRITICAL)**

**Objective:** Replace Map with Redis for interview context  
**Implementation Time:** 2-3 hours  
**Files to Modify:** 4

#### Step 1.1: Install Redis Package
```bash
cd backend
npm install redis ioredis
```

#### Step 1.2: Create Redis Client (`backend/src/config/redis.js`)
```javascript
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected');
});

module.exports = redisClient;
```

#### Step 1.3: Refactor GeminiVoiceService
**File:** `backend/src/services/geminiVoiceService.js`

**Before (Line 13-19):**
```javascript
class GeminiVoiceInterviewService {
  constructor() {
    this.activeInterviews = new Map();  // ❌ Not stateless
    this.MIN_BASELINE_QUESTIONS = ...;
  }
}
```

**After:**
```javascript
const redisClient = require('../config/redis');

class GeminiVoiceInterviewService {
  constructor() {
    this.redisClient = redisClient;
    this.SESSION_TTL = 3600; // 1 hour TTL
    this.MIN_BASELINE_QUESTIONS = ...;
  }

  // Helper: Get from Redis
  async getSessionContext(sessionId) {
    try {
      const data = await this.redisClient.get(`interview:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('⚠️ Redis get failed, falling back to DB:', error.message);
      return null;
    }
  }

  // Helper: Store in Redis
  async setSessionContext(sessionId, context) {
    try {
      await this.redisClient.setex(
        `interview:${sessionId}`,
        this.SESSION_TTL,
        JSON.stringify(context)
      );
    } catch (error) {
      console.error('❌ Redis set failed:', error.message);
      // Graceful degradation: Continue without Redis
    }
  }

  // Replace all this.activeInterviews.set() calls
  async initializeInterview(jobId, candidateName, options = {}) {
    // ... existing setup ...
    const sessionId = generateSessionId();
    await this.setSessionContext(sessionId, interviewContext);
    return { sessionId, ... };
  }

  // Replace all this.activeInterviews.get() calls
  async generateNextQuestion(sessionId) {
    let context = await this.getSessionContext(sessionId);
    if (!context) {
      // Fallback: rebuild from MongoDB (already coded)
      const pastQuestions = await QuestionAnalysis.find({ sessionId });
      context = this.rebuildContextFromDB(pastQuestions);
    }
    // Continue processing...
  }
}
```

**Update All Callsites:**
- Line 118: `this.activeInterviews.set()` → `await this.setSessionContext()`
- Line 135: `this.activeInterviews.get()` → `await this.getSessionContext()`
- Line 175: Same pattern
- Line 204: Same pattern
- Line 313: Same pattern
- Line 359: Same pattern
- Line 836: `this.activeInterviews.delete()` → `await this.redisClient.del()`
- Line 869: Same as above

---

### **Phase 2: Socket.IO Redis Adapter (HIGH)**

**Objective:** Enable cross-instance Socket.IO communication  
**Implementation Time:** 1-2 hours  
**Files to Modify:** 1

#### Step 2.1: Install Socket.IO Redis Adapter
```bash
npm install @socket.io/redis-adapter
```

#### Step 2.2: Update `backend/server.js`
**Before (Line 37-60):**
```javascript
const io = socketIo(server, { cors: { ... } });

io.on('connection', (socket) => {
  // Single-instance room joins
});

app.set('io', io);
```

**After:**
```javascript
const socketIoRedisAdapter = require('@socket.io/redis-adapter');
const redisClient = require('./src/config/redis');

// Create pub/sub clients for Socket.IO adapter
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

const io = socketIo(server, { 
  cors: { /* existing config */ },
  adapter: socketIoRedisAdapter.createAdapter(pubClient, subClient)
});

io.on('connection', (socket) => {
  // Rooms now synchronized across all instances!
  socket.on('joinInterview', (interviewId) => {
    socket.join(`interview_${interviewId}`);
    console.log(`✅ User ${socket.id} joined interview ${interviewId}`);
  });

  socket.on('interviewMessage', (data) => {
    // Now broadcasts to ALL instances
    socket.to(`interview_${data.interviewId}`).emit('interviewMessage', data);
  });

  socket.on('offer', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('ice-candidate', data);
  });

  socket.on('analysisData', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('analysisUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.set('io', io);
```

---

### **Phase 3: AWS S3 File Storage (MODERATE)**

**Objective:** Replace local disk storage with S3  
**Implementation Time:** 3-4 hours  
**Files to Modify:** 3

#### Step 3.1: Install AWS SDK
```bash
npm install @aws-sdk/client-s3
```

#### Step 3.2: Create S3 Service (`backend/src/services/s3Service.js`)
```javascript
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.bucketName = process.env.AWS_S3_BUCKET || 'hireprep-uploads';
  }

  async uploadFile(fileBuffer, fileName, folder = 'resumes') {
    try {
      const Key = `${folder}/${Date.now()}_${fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: Key,
        Body: fileBuffer,
        ContentType: this.getContentType(fileName),
        ServerSideEncryption: 'AES256'
      });

      await this.s3Client.send(command);
      return { Key, Url: `s3://${this.bucketName}/${Key}` };
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw error;
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('❌ S3 delete failed:', error);
      return false;
    }
  }

  getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new S3Service();
```

#### Step 3.3: Update Upload Middleware
**File:** `backend/middleware/upload.js`

**Before:**
```javascript
const multer = require('multer');
const localStorage = multer.diskStorage({ ... });
const resumeUpload = multer({ storage: localStorage, ... });
```

**After:**
```javascript
const multer = require('multer');
const memoryStorage = multer.memoryStorage();

// Upload to memory (not disk)
const resumeUpload = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const logoUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => { ... },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Remove localStorage & deleteLocalFile functions entirely
```

#### Step 3.4: Update Controllers
**File:** `backend/src/controllers/resumeController.js` (example)

**Before:**
```javascript
const resumeUpload = require('../../middleware/upload').resumeUpload;

exports.uploadResume = async (req, res) => {
  const filePath = req.file.path;  // ← Local disk path
  // ... parse resume ...
};
```

**After:**
```javascript
const s3Service = require('../services/s3Service');
const resumeUpload = require('../../middleware/upload').resumeUpload;

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to S3
    const fileBuffer = req.file.buffer;
    const { Key } = await s3Service.uploadFile(
      fileBuffer,
      req.file.originalname,
      'resumes'
    );

    // Store S3 key in DB (not file path)
    const resume = new Resume({
      userId: req.user._id,
      fileKey: Key,  // ← S3 key, not local path
      originalName: req.file.originalname,
      // ... other fields ...
    });

    await resume.save();

    // Get signed URL for download
    const downloadUrl = await s3Service.getSignedUrl(Key);

    res.json({
      success: true,
      resume: {
        id: resume._id,
        fileName: resume.originalName,
        downloadUrl: downloadUrl,  // ← Signed URL instead of local path
        uploadedAt: resume.uploadedAt
      }
    });
  } catch (error) {
    console.error('Resume upload failed:', error);
    res.status(500).json({ error: error.message });
  }
};
```

#### Step 3.5: Remove Static File Serving
**File:** `backend/server.js`

**Delete (Line 12):**
```javascript
// ❌ DELETE THIS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

Add instead:
```javascript
// Redirect to S3 signed URLs (S3 handles serving)
app.get('/api/file/:fileKey', async (req, res) => {
  try {
    const url = await s3Service.getSignedUrl(req.params.fileKey);
    res.redirect(url);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});
```

---

### **Phase 4: PM2 Cluster Configuration**

**Objective:** Enable horizontal scaling with multiple instances  
**Implementation Time:** 1 hour  
**Files to Create:** 1

#### Step 4.1: Create PM2 Config
**File:** `backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'hireprep-api',
      script: './server.js',
      instances: 'max',  // Auto-scale to CPU count
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        AWS_REGION: process.env.AWS_REGION || 'us-east-1'
      },
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Logging
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Rolling restart for zero downtime
      watch: false,  // Disable watch in production
      ignore_watch: ['node_modules', 'logs']
    }
  ]
};
```

#### Step 4.2: Update `.env`
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # If auth required

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=hireprep-uploads

# Node environment
NODE_ENV=production
```

#### Step 4.3: Deploy with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start cluster
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs hireprep-api

# Graceful reload (zero downtime)
pm2 reload hireprep-api

# Delete app
pm2 delete hireprep-api
```

---

## 📊 Testing Stateless Behavior

### Test 1: Session Persistence Across Restarts
```bash
# 1. Start interview
curl -X POST http://localhost:5000/api/gemini-voice/initialize \
  -H "Content-Type: application/json" \
  -d '{"jobId":"job123","candidateName":"John"}'
# → Returns { sessionId: "abc123" }

# 2. While interview is active, restart server
pm2 restart hireprep-api

# 3. Try to get next question
curl -X POST http://localhost:5000/api/gemini-voice/next-question \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"abc123"}'
# ✅ Should work (Redis fallback)
# ❌ Before: Would fail (Map cleared)
```

### Test 2: Multi-Instance Load Balancer
```bash
# Start 2 instances
pm2 start ecosystem.config.js --instances 2

# Open 2 browser windows
# Window 1: Join interview room via instance 1
# Window 2: Join same interview room via instance 2

# Both should see real-time updates (Socket.IO adapter)
# ✅ Should work with Redis adapter
# ❌ Before: Only local instance would update
```

### Test 3: File Upload Accessibility
```bash
# 1. Upload resume
curl -X POST http://localhost:5000/api/resumes/upload \
  -F "resume=@resume.pdf" \
  -H "Authorization: Bearer token"

# 2. Try to download from different instance
curl http://localhost:5001/api/file/resumes/abc123_resume.pdf

# ✅ Should work (S3 serves all instances)
# ❌ Before: Would 404 (file only on instance 1)
```

---

## 🎯 Rollout Strategy

### Minimal Risk Approach:
1. **Deploy Redis** - Production Redis instance (managed service)
2. **Deploy Session Migration** - GeminiVoiceService → Redis only
3. **Deploy Socket.IO Adapter** - Zero code logic change, just adapter
4. **Setup S3 Bucket** - Create bucket, configure permissions
5. **Migrate File Uploads** - New uploads go to S3, old files remain on disk
6. **Deploy PM2** - Start cluster mode with single instance initially
7. **Scale to 2, then 4 instances** - Verify no data loss
8. **Remove old upload directories** - After verification period (1-2 weeks)

### Rollback Plan:
- Keep old local upload code commented out
- Keep Map-based session code as fallback
- RedisSessions configured with 1-hour TTL → graceful timeout

---

## 🚀 Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| **Stateless Violations** | 3 Critical | 0 |
| **Max Instances** | 1 (broke multi-instance) | ∞ (limited by resources) |
| **Data Loss on Restart** | 100% (in-memory sessions) | 0% (persisted to Redis/DB) |
| **Real-time Cross-Instance** | ❌ Broken | ✅ Works |
| **File Redundancy** | Single point of failure | Distributed (S3) |
| **Interview Sessions Live** | Lost after 30s restart | Survive indefinitely |

---

## 📋 Dependency Summary

```
backend/
├── .env (NEW: REDIS_*, AWS_*)
├── ecosystem.config.js (NEW: PM2 config)
├── server.js (MODIFY: Socket.IO adapter)
├── src/
│   ├── config/
│   │   └── redis.js (NEW: Redis client)
│   ├── services/
│   │   ├── geminiVoiceService.js (CRITICAL: Replace Map → Redis)
│   │   └── s3Service.js (NEW: S3 operations)
│   └── controllers/
│       ├── resumeController.js (MODIFY: Use S3)
│       └── candidateController.js (MODIFY: Use S3 for logos)
└── middleware/
    └── upload.js (MODIFY: memory storage instead of disk)
```

---

## 🔗 Reference Architecture

```
┌─────────────────────────────────────────┐
│         Load Balancer (ALB/NLB)         │
└──┬──────────────────────────────────────┘
   │
   ├─────────────────────┬──────────────┬─────────────────
   │                     │              │
┌──▼──────┐        ┌──▼──────┐    ┌──▼──────┐
│Instance1│        │Instance2│    │Instance3│
│  :5000  │        │  :5000  │    │  :5000  │
└──┬──────┘        └──┬──────┘    └──┬──────┘
   │                  │              │
   └──────────────┬───┴──────────┬───┘  (All instances same config)
                  │              │
          ┌───────▼──────────────▼─────────┐
          │   Redis (Session + Socket)     │
          │   (ElastiCache / Self-hosted)  │
          └─────────────────────────────────┘

          ┌─────────────────────────────────┐
          │ MongoDB (All Data)              │
          │ (Document DB / Self-hosted)     │
          └─────────────────────────────────┘

          ┌─────────────────────────────────┐
          │ AWS S3 (File Storage)           │
          │ (All instances read/write)      │
          └─────────────────────────────────┘
```

---

## ✅ Next Steps

1. **Review this plan** - Share feedback on order/approach
2. **Setup Redis** - Create Redis instance (Docker/AWS)
3. **Implement Phase 1** - Merge GeminiVoiceService + Redis
4. **Implement Phase 2** - Socket.IO adapter
5. **Implement Phase 3** - S3 migration
6. **Test with PM2** - Verify horizontal scaling
7. **Monitor in staging** - 24-48 hours load testing

---

**Last Updated:** 2026-03-28  
**Status:** Ready for Implementation
