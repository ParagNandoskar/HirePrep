# HirePrep Stateless Backend - Quick Reference

## 🎯 3 Critical Stateless Issues Found

### #1: 🔴 IN-MEMORY SESSION MAP (CRITICAL)
**File:** `backend/src/services/geminiVoiceService.js:16`
```
this.activeInterviews = new Map();
```
**Impact:** Interview data lost on server restart  
**Solution:** Replace with Redis  
**Effort:** 2-3 hours  

---

### #2: 🟡 SOCKET.IO SINGLE INSTANCE (HIGH)
**File:** `backend/server.js:37-103`
```
io.on('connection', (socket) => { ... })
// Only broadcasts to local instance
```
**Impact:** Real-time updates broken in cluster mode  
**Solution:** Add Socket.IO Redis Adapter  
**Effort:** 1-2 hours  

---

### #3: 🟡 LOCAL FILE STORAGE (MODERATE)
**File:** `backend/middleware/upload.js:35`
```
const localStorage = multer.diskStorage({ ... })
```
**Impact:** Files not accessible from different instances  
**Solution:** Migrate to AWS S3  
**Effort:** 3-4 hours  

---

## 📊 Before vs After

| Aspect | ❌ Before | ✅ After |
|--------|-----------|----------|
| **Max horizontally scalable instances** | 1 (breaks) | Unlimited |
| **Data loss on restart** | ALL active interviews | None |
| **Real-time sync between instances** | Broken | Works perfectly |
| **File access redundancy** | Single point of failure | Replicated (S3) |
| **Stateless violations** | 3 Critical | 0 |

---

## 🚀 Quick Implementation Checklist

- [ ] **Phase 1:** Redis Setup (2-3h)
  - [ ] Install redis package
  - [ ] Create `redis.js` config
  - [ ] Update GeminiVoiceService (replace Map → Redis)
  
- [ ] **Phase 2:** Socket.IO Adapter (1-2h)
  - [ ] Install `@socket.io/redis-adapter`
  - [ ] Update `server.js` Socket.IO config

- [ ] **Phase 3:** S3 Migration (3-4h)
  - [ ] Create S3Service
  - [ ] Update upload middleware
  - [ ] Update controllers (resume, logo upload)

- [ ] **Phase 4:** PM2 Setup (1h)
  - [ ] Create `ecosystem.config.js`
  - [ ] Test cluster mode

---

## 🔍 Code Locations

| Component | File | Lines | Issue |
|-----------|------|-------|-------|
| Session Storage | `src/services/geminiVoiceService.js` | 13-19, 118, 135, 313 | Map() not stateless |
| Initialization | `src/controllers/geminiVoiceController.js` | 57 | Uses service Map |
| Socket Real-time | `server.js` | 37-103 | Single instance |
| File Upload | `middleware/upload.js` | 35-54 | Disk storage |
| Static Serving | `server.js` | 12 | Local path only |
| Controllers | `src/controllers/resumeController.js` | 307, 320 | Stores local paths |

---

## 📈 Resource Requirements

### Redis
- **Size:** Small (1GB for session cache)
- **Recommendation:** AWS ElastiCache or Redis Labs
- **Cost:** ~$15-30/month

### S3 Bucket
- **Size:** Depends on resume volume
- **Recommendation:** S3 Standard with auto-delete old files
- **Cost:** ~$5-10/month for typical usage

### Additional Infrastructure
- No additional servers needed
- Existing Node instances can handle 3-4x more load
- Graceful degradation if Redis down (fallback to DB)

---

## ⚠️ Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| **Redis goes down** | Graceful fallback to MongoDB QuestionAnalysis table |
| **S3 API rate limits** | Pre-sign URLs for client-side uploads |
| **Session timeout** | 1-hour TTL, user can restart interview |
| **Data corruption** | S3 versioning enabled, MongoDB always source of truth |

---

## 🎓 Key Principles

1. **Redis = Fast Cache** (in-memory), not source of truth
2. **MongoDB = Single Source of Truth** (persisted)
3. **S3 = Replicated Storage** (not instance-dependent)
4. **Socket.IO Adapter = Event Bus** (cross-instance communication)

---

## 📞 Support

**Detailed Implementation:** See [STATELESS_BACKEND_PLAN.md](STATELESS_BACKEND_PLAN.md)

**Questions about specific phase?**
- Phase 1 (Redis): Session persistence
- Phase 2 (Socket.IO): Real-time communication
- Phase 3 (S3): File storage
- Phase 4 (PM2): Horizontal scaling

---

**Created:** 2026-03-28  
**Status:** Ready for implementation
