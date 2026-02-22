# Python Microservices

Production-ready microservice architecture for audio and video analysis with ML models.

## 📁 Project Structure

```
python-services/
├── services/                      # Microservices
│   ├── audio_service/             # Audio analysis microservice
│   │   ├── audio_analysis.py      # Main Flask app (port 8001)
│   │   ├── models/                # ML models (Wav2Vec2, Whisper, DistilBERT)
│   │   ├── routes/                # API endpoints
│   │   ├── scoring/               # Confidence scoring engine
│   │   └── local_models/          # Downloaded HuggingFace models (~920MB)
│   └── video_service/             # Video analysis microservice
│       ├── video_analysis.py      # Main Flask app (port 8002)
│       └── models/                # MediaPipe face_landmarker.task
│
├── core/                          # Shared utilities
│   └── mongo_storage.py           # MongoDB integration for video frames
│
├── scripts/                       # Utility scripts
│   ├── download_models.py         # Download ML models for offline use
│   ├── verify_local_models.py     # Verify model downloads
│   ├── check_mongo_frames.py      # MongoDB frame inspector
│   ├── clear_mongo_frames.py      # MongoDB cleanup
│   ├── face_center_guide.py       # Video calibration utility
│   └── view_frame_timeline.py     # Video frame timeline viewer
│
├── tests/                         # Test suite
│   ├── test_audio_v2.py           # Audio service tests
│   ├── test_mongodb_integration.py # MongoDB integration tests
│   └── test_deployment.sh         # Deployment tests
│
├── deployment/                    # Docker & deployment configs
│   ├── Dockerfile.audio           # Audio service Docker image
│   ├── Dockerfile.video           # Video service Docker image
│   ├── docker-compose.yml         # Multi-service orchestration
│   └── gunicorn_config.py         # Production WSGI config
│
├── docs/                          # Documentation
│   ├── MIGRATION_PLAN.md          # Restructuring documentation
│   ├── AUDIO_ANALYSIS_README.md   # Audio service guide
│   ├── VIDEO_ANALYSIS_README.md   # Video service guide
│   ├── MODEL_DOWNLOAD_README.md   # Model download guide
│   └── DETAILED_ANALYSIS.md       # Technical deep dive
│
├── data/                          # Runtime data
│   ├── captured_frames/           # Video frame storage
│   └── *.csv                      # Analysis results
│
├── archives/                      # Old backups
│   └── audio_analysis_old_backup.py
│
├── venv/                          # Python virtual environment
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Setup Virtual Environment

```powershell
cd backend/python-services
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Download ML Models (First Time Only)

```powershell
python scripts/download_models.py
```

This downloads:
- **Wav2Vec2** (emotion recognition) - ~500MB
- **Whisper** (transcription) - ~300MB
- **DistilBERT** (sentiment) - ~120MB

### 4. Run Services

**Audio Service (Port 8001):**
```powershell
python services/audio_service/audio_analysis.py
```

**Video Service (Port 8002):**
```powershell
python services/video_service/video_analysis.py
```

## 📊 Audio Service

**Endpoint:** `http://localhost:8001`

### Features
- **Emotion Recognition**: Wav2Vec2 model (7 emotions)
- **Speech Transcription**: Whisper model (multilingual)
- **Sentiment Analysis**: DistilBERT (positive/negative)
- **Unified Confidence Scoring**: Multi-factor confidence engine

### API Endpoints

```
GET  /health           - Health check
POST /analyze-audio    - Single audio analysis
POST /analyze-batch    - Batch audio analysis
GET  /models/info      - Model information
```

### Example Request

```bash
curl -X POST http://localhost:8002/analyze-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "...",
    "sample_rate": 16000,
    "interview_id": "12345",
    "candidate_id": "67890",
    "question_id": 1
  }'
```

## 🎥 Video Service

**Endpoint:** `http://localhost:8002`

### Features
- **Face Tracking**: MediaPipe (478 facial landmarks)
- **Head Pose Estimation**: 3D orientation (yaw, pitch, roll)
- **Gaze Tracking**: Iris position analysis
- **Emotion Recognition**: DeepFace (7 emotions)
- **MongoDB Storage**: Optional frame persistence

### API Endpoints

```
GET  /health              - Health check
POST /analyze-video       - Single frame analysis
POST /start-interview     - Start interview session
POST /end-interview       - End interview and get summary
POST /calibrate           - Baseline calibration
GET  /interview-summary   - Get interview analytics
```

## 🧪 Testing

```powershell
# Test audio service
python tests/test_audio_v2.py

# Test MongoDB integration
python tests/test_mongodb_integration.py

# Verify local models
python scripts/verify_local_models.py
```

## 🐳 Docker Deployment

### Build Images

```bash
# Audio service
docker build -f deployment/Dockerfile.audio -t hireprep-audio .

# Video service
docker build -f deployment/Dockerfile.video -t hireprep-video .
```

### Run with Docker Compose

```bash
docker-compose -f deployment/docker-compose.yml up
```

## 📦 ML Models

### Audio Service Models (Local)
Located in `services/audio_service/local_models/`:

1. **wav2vec2-emotion** (~500MB)
   - Model: `superb/wav2vec2-base-superb-er`
   - Task: Emotion recognition
   - Emotions: angry, happy, sad, neutral, fear, disgust, surprise

2. **whisper-base** (~300MB)
   - Model: `openai/whisper-base`
   - Task: Speech-to-text transcription
   - Languages: Multilingual (99 languages)

3. **distilbert-sentiment** (~120MB)
   - Model: `distilbert-base-uncased-finetuned-sst-2-english`
   - Task: Sentiment analysis
   - Classes: positive, negative

### Video Service Models

1. **MediaPipe FaceLandmarker**
   - Location: `services/video_service/models/face_landmarker.task`
   - Task: 478-point facial landmark detection
   - Size: ~11MB

2. **DeepFace** (Auto-downloaded)
   - Models: VGG-Face, Facenet, OpenFace, DeepFace
   - Task: Facial emotion recognition
   - Size: ~500MB (cached in `~/.deepface`)

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# MongoDB (optional)
MONGODB_URI=mongodb+srv://...
MONGO_STORAGE_ENABLED=false

# Service Ports
AUDIO_SERVICE_PORT=8001
VIDEO_SERVICE_PORT=8002

# ML Model Cache
TRANSFORMERS_CACHE=./services/audio_service/local_models
```

## 📚 Documentation

- [MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) - Complete restructuring guide
- [AUDIO_ANALYSIS_README.md](docs/AUDIO_ANALYSIS_README.md) - Audio service details
- [VIDEO_ANALYSIS_README.md](docs/VIDEO_ANALYSIS_README.md) - Video service details
- [MODEL_DOWNLOAD_README.md](docs/MODEL_DOWNLOAD_README.md) - Model setup guide

## 🛠️ Development

### Project Guidelines

1. **Imports**: Use absolute imports from project root
   ```python
   from services.audio_service.models import get_emotion_model
   from core.mongo_storage import init_storage
   ```

2. **Virtual Environment**: Always activate before running
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

3. **Model Management**: Download models before Docker build
   ```powershell
   python scripts/download_models.py
   ```

### Adding New Features

1. Add code to appropriate service folder
2. Update imports to use `services.service_name.*` pattern
3. Update Dockerfiles if needed
4. Add tests to `tests/` folder
5. Update this README

## 🚦 Production Deployment

### Pre-Deployment Checklist

- [ ] Download all ML models: `python scripts/download_models.py`
- [ ] Verify models: `python scripts/verify_local_models.py`
- [ ] Run tests: `python tests/test_audio_v2.py`
- [ ] Build Docker images
- [ ] Configure environment variables
- [ ] Set up MongoDB (if using video storage)
- [ ] Configure reverse proxy (nginx/traefik)
- [ ] Set up monitoring and logging

### Recommended Stack

- **Container Orchestration**: Docker Compose / Kubernetes
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Database**: MongoDB Atlas (managed)

## 📈 Performance

### Audio Service
- **First Request**: 10-30s (model loading)
- **Subsequent Requests**: <5s per audio file
- **Memory**: ~2GB (with all models loaded)
- **CPU**: Optimized for CPU inference

### Video Service
- **First Request**: 30-60s (TensorFlow + DeepFace loading)
- **Subsequent Requests**: <2s per frame
- **Memory**: ~3GB (with DeepFace models)
- **GPU**: Optional (speeds up DeepFace 3-5x)

## 🤝 Contributing

1. Follow the microservice structure
2. Add tests for new features
3. Update documentation
4. Use descriptive commit messages

## 📄 License

Part of HirePrep - AI-Powered Resume Screening System

---

**Tech Stack**: Python 3.9+, Flask, PyTorch, TensorFlow, HuggingFace Transformers, MediaPipe, DeepFace, MongoDB

**Author**: HirePrep Development Team  
**Last Updated**: February 22, 2026
