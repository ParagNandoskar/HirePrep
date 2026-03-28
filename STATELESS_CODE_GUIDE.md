# HirePrep Stateless Backend - Code Implementation Guide

## PHASE 1: Redis Session Storage (CRITICAL)

### Step 1: Install Dependency
```bash
cd backend
npm install redis ioredis
```

### Step 2: Create Redis Config
**Create:** `backend/src/config/redis.js`

```javascript
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Ready');
});

redisClient.on('end', () => {
  console.log('⚠️ Redis Connection Closed');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Redis connection...');
  await redisClient.quit();
  process.exit(0);
});

module.exports = redisClient;
```

### Step 3: Update GeminiVoiceService

**File:** `backend/src/services/geminiVoiceService.js`

**REPLACE (Lines 1-19):**
```javascript
const { getOpenAIFlash } = require('../config/openai');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const googleTTSService = require('./googleTTSService');
const interviewAggregationService = require('./interviewAggregationService');
const QuestionAnalysis = require('../models/QuestionAnalysis');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class GeminiVoiceInterviewService {
  constructor() {
    this.activeInterviews = new Map();  // ❌ REMOVE THIS LINE
    this.MIN_BASELINE_QUESTIONS = parsePositiveInt(process.env.MIN_BASELINE_QUESTIONS, 3);
    this.MAX_FOLLOWUPS_PER_PRIMARY = parsePositiveInt(process.env.MAX_FOLLOWUPS_PER_PRIMARY, 2);
    this.MAX_TOTAL_QUESTIONS = parsePositiveInt(process.env.MAX_TOTAL_QUESTIONS, 7);
  }
```

**WITH (Lines 1-40):**
```javascript
const { getOpenAIFlash } = require('../config/openai');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const googleTTSService = require('./googleTTSService');
const interviewAggregationService = require('./interviewAggregationService');
const QuestionAnalysis = require('../models/QuestionAnalysis');
const redisClient = require('../config/redis');  // ✅ ADD THIS

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Helper: Generate unique session ID
const generateSessionId = () => {
  return `interview_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

class GeminiVoiceInterviewService {
  constructor() {
    // ✅ Use Redis instead of Map
    this.redisClient = redisClient;
    this.SESSION_PREFIX = 'interview:';
    this.SESSION_TTL = parseInt(process.env.SESSION_TTL) || 3600; // 1 hour default
    this.MIN_BASELINE_QUESTIONS = parsePositiveInt(process.env.MIN_BASELINE_QUESTIONS, 3);
    this.MAX_FOLLOWUPS_PER_PRIMARY = parsePositiveInt(process.env.MAX_FOLLOWUPS_PER_PRIMARY, 2);
    this.MAX_TOTAL_QUESTIONS = parsePositiveInt(process.env.MAX_TOTAL_QUESTIONS, 7);
  }

  // ✅ NEW HELPER: Get session from Redis
  async getSessionContext(sessionId) {
    try {
      const data = await this.redisClient.get(`${this.SESSION_PREFIX}${sessionId}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️ Redis get failed:', error.message);
      // Graceful fallback: Return null, service will rebuild from DB
      return null;
    }
  }

  // ✅ NEW HELPER: Store session in Redis
  async setSessionContext(sessionId, context) {
    try {
      const serialized = JSON.stringify(context);
      await this.redisClient.setex(
        `${this.SESSION_PREFIX}${sessionId}`,
        this.SESSION_TTL,
        serialized
      );
      return true;
    } catch (error) {
      console.error('❌ Redis set failed:', error.message);
      // Non-fatal: Continue without Redis cache for this operation
      return false;
    }
  }

  // ✅ NEW HELPER: Delete session from Redis
  async deleteSessionContext(sessionId) {
    try {
      await this.redisClient.del(`${this.SESSION_PREFIX}${sessionId}`);
    } catch (error) {
      console.warn('⚠️ Redis delete failed:', error.message);
    }
  }
```

**REPLACE in `initializeInterview()` method (around line 118):**
```javascript
// ❌ OLD
this.activeInterviews.set(sessionId, interviewContext);
return { sessionId, ... };
```

**WITH:**
```javascript
// ✅ NEW
const sessionId = generateSessionId();
await this.setSessionContext(sessionId, interviewContext);
return { sessionId, ... };
```

**REPLACE in `generateNextQuestion()` method (around line 135):**
```javascript
// ❌ OLD
let context = this.activeInterviews.get(sessionId);
if (!context) {
  // fallback logic
}
```

**WITH:**
```javascript
// ✅ NEW
let context = await this.getSessionContext(sessionId);
if (!context) {
  console.warn(`⚠️ Session ${sessionId} not in Redis, rebuilding from DB...`);
  const pastQuestions = await QuestionAnalysis.find({ sessionId }).sort({ questionNumber: 1 }).lean();
  if (pastQuestions.length === 0) {
    throw new Error('Interview session not found');
  }
  context = this.rebuildContextFromDB(pastQuestions);
  // Re-cache in Redis
  await this.setSessionContext(sessionId, context);
}
```

**REPLACE in `processAnswer()` method (around line 313):**
```javascript
// ❌ OLD
const context = this.activeInterviews.get(sessionId);
// ... process ...
this.activeInterviews.set(sessionId, context);
```

**WITH:**
```javascript
// ✅ NEW
let context = await this.getSessionContext(sessionId);
if (!context) {
  console.warn(`⚠️ Session ${sessionId} not in Redis, rebuilding from DB...`);
  const pastQuestions = await QuestionAnalysis.find({ sessionId });
  context = this.rebuildContextFromDB(pastQuestions);
}
// ... process answer ...
await this.setSessionContext(sessionId, context);
```

**REPLACE in `generateFinalAnalysis()` method (around line 691):**
```javascript
// ❌ OLD
const context = this.activeInterviews.get(sessionId);
```

**WITH:**
```javascript
// ✅ NEW
let context = await this.getSessionContext(sessionId);
if (!context) {
  const pastQuestions = await QuestionAnalysis.find({ sessionId });
  context = this.rebuildContextFromDB(pastQuestions);
}
```

**REPLACE in `module.exports` (last line, around 873):**
```javascript
// ❌ OLD
module.exports = new GeminiVoiceInterviewService();
```

**WITH:**
```javascript
// ✅ NEW - Keep singleton pattern for initialization helpers
const instance = new GeminiVoiceInterviewService();
module.exports = instance;
```

**ALSO ADD: Delete session when complete (around line 836-869):**
```javascript
// ✅ NEW
async cleanupSession(sessionId) {
  try {
    await this.deleteSessionContext(sessionId);
    console.log(`✅ Session ${sessionId} cleaned up from Redis`);
  } catch (error) {
    console.warn('⚠️ Cleanup failed:', error.message);
  }
}
```

Update the `completeInterview()` method to call cleanup:
```javascript
async completeInterview(...) {
  // ... existing code ...
  
  // At the end, clean up Redis
  await this.cleanupSession(sessionId);
  
  return finalResult;
}
```

---

## PHASE 2: Socket.IO Redis Adapter (HIGH)

### Step 1: Install Dependency
```bash
npm install @socket.io/redis-adapter
```

### Step 2: Update server.js

**File:** `backend/server.js`

**REPLACE (Lines 3-5):**
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
```

**WITH:**
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');  // ✅ ADD
const redisClient = require('./src/config/redis');  // ✅ ADD
require('dotenv').config();
```

**REPLACE (Lines 37-70):**
```javascript
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // ... existing CORS logic ...
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

**WITH:**
```javascript
// ✅ Create pub/sub clients for Redis adapter
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

const io = socketIo(server, {
  adapter: createAdapter(pubClient, subClient),  // ✅ ADD ADAPTER
  cors: {
    origin: function (origin, callback) {
      // ... existing CORS logic stays same ...
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

**REPLACE Socket event handlers (Lines 80-103) - ADD ASYNC:**
```javascript
// ❌ OLD
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinInterview', (interviewId) => {
    socket.join(`interview_${interviewId}`);
    console.log(`User ${socket.id} joined interview ${interviewId}`);
  });

  socket.on('interviewMessage', (data) => {
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
});
```

**WITH:**
```javascript
// ✅ NEW - Async handlers with Redis adapter
io.on('connection', async (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('joinInterview', (interviewId) => {
    socket.join(`interview_${interviewId}`);
    console.log(`✅ User ${socket.id} joined interview ${interviewId}`);
    // Broadcast to all instances that someone joined
    io.to(`interview_${interviewId}`).emit('userJoined', {
      userId: socket.id,
      timestamp: new Date()
    });
  });

  socket.on('leaveInterview', (interviewId) => {
    socket.leave(`interview_${interviewId}`);
    console.log(`✅ User ${socket.id} left interview ${interviewId}`);
    io.to(`interview_${interviewId}`).emit('userLeft', {
      userId: socket.id,
      timestamp: new Date()
    });
  });

  // Text messages
  socket.on('interviewMessage', (data) => {
    io.to(`interview_${data.interviewId}`).emit('interviewMessage', {
      ...data,
      senderId: socket.id,
      timestamp: new Date()
    });
  });

  // WebRTC Signaling - now works across instances
  socket.on('offer', (data) => {
    io.to(`interview_${data.interviewId}`).emit('offer', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('answer', (data) => {
    io.to(`interview_${data.interviewId}`).emit('answer', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    io.to(`interview_${data.interviewId}`).emit('ice-candidate', {
      ...data,
      senderId: socket.id
    });
  });

  // Analysis updates
  socket.on('analysisData', (data) => {
    io.to(`interview_${data.interviewId}`).emit('analysisUpdate', {
      ...data,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('⚠️ User disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});
```

**REMOVE (Line 12):**
```javascript
// ❌ DELETE THIS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

**ADD instead (after app setup):**
```javascript
// ✅ Health check for Socket.IO
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    redis: redisClient.connected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});
```

---

## PHASE 3: AWS S3 File Storage (MODERATE)

### Step 1: Install AWS SDK
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Create S3 Service

**Create:** `backend/src/services/s3Service.js`

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

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

  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File content
   * @param {string} fileName - Original filename
   * @param {string} folder - Folder in bucket (resumes, logos, etc)
   * @returns {Promise<{Key, Url, SignedUrl}>}
   */
  async uploadFile(fileBuffer, fileName, folder = 'resumes') {
    try {
      // Generate unique key to avoid collisions
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const timestamp = Date.now();
      const sanitizedName = fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const Key = `${folder}/${timestamp}_${randomSuffix}_${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: Key,
        Body: fileBuffer,
        ContentType: this.getContentType(fileName),
        ServerSideEncryption: 'AES256',
        Metadata: {
          'upload-time': new Date().toISOString(),
          'original-name': fileName
        }
      });

      const result = await this.s3Client.send(command);
      console.log(`✅ File uploaded to S3: ${Key}`);

      return {
        Key: Key,
        ETag: result.ETag,
        Url: `s3://${this.bucketName}/${Key}`,
        PublicUrl: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`
      };
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for download
   * @param {string} key - S3 object key
   * @param {number} expiresIn - Expiration in seconds (default 3600)
   * @returns {Promise<string>} Signed URL
   */
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
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      console.log(`✅ File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ S3 delete failed:', error);
      return false;
    }
  }

  /**
   * Get MIME type from filename
   */
  getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}

module.exports = new S3Service();
```

### Step 3: Update Upload Middleware

**File:** `backend/middleware/upload.js`

**REPLACE ENTIRE FILE:**
```javascript
const multer = require('multer');
const path = require('path');

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// ✅ Use memory storage instead of disk
const memoryStorage = multer.memoryStorage();

// Resume upload configuration
const resumeUpload = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Company logo upload configuration
const logoUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedImageTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Allowed types: jpg, jpeg, png, gif, svg'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for images
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB for resumes, 5MB for images.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded at once'
      });
    }
  }
  
  if (error && error.message) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
};

module.exports = {
  resumeUpload,
  logoUpload,
  handleUploadError
};
```

### Step 4: Update Resume Controller

**File:** `backend/src/controllers/resumeController.js` (example - apply same pattern to other upload endpoints)

**Find and REPLACE the upload handler:**
```javascript
// ❌ OLD
const { resumeUpload } = require('../../middleware/upload');
const fs = require('fs');
const path = require('path');

exports.uploadResume = async (req, res) => {
  try {
    const filePath = req.file.path;  // ← Local disk path
    // ... resume parsing ...
};
```

**WITH:**
```javascript
// ✅ NEW
const { resumeUpload } = require('../../middleware/upload');
const s3Service = require('../services/s3Service');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Upload to S3
    console.log('📤 Uploading resume to S3...');
    const uploadResult = await s3Service.uploadFile(
      req.file.buffer,
      req.file.originalname,
      'resumes'
    );

    console.log('✅ Resume uploaded to S3:', uploadResult.Key);

    // Store S3 key in MongoDB (NOT local path)
    const resume = new Resume({
      userId: req.user._id,
      fileKey: uploadResult.Key,  // ← S3 key instead of path
      fileName: req.file.originalname,
      uploadedAt: new Date(),
      // ... other fields ...
    });

    await resume.save();

    // Get signed URL for download
    const downloadUrl = await s3Service.getSignedUrl(uploadResult.Key, 3600);

    res.json({
      success: true,
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        fileKey: uploadResult.Key,  // ← Store this for later retrieval
        downloadUrl: downloadUrl,  // ← Signed URL expires in 1 hour
        uploadedAt: resume.uploadedAt
      }
    });
  } catch (error) {
    console.error('❌ Resume upload failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

**ALSO UPDATE: Download/Retrieve Resume:**
```javascript
// ✅ NEW - Retrieve signed URL for download
exports.getResumeDownloadUrl = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Generate fresh signed URL
    const downloadUrl = await s3Service.getSignedUrl(resume.fileKey, 3600);

    res.json({
      success: true,
      fileName: resume.fileName,
      downloadUrl: downloadUrl
    });
  } catch (error) {
    console.error('❌ Error getting download URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ NEW - Delete resume from S3
exports.deleteResume = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Delete from S3
    await s3Service.deleteFile(resume.fileKey);

    // Delete from MongoDB
    await Resume.findByIdAndDelete(resumeId);

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting resume:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

---

## PHASE 4: PM2 Cluster Setup (INTEGRATION)

### Step 1: Install PM2
```bash
npm install -g pm2
npm install pm2 --save-dev
```

### Step 2: Create Ecosystem Config

**Create:** `backend/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      // Application name
      name: 'hireprep-api',
      
      // Script to run
      script: './server.js',
      
      // ✅ Number of instances (auto-scale to CPU count)
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      
      // ✅ Cluster mode for multi-instance
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        MONGODB_URI: process.env.MONGODB_URI,
        JWT_SECRET: process.env.JWT_SECRET,
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
      },
      
      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // ✅ Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // ✅ Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // ✅ Logging
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // ✅ File watching (disable in production)
      watch: process.env.NODE_ENV !== 'production',
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
      
      // ✅ Rolling restart for zero-downtime deployments
      max_memory_restart: '500M',
      
      // ✅ Merge logs from multiple instances
      merge_logs: true,
      
      // ✅ Node args
      node_args: '--max-old-space-size=2048'
    }
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/hireprep.git',
      path: '/var/www/hireprep',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
```

### Step 3: Update .env File

**File:** `backend/.env`

```bash
# ===== Node Configuration =====
NODE_ENV=production
PORT=5000

# ===== Database =====
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hireprep

# ===== JWT =====
JWT_SECRET=your_super_secret_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_key

# ===== Redis (Session & Socket.IO) =====
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # If auth enabled
SESSION_TTL=3600  # 1 hour

# ===== AWS S3 (File Storage) =====
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=hireprep-uploads-prod

# ===== File Upload =====
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,doc,docx

# ===== Frontend =====
FRONTEND_URL=https://hireprep.com

# ===== AI Services =====
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# ===== Interview Config =====
MIN_BASELINE_QUESTIONS=3
MAX_FOLLOWUPS_PER_PRIMARY=2
MAX_TOTAL_QUESTIONS=7
```

### Step 4: Create Startup Scripts

**Create:** `backend/scripts/start-prod.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting HirePrep API..."
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ HirePrep API started!"
pm2 status
```

**Create:** `backend/scripts/stop-prod.sh`

```bash
#!/bin/bash
echo "⛔ Stopping HirePrep API..."
pm2 stop hireprep-api
echo "✅ Stopped!"
```

**Make scripts executable:**
```bash
chmod +x scripts/start-prod.sh
chmod +x scripts/stop-prod.sh
```

### Step 5: Test Locally

```bash
# Development (single instance)
npm run dev

# Test production build locally
npm run build
NODE_ENV=production pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs hireprep-api

# Test with 2 instances
pm2 restart hireprep-api -i 2
pm2 status

# Graceful reload (zero-downtime)
pm2 reload hireprep-api

# Stop all
pm2 stop all
pm2 delete all
```

---

## Verification Checklist

- [ ] Redis installed and running
- [ ] `src/config/redis.js` created
- [ ] GeminiVoiceService updated with Redis helpers
- [ ] All `this.activeInterviews` calls replaced with async Redis calls
- [ ] Socket.IO Redis adapter installed and configured
- [ ] `@socket.io/redis-adapter` imported in server.js
- [ ] S3Service created with upload/download/delete methods
- [ ] Upload middleware switched to memory storage
- [ ] Controllers updated to use S3Service
- [ ] S3 bucket created in AWS
- [ ] AWS credentials in .env
- [ ] ecosystem.config.js created
- [ ] Package.json has PM2 scripts (optional)

---

## Quick Test Commands

```bash
# Test 1: Upload file to S3
curl -X POST http://localhost:5000/api/resumes/upload \
  -F "resume=@sample.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Verify S3 -> MongoDB
# Check MongoDB: Resume.fileKey should be "resumes/1234567_ABC123_sample.pdf"
# NOT "/uploads/resumes/filename"

# Test 3: Multi-instance real-time
curl -X POST http://localhost:5000/api/gemini-voice/initialize \
  -H "Content-Type: application/json" \
  -d '{"jobId":"test","candidateName":"John"}'

# Test 4: Graceful restart (should NOT clear sessions)
pm2 restart hireprep-api
# Session in Redis should still work
```

---

**Implementation Status:** Ready to Deploy  
**Estimated Total Time:** 7-10 hours  
**Risk Level:** Low (gradual rollout possible)

