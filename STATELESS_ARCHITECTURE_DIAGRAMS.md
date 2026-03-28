# HirePrep Stateless Backend - Visual Architecture

## Current Architecture (❌ NOT STATELESS)

```
┌─────────────────────────────────────────────────────────────┐
│                     Single Node Instance                     │
│                                                               │
│  ┌──────────────────────┐                                   │
│  │   Express Server     │                                   │
│  │      :5000           │                                   │
│  │                      │                                   │
│  │  Socket.IO     ┌─────┴──────────────┐                   │
│  │   (local)      │  Gemini Service    │                   │
│  │                │  In-Memory State:  │                   │
│  │                │  this.activeInterview = Map()          │
│  │                │  - Session 1 ─┐                        │
│  │                │  - Session 2 ─┼─ ❌ LOST ON RESTART   │
│  │                │  - Session 3 ─┘                        │
│  │                │                                         │
│  │  File Upload ─┐│                                        │
│  │  Local Disk    └─► /uploads/resumes/                    │
│  │                    /uploads/logos/   ❌ NOT SCALABLE    │
│  │                                                         │
│  └──────────────────────────────────────────────────────────┘
│
│  ┌────────────────────┐                                     │
│  │ MongoDB            │ (Source of Truth - OK)             │
│  └────────────────────┘                                     │
│
└─────────────────────────────────────────────────────────────┘

🚨 PROBLEMS:
  1. Only 1 instance can run (conflicts if 2 instances)
  2. Interview data lost on restart/deploy
  3. Files only accessible on this instance
  4. No cross-instance communication
  5. Can't scale horizontally
```

---

## Target Architecture (✅ STATELESS & SCALABLE)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Load Balancer (ALB/NLB)                         │
│                 Distributes requests to any instance                   │
└──┬────────────────┬───────────────────┬────────────────┬───────────────┘
   │                │                   │                │
   │                │                   │                │
┌──▼───┐        ┌──▼───┐          ┌──▼───┐        ┌──▼───┐
│Inst 1│        │Inst 2│          │Inst 3│        │Inst 4│
│:5000 │        │:5000 │          │:5000 │        │:5000 │
│      │        │      │          │      │        │      │
│ Node │        │ Node │          │ Node │        │ Node │
│      │        │      │          │      │        │      │
└──┬───┘        └──┬───┘          └──┬───┘        └──┬───┘
   │                │                │                │
   │  ✅ Stateless! │                │                │
   │                │                │                │
   └────────────────┼────────────────┼────────────────┘
                    │                │
      ┌─────────────┼────────────────┼──────────────┐
      │             │                │              │
      ▼             ▼                ▼              ▼
    ┌──────────────────────────────────────────────────┐
    │          Redis (In-Memory Cache)                 │
    │                                                  │
    │  interview:abc123 ─┐                            │
    │  interview:def456 ─┼─ ✅ SHARED STATE           │
    │  interview:ghi789 ─┘    (1-hour TTL)            │
    │                                                  │
    │  Socket.IO Adapter ─────────────────────────────┤
    │  (Cross-instance room/event broadcasting)        │
    │                                                  │
    │  Keys: interview_<id>:<sessionId>               │
    └────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────┐
    │   MongoDB (Source of Truth)                       │
    │                                                   │
    │   - User data                                     │
    │   - Interviews (full history)                     │
    │   - QuestionAnalysis (fallback when Redis down)   │
    │   - Application results                          │
    │                                                   │
    └───────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────┐
    │   AWS S3 (File Storage - Replicated)             │
    │                                                  │
    │   s3://hireprep-uploads/                         │
    │   ├── resumes/                                   │
    │   │   ├── 1234567_abc123_john_resume.pdf         │
    │   │   └── 1234567_def456_jane_resume.pdf         │
    │   │                                              │
    │   └── logos/                                     │
    │       ├── 7654321_ghi789_company_logo.png        │
    │       └── 7654321_jkl012_company_logo.png        │
    │                                                  │
    │   ✅ Accessible from ALL instances               │
    │   ✅ Replicated across AZs                       │
    │   ✅ Signed URLs for secure downloads            │
    └──────────────────────────────────────────────────┘

✅ BENEFITS:
  1. Scale to unlimited instances
  2. No data loss on restart
  3. Files accessible everywhere
  4. Real-time sync across instances
  5. Zero-downtime deployments
```

---

## Data Flow Comparison

### ❌ BEFORE: Interview Session (Current)

```
User starts interview
         │
         ▼
   API receives request
         │
         ▼
   GeminiVoiceService.init()
         │
         ▼
   this.activeInterviews.set(sessionId, context)
         │         │
         │         └──► In-Memory Map
         │              (VOLATILE)
         │
         ▼
   Return sessionId to client


    Server restarts ⚠️
         │
         ▼
   Map is cleared 🔥
         │
         ▼
   User tries to continue interview
         │
         ▼
   activeInterviews.get(sessionId) ─► null ❌
         │
         ▼
   Interview lost
```

### ✅ AFTER: Interview Session (New)

```
User starts interview
       │
       ▼
  API receives request
       │
       ▼
  GeminiVoiceService.init()
       │
       ├─► Generate sessionId
       │
       ├─► Create context object
       │
       ├─► Save to Redis
       │   ├─► Redis stores with 1-hour TTL
       │   └─► Key: "interview:abc123"
       │
       └─► Save to MongoDB
           ├─► Full history for audit
           └─► Source of truth


    Server restarts ✅ (No data loss)
       │
       ▼
  User tries to continue interview
       │
       ▼
  GeminiVoiceService.getSessionContext(sessionId)
       │
       ├─► Try Redis first
       │   ├─► HIT: Returns context immediately ✅
       │   │
       │   └─► MISS: Fall back to MongoDB
       │       ├─► Rebuild context from QuestionAnalysis
       │       └─► Re-cache in Redis
       │
       └─► Interview continues seamlessly ✅
```

---

## File Upload Flow Comparison

### ❌ BEFORE: Local Disk Storage

```
Request from Instance 1
       │
       ▼
multer.diskStorage()
       │
       ▼
  Write to /uploads/resumes/
  ├─ /home/ubuntu/hireprep/backend/uploads/resumes/user123_ts_resume.pdf
  │
  └─► Stored in Instance 1 filesystem only


Request from Load Balancer
       │
       ├─► 50% chance: Routed to Instance 1
       │   └─► File found ✅
       │
       └─► 50% chance: Routed to Instance 2
           └─► File NOT found ❌ (404 error)
```

### ✅ AFTER: AWS S3 Storage

```
Request from Instance 1 (or any instance)
       │
       ▼
multer.memoryStorage()
  (File stays in memory, NOT on disk)
       │
       ▼
S3Service.uploadFile(buffer, name, 'resumes')
       │
       ├─► Generate unique S3 key
       │   └─ "resumes/1234567_abc123_resume.pdf"
       │
       ├─► Upload to S3
       │   └─► S3Client.send(PutObjectCommand)
       │
       └─► Store in MongoDB
           └─ Resume.fileKey = "resumes/1234567_abc123_resume.pdf"


Request from Load Balancer (any instance)
       │
       ├─► Instance 1 ─┐
       │              │
       ├─► Instance 2 ─┼─► S3Service.getSignedUrl(fileKey)
       │              │
       └─► Instance 3 ─┘
                │
                ▼
           Generate signed URL
                │
                ▼
           Return temporary URL (valid 1 hour)
                │
                ▼
           Client downloads from S3
           (Not from any instance)

✅ Accessible from ALL instances at any time
✅ No instance-specific filesystem
✅ Survives instance termination
```

---

## Socket.IO Real-Time Communication

### ❌ BEFORE: Single Instance Broadcast

```
Client A ──┐
           │
           ├─► Instance 1 Socket.IO
           │   └─ socket.id = "abc123"
           │   └─ room = "interview_job123"
Client B ──┘

Client C ──┐
           │
           ├─► Instance 2 Socket.IO
           │   └─ socket.id = "def456"
           │   └─ room = "interview_job123"
           │
Client D ──┘


Room broadcast on Instance 1:
io.to('interview_job123').emit('update', data)
                │
                ├─► Sent to Client A ✅
                ├─► Sent to Client B ✅
                │
                └─► NOT sent to Client C & D ❌
                    (Different instance)

❌ Real-time sync breaks with multi-instance
```

### ✅ AFTER: Redis Adapter Broadcast

```
Client A ──┐
           │
           ├─► Instance 1 Socket.IO
           │   └─ socket.id = "abc123"
           │   └─ room = "interview_job123"
Client B ──┘

Client C ──┐
           │
           ├─► Instance 2 Socket.IO
           │   └─ socket.id = "def456"
           │   └─ room = "interview_job123"
           │
Client D ──┘

       Redis Adapter
         (Pub/Sub)


Room broadcast on Instance 1:
io.to('interview_job123').emit('update', data)
                │
                ├─► Sent to Client A ✅ (local)
                ├─► Sent to Client B ✅ (local)
                │
                └─► Publish to Redis Adapter
                    │
                    └─► Subscribe Instance 2
                        │
                        ├─► Sent to Client C ✅
                        └─► Sent to Client D ✅

✅ ALL clients in room get update, regardless of instance
✅ Works perfectly across multiple instances
```

---

## Scaling Illustration

```
┌─────────────────────────────────────────────────────────────┐
│                 Day 1: Low Traffic (1 user)                 │
│                                                               │
│   1 Instance × 1 Process = OK for 50 concurrent users     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                  ↓ Growing traffic ↓

┌─────────────────────────────────────────────────────────────┐
│                Week 2: 100+ users concurrently              │
│                                                               │
│  Load Balancer                                              │
│      │                                                       │
│      ├─► Instance 1 (Node)                                  │
│      ├─► Instance 2 (Node)   ✅ Auto-scaled via PM2         │
│      └─► Instance 3 (Node)   ✅ Each handles ~50 users      │
│                                                               │
│  Shared Redis ──► Session state sync                        │
│  Shared S3    ──► File access from all instances           │
│  Shared DB    ──► Data consistency                          │
│                                                               │
│  Result: 150+ concurrent users ✅                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                ↓ Growing further ↓

┌─────────────────────────────────────────────────────────────┐
│               Month 2: 1000+ users concurrently             │
│                                                               │
│  Load Balancer (Auto-scaling group)                         │
│      │                                                       │
│      ├─► Instance 1-10                                      │
│      ├─► Instance 11-20   ✅ Scales to 20+ instances       │
│      └─► Instance 21+     ✅ Limited only by resources       │
│                                                               │
│  Shared Redis  ────► Multiple nodes (Redis Cluster)        │
│  Shared S3     ────► Unlimited storage & bandwidth          │
│  Shared DB     ────► Read replicas for scaling              │
│                                                               │
│  Result: 1000+ concurrent users ✅                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘

❌ OLD ARCHITECTURE:
   Can't scale beyond 1 instance without losing state

✅ NEW ARCHITECTURE:
   Scales linearly with added instances
```

---

## Deployment Timeline

```
Week 1: Phase 1 (Redis Session)
├─ Setup Redis instance
├─ Update GeminiVoiceService
├─ Deploy and test
└─ Verify session persistence ✅

Week 2: Phase 2 (Socket.IO Adapter)
├─ Install @socket.io/redis-adapter
├─ Update server.js Socket.IO config
├─ Test multi-instance real-time
└─ Deploy ✅

Week 2: Phase 3 (S3 File Storage)
├─ Setup S3 bucket
├─ Create S3Service
├─ Update upload middleware
├─ Migrate controllers
├─ Test file uploads
└─ Deploy ✅

Week 3: Phase 4 (PM2 Setup & Testing)
├─ Create ecosystem.config.js
├─ Test cluster mode locally
├─ Test with 2-4 instances
├─ Verify graceful shutdown
└─ Deploy to production ✅

Week 4: Production Validation
├─ Monitor all instances
├─ Run load testing
├─ Verify data consistency
└─ Scale to desired capacity ✅
```

---

## Technology Stack Used

```
In-Memory Caching
├─ Redis
│  ├─ Interview session state (1-hour TTL)
│  └─ Socket.IO adapter (cross-instance broadcast)
│
Persistent Storage
├─ MongoDB
│  ├─ Interview history
│  ├─ Question analysis
│  └─ Application data
│
File Storage
├─ AWS S3
│  ├─ Resume uploads
│  ├─ Company logos
│  └─ Video recordings
│
Application Server
├─ Node.js + Express
├─ Socket.IO (real-time)
└─ PM2 (process manager)
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Max Instances** | 1 (fails) | ∞ (limited by CPU) | 10-100 |
| **Concurrent Users** | ~50 | ~500+ | 1000+ |
| **Interview Session Loss** | 100% on restart | 0% | 0% |
| **File Accessibility** | 404 on 50% requests | 100% success | 100% |
| **Real-time Latency** | Single instance | All instances | <100ms |
| **Graceful Shutdown** | Lost data | Persisted | Data safe |
| **Deploy Downtime** | Minutes | Seconds | Zero |

---

**Status:** Architecture Finalized ✅  
**Ready for:** Implementation

