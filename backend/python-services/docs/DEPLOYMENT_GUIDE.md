# Video Analysis Service - Deployment Guide

## 🚀 Deployment Checklist

### ✅ Critical Requirements

#### 1. **Model File (MANDATORY)**
- File: `face_landmarker.task` (3.7 MB)
- Location: Same directory as `video_analysis.py`
- **Status**: ✅ Now included in Dockerfile.video
- Download: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

#### 2. **Dependencies**
All dependencies listed in `requirements.txt`:
- `mediapipe>=0.10.0` - Face landmark detection (478 landmarks)
- `deepface>=0.0.90` - Emotion recognition
- `opencv-python>=4.8.0` - Image processing
- `tensorflow>=2.15.0` - DeepFace backend
- `flask==3.0.0` + `Flask-Cors==4.0.0` - API server

#### 3. **System Libraries** (for Docker/Linux)
```bash
libgl1-mesa-glx    # OpenCV
libglib2.0-0       # OpenCV
libgomp1           # TensorFlow/DeepFace (CRITICAL)
ffmpeg             # MediaPipe video processing
```

---

## 🐳 Docker Deployment

### Build Image
```bash
cd backend/python-services
docker build -f Dockerfile.video -t hireprep-video-analysis .
```

### Run Container
```bash
docker run -d \
  --name video-analysis \
  -p 8001:8001 \
  --memory="2g" \
  --cpus="2" \
  hireprep-video-analysis
```

### Health Check
```bash
curl http://localhost:8001/health
# Expected: {"status": "healthy", "service": "video-analysis-ml"}
```

---

## ☁️ Cloud Deployment Considerations

### 1. **Resource Requirements**

#### Minimum (Development)
- CPU: 2 cores
- RAM: 2 GB
- Disk: 1 GB
- **Performance**: ~5-7 frames/sec

#### Recommended (Production)
- CPU: 4 cores
- RAM: 4 GB
- Disk: 2 GB
- **Performance**: ~9-12 frames/sec

#### Optimal (High Traffic)
- CPU: 8 cores (or GPU)
- RAM: 8 GB
- Disk: 2 GB
- GPU: NVIDIA T4/V100 (optional - 3-5x speedup on DeepFace)
- **Performance**: ~20-30 frames/sec with GPU

### 2. **Performance Metrics**

Based on testing:
- **Per-Frame Processing**: ~106ms (0.106s)
- **Batch Processing**: 9.4 frames/sec
- **API Response Time**: 0.41-0.53s per 5-frame batch

**Breakdown per frame:**
- MediaPipe (landmarks + head pose): 30-40ms
- DeepFace (emotion CNN): 50-70ms
- Confidence calculation: <5ms

### 3. **Scaling Strategies**

#### Horizontal Scaling (Multiple Instances)
```bash
# Load balancer distributes requests across instances
docker run -d -p 8001:8001 hireprep-video-analysis
docker run -d -p 8002:8001 hireprep-video-analysis
docker run -d -p 8003:8001 hireprep-video-analysis
```

#### Vertical Scaling (GPU Acceleration)
Install GPU-enabled TensorFlow:
```bash
pip install tensorflow-gpu==2.15.0
# Requires CUDA 12.x + cuDNN 8.x
```

Expected improvement: **3-5x faster** (DeepFace only)

### 4. **Production WSGI Server**

**Current**: Flask development server (not production-ready)

**Recommended**: Gunicorn (production-grade)

Update `requirements.txt`:
```
gunicorn==21.2.0
```

Update `Dockerfile.video` CMD:
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "2", "--threads", "4", "--timeout", "120", "video_analysis:app"]
```

**Worker Configuration**:
- Workers: 2-4 (CPU-bound tasks)
- Threads: 4-8 per worker
- Timeout: 120s (generous for batch processing)

---

## 🌐 Platform-Specific Guides

### AWS (EC2 / ECS / Lambda)

#### EC2
- Instance Type: `t3.medium` (2 vCPU, 4 GB RAM) minimum
- Recommended: `c6i.2xlarge` (8 vCPU, 16 GB RAM) for production
- With GPU: `g4dn.xlarge` (4 vCPU, 16 GB RAM, NVIDIA T4)

#### ECS (Fargate)
```yaml
task_definition:
  cpu: 2048  # 2 vCPU
  memory: 4096  # 4 GB
  container:
    port: 8001
    healthCheck:
      command: ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
      interval: 30
      timeout: 10
      retries: 3
```

#### Lambda (NOT RECOMMENDED)
- ❌ Cold start too slow (~10-15s for model loading)
- ❌ Max timeout 15 minutes (batch processing may exceed)
- ✅ Better for single-frame analysis only

### Google Cloud (GCE / Cloud Run)

#### Cloud Run
```yaml
service: video-analysis
region: us-central1
resources:
  cpu: 4
  memory: 4Gi
scaling:
  minInstances: 1
  maxInstances: 10
timeout: 300s
```

**Note**: Cloud Run scales to zero - first request will be slow (model loading)

### Azure (Container Instances / App Service)

#### Container Instances
```bash
az container create \
  --resource-group hireprep \
  --name video-analysis \
  --image hireprep-video-analysis:latest \
  --cpu 4 \
  --memory 4 \
  --ports 8001
```

### Heroku

**Dyno Type**:
- Standard-2X: 2 cores, 1 GB RAM (minimum)
- Performance-M: 2.5 GB RAM (recommended)

**Procfile**:
```
web: python video_analysis.py
```

**Note**: Model file (3.7 MB) fits within slug size limit

---

## 🔒 Security Considerations

### 1. **API Authentication**
Currently **no authentication**. Add before production:

```python
from flask import request, abort

API_KEY = os.environ.get('VIDEO_API_KEY', 'your-secret-key')

@app.before_request
def check_auth():
    if request.endpoint in ['analyze_video_endpoint']:
        api_key = request.headers.get('X-API-Key')
        if api_key != API_KEY:
            abort(401, 'Unauthorized')
```

### 2. **Rate Limiting**
Install Flask-Limiter:
```bash
pip install Flask-Limiter
```

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/analyze-video', methods=['POST'])
@limiter.limit("10 per minute")  # Max 10 requests/min per IP
def analyze_video_endpoint():
    ...
```

### 3. **Input Validation**
- Max frames per request: 30-50 (prevent memory exhaustion)
- Max base64 size: 10 MB per frame
- Validate image format (JPEG/PNG only)

### 4. **CORS Configuration**
Update for production:
```python
CORS(app, resources={
    r"/*": {
        "origins": ["https://yourdomain.com"],  # Whitelist only
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "X-API-Key"]
    }
})
```

---

## 📊 Monitoring & Logging

### 1. **Health Check Endpoint**
```bash
curl http://localhost:8001/health
```

Response:
```json
{"status": "healthy", "service": "video-analysis-ml"}
```

### 2. **Key Metrics to Monitor**
- **API Response Time**: Should be <1s per batch
- **Memory Usage**: Should stay <80% of allocated
- **CPU Usage**: Will spike during processing (normal)
- **Error Rate**: Should be <1%

### 3. **Logging**
Current log level: `INFO`

For production debugging:
```python
logging.basicConfig(level=logging.DEBUG)  # More verbose
```

For production (less noise):
```python
logging.basicConfig(level=logging.WARNING)  # Only warnings/errors
```

### 4. **Error Tracking**
Consider integrating Sentry:
```python
import sentry_sdk
sentry_sdk.init(dsn="your-dsn")
```

---

## 🧪 Testing in Production

### Pre-Deployment Test
```bash
# 1. Build image
docker build -f Dockerfile.video -t video-test .

# 2. Run locally
docker run -p 8001:8001 video-test

# 3. Test with script
python test_flask_api.py
```

Expected results:
- ✅ API health check returns 200
- ✅ Processing rate: 9+ frames/sec
- ✅ Confidence scores: 0-100 range
- ✅ No crashes after 100+ frames

### Load Testing
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test with 100 concurrent requests
ab -n 100 -c 10 -T 'application/json' -p test_payload.json http://localhost:8001/analyze-video
```

---

## 🐛 Common Deployment Issues

### Issue 1: "Model file not found"
**Error**: `FileNotFoundError: Required model file missing: face_landmarker.task`

**Solution**: Ensure `face_landmarker.task` is in the same directory and copied in Dockerfile
```dockerfile
COPY face_landmarker.task .
```

### Issue 2: "ModuleNotFoundError: No module named 'mediapipe'"
**Solution**: Install all dependencies:
```bash
pip install -r requirements.txt
```

### Issue 3: "OpenCV error: libGL.so.1: cannot open shared object file"
**Solution**: Install system libraries (Dockerfile already includes these):
```bash
apt-get install libgl1-mesa-glx libglib2.0-0
```

### Issue 4: Slow performance (<2 fps)
**Possible causes**:
- Insufficient CPU/RAM
- Running on shared/throttled instance
- DeepFace model not cached (first request)

**Solution**:
- Upgrade to 4+ vCPU instance
- Warm up with test request after deployment
- Consider GPU instance

### Issue 5: Memory leak / OOM (Out of Memory)
**Cause**: DeepFace/TensorFlow accumulating memory

**Solution**: Add memory limits and restart strategy:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
  restart_policy:
    condition: on-failure
    max_attempts: 3
```

---

## ✅ Final Deployment Checklist

Before going live:

- [ ] `face_landmarker.task` model file included in deployment
- [ ] All dependencies installed (`requirements.txt`)
- [ ] System libraries installed (for Docker/Linux)
- [ ] Health check endpoint working (`/health`)
- [ ] API authentication implemented (if public-facing)
- [ ] Rate limiting configured
- [ ] CORS properly configured for frontend domain
- [ ] Resource limits set (CPU/memory)
- [ ] Monitoring/logging configured
- [ ] Error tracking integrated (optional: Sentry)
- [ ] Load testing completed
- [ ] Backup/failover strategy defined
- [ ] Documentation updated with production URLs

---

## 📞 Support

For deployment issues:
1. Check logs: `docker logs <container-id>`
2. Verify health: `curl http://localhost:8001/health`
3. Test locally first: `python test_flask_api.py`
4. Review `VIDEO_ANALYSIS_CHANGELOG.md` for latest changes

**Current Performance Benchmark** (Feb 2026):
- Local MacBook: 9.4 frames/sec
- Docker (2 CPU, 4GB RAM): Expected 7-9 frames/sec
- Cloud VM (4 CPU, 8GB RAM): Expected 10-12 frames/sec
