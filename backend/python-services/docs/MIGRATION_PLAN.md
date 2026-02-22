# Python Services - Microservice Architecture Migration Plan

## Current Structure Analysis

### Files Identified:
```
python-services/
├── audio_analysis.py                    # Main audio service
├── audio_analysis_old_backup.py         # Backup (can archive)
├── audio_service/                       # Audio ML models
│   ├── models/
│   ├── scoring/
│   ├── routes/
│   └── local_models/
├── video_analysis.py                    # Main video service
├── mongo_storage.py                     # Shared MongoDB logic
├── app.py                               # Flask app entry point
├── gunicorn_config.py                   # Production config
├── requirements.txt                     # Dependencies
├── .env.example                         # Environment template
├── Dockerfile.audio                     # Audio container
├── Dockerfile.video                     # Video container
├── docker-compose.yml                   # Multi-container orchestration
├── download_models.py                   # Setup script
├── check_mongo_frames.py                # Monitoring script
├── clear_mongo_frames.py                # Cleanup script
├── face_center_guide.py                 # Utility script
├── view_frame_timeline.py               # Visualization script
├── verify_local_models.py               # Verification script
├── test_audio.py                        # Audio tests
├── test_audio_v2.py                     # Audio tests v2
├── test_mongodb_integration.py          # MongoDB tests
├── test_deployment.sh                   # Deployment test
├── face_landmarker.task                 # MediaPipe model
├── IMPLEMENTATION_COMPLETE.md           # Docs
├── ANALYSIS_SUMMARY.md                  # Docs
├── LOCAL_MODELS_SETUP.md                # Docs
├── DEPLOYMENT_GUIDE.md                  # Docs
├── REFACTORING_COMPLETE.md              # Docs
├── AUDIO_SERVICE_V2_README.md           # Docs
├── VIDEO_ANALYSIS_CHANGELOG.md          # Docs
├── VIDEO_STORAGE_GUIDE.md               # Docs
├── detailed_frame_analysis.csv          # Data file
├── captured_frames/                     # Video output
├── deepface_home/                       # DeepFace cache
├── venv/                                # Virtual environment
└── __pycache__/                         # Python cache
```

---

## Target Structure

```
python-services/
├── services/
│   ├── __init__.py
│   ├── audio_service/
│   │   ├── __init__.py
│   │   ├── audio_analysis.py          # FROM: ./audio_analysis.py
│   │   ├── models/                     # FROM: ./audio_service/models/
│   │   ├── scoring/                    # FROM: ./audio_service/scoring/
│   │   ├── routes/                     # FROM: ./audio_service/routes/
│   │   └── local_models/               # FROM: ./audio_service/local_models/
│   │
│   └── video_service/
│       ├── __init__.py
│       ├── video_analysis.py           # FROM: ./video_analysis.py
│       └── models/
│           └── face_landmarker.task    # FROM: ./face_landmarker.task
│
├── core/
│   ├── __init__.py
│   ├── mongo_storage.py                # FROM: ./mongo_storage.py
│   ├── config.py                       # NEW: Configuration management
│   ├── logger.py                       # NEW: Centralized logging
│   └── utils.py                        # NEW: Shared utilities
│
├── scripts/
│   ├── __init__.py
│   ├── download_models.py              # FROM: ./download_models.py
│   ├── check_mongo_frames.py           # FROM: ./check_mongo_frames.py
│   ├── clear_mongo_frames.py           # FROM: ./clear_mongo_frames.py
│   ├── face_center_guide.py            # FROM: ./face_center_guide.py
│   ├── view_frame_timeline.py          # FROM: ./view_frame_timeline.py
│   └── verify_local_models.py          # FROM: ./verify_local_models.py
│
├── tests/
│   ├── __init__.py
│   ├── test_audio.py                   # FROM: ./test_audio.py
│   ├── test_audio_v2.py                # FROM: ./test_audio_v2.py
│   ├── test_mongodb_integration.py     # FROM: ./test_mongodb_integration.py
│   └── test_deployment.sh              # FROM: ./test_deployment.sh
│
├── deployment/
│   ├── Dockerfile.audio                # FROM: ./Dockerfile.audio
│   ├── Dockerfile.video                # FROM: ./Dockerfile.video
│   ├── docker-compose.yml              # FROM: ./docker-compose.yml
│   └── gunicorn_config.py              # FROM: ./gunicorn_config.py
│
├── docs/
│   ├── IMPLEMENTATION_COMPLETE.md      # FROM: ./IMPLEMENTATION_COMPLETE.md
│   ├── ANALYSIS_SUMMARY.md             # FROM: ./ANALYSIS_SUMMARY.md
│   ├── LOCAL_MODELS_SETUP.md           # FROM: ./LOCAL_MODELS_SETUP.md
│   ├── DEPLOYMENT_GUIDE.md             # FROM: ./DEPLOYMENT_GUIDE.md
│   ├── REFACTORING_COMPLETE.md         # FROM: ./REFACTORING_COMPLETE.md
│   ├── AUDIO_SERVICE_V2_README.md      # FROM: ./AUDIO_SERVICE_V2_README.md
│   ├── VIDEO_ANALYSIS_CHANGELOG.md     # FROM: ./VIDEO_ANALYSIS_CHANGELOG.md
│   └── VIDEO_STORAGE_GUIDE.md          # FROM: ./VIDEO_STORAGE_GUIDE.md
│
├── data/
│   ├── captured_frames/                # FROM: ./captured_frames/
│   └── detailed_frame_analysis.csv     # FROM: ./detailed_frame_analysis.csv
│
├── archives/
│   └── audio_analysis_old_backup.py    # FROM: ./audio_analysis_old_backup.py
│
├── app.py                              # FROM: ./app.py (UPDATE imports)
├── requirements.txt                    # FROM: ./requirements.txt
├── .env.example                        # FROM: ./.env.example
├── README.md                           # NEW: Main documentation
├── venv/                               # KEEP: Virtual environment
├── deepface_home/                      # KEEP: DeepFace cache
└── __pycache__/                        # KEEP: Python cache
```

---

## Migration Strategy

### Phase 1: Create Directory Structure
```powershell
# Create main directories
New-Item -ItemType Directory -Path "services/audio_service" -Force
New-Item -ItemType Directory -Path "services/video_service/models" -Force
New-Item -ItemType Directory -Path "core" -Force
New-Item -ItemType Directory -Path "scripts" -Force
New-Item -ItemType Directory -Path "tests" -Force
New-Item -ItemType Directory -Path "deployment" -Force
New-Item -ItemType Directory -Path "docs" -Force
New-Item -ItemType Directory -Path "data" -Force
New-Item -ItemType Directory -Path "archives" -Force
```

### Phase 2: Move Audio Service Files
```powershell
# Move audio_analysis.py
Move-Item "audio_analysis.py" "services/audio_service/" -Force

# Move audio_service subfolders
Move-Item "audio_service/models" "services/audio_service/" -Force
Move-Item "audio_service/scoring" "services/audio_service/" -Force
Move-Item "audio_service/routes" "services/audio_service/" -Force
Move-Item "audio_service/local_models" "services/audio_service/" -Force
```

### Phase 3: Move Video Service Files
```powershell
# Move video_analysis.py
Move-Item "video_analysis.py" "services/video_service/" -Force

# Move face_landmarker.task
Move-Item "face_landmarker.task" "services/video_service/models/" -Force
```

### Phase 4: Move Core Files
```powershell
Move-Item "mongo_storage.py" "core/" -Force
```

### Phase 5: Move Scripts
```powershell
Move-Item "download_models.py" "scripts/" -Force
Move-Item "check_mongo_frames.py" "scripts/" -Force
Move-Item "clear_mongo_frames.py" "scripts/" -Force
Move-Item "face_center_guide.py" "scripts/" -Force
Move-Item "view_frame_timeline.py" "scripts/" -Force
Move-Item "verify_local_models.py" "scripts/" -Force
```

### Phase 6: Move Tests
```powershell
Move-Item "test_audio.py" "tests/" -Force
Move-Item "test_audio_v2.py" "tests/" -Force
Move-Item "test_mongodb_integration.py" "tests/" -Force
Move-Item "test_deployment.sh" "tests/" -Force
```

### Phase 7: Move Deployment Files
```powershell
Move-Item "Dockerfile.audio" "deployment/" -Force
Move-Item "Dockerfile.video" "deployment/" -Force
Move-Item "docker-compose.yml" "deployment/" -Force
Move-Item "gunicorn_config.py" "deployment/" -Force
```

### Phase 8: Move Documentation
```powershell
Move-Item "IMPLEMENTATION_COMPLETE.md" "docs/" -Force
Move-Item "ANALYSIS_SUMMARY.md" "docs/" -Force
Move-Item "LOCAL_MODELS_SETUP.md" "docs/" -Force
Move-Item "DEPLOYMENT_GUIDE.md" "docs/" -Force
Move-Item "REFACTORING_COMPLETE.md" "docs/" -Force
Move-Item "AUDIO_SERVICE_V2_README.md" "docs/" -Force
Move-Item "VIDEO_ANALYSIS_CHANGELOG.md" "docs/" -Force
Move-Item "VIDEO_STORAGE_GUIDE.md" "docs/" -Force
```

### Phase 9: Move Data & Archives
```powershell
Move-Item "captured_frames" "data/" -Force
Move-Item "detailed_frame_analysis.csv" "data/" -Force
Move-Item "audio_analysis_old_backup.py" "archives/" -Force
```

---

## Import Path Updates Required

### 1. services/audio_service/audio_analysis.py
```python
# OLD imports:
from audio_service.routes.audio_routes import create_audio_routes

# NEW imports:
from services.audio_service.routes.audio_routes import create_audio_routes
```

### 2. services/audio_service/models/*.py
```python
# OLD imports:
from audio_service.models.X import Y

# NEW imports:
from services.audio_service.models.X import Y
```

### 3. services/audio_service/routes/audio_routes.py
```python
# OLD imports:
from audio_service.models.wav2vec_emotion import get_emotion_model
from audio_service.models.whisper_transcriber import get_whisper_model
from audio_service.models.sentiment_model import get_sentiment_model
from audio_service.scoring.confidence_engine import get_confidence_engine

# NEW imports:
from services.audio_service.models.wav2vec_emotion import get_emotion_model
from services.audio_service.models.whisper_transcriber import get_whisper_model
from services.audio_service.models.sentiment_model import get_sentiment_model
from services.audio_service.scoring.confidence_engine import get_confidence_engine
```

### 4. services/video_service/video_analysis.py
```python
# OLD imports:
from mongo_storage import MongoFrameStorage

# NEW imports:
from core.mongo_storage import MongoFrameStorage
```

### 5. scripts/*.py
```python
# OLD imports (download_models.py):
from audio_service.models.X import Y

# NEW imports:
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from services.audio_service.models.X import Y
```

### 6. tests/*.py
```python
# Add path adjustment at top:
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
```

### 7. deployment/Dockerfile.audio
```dockerfile
# OLD COPY:
COPY audio_analysis.py .
COPY audio_service/ ./audio_service/

# NEW COPY:
COPY services/audio_service/ ./services/audio_service/
COPY core/ ./core/
```

### 8. deployment/Dockerfile.video
```dockerfile
# OLD COPY:
COPY video_analysis.py .
COPY mongo_storage.py .

# NEW COPY:
COPY services/video_service/ ./services/video_service/
COPY core/ ./core/
```

---

## Risks & Mitigation

### Risk 1: Broken Imports
- **Mitigation**: Update all imports systematically
- **Test**: Run each service after updates

### Risk 2: Local Model Paths
- **Impact**: `audio_service/local_models/` path changes
- **Mitigation**: Update path resolution in model files

### Risk 3: Docker Build Failures
- **Impact**: COPY paths in Dockerfiles
- **Mitigation**: Update Dockerfiles with new structure

### Risk 4: Script Execution
- **Impact**: Scripts may not find modules
- **Mitigation**: Add `sys.path` adjustments

---

## Rollback Plan

If migration fails:
```powershell
# Restore from git
git checkout .
git clean -fd

# Or manual rollback
# (Keep backup of original structure)
```

---

## Testing Checklist

After migration:
- [ ] Audio service starts: `python services/audio_service/audio_analysis.py`
- [ ] Video service starts: `python services/video_service/video_analysis.py`
- [ ] Tests pass: `python tests/test_audio_v2.py`
- [ ] MongoDB connects: `python tests/test_mongodb_integration.py`
- [ ] Docker builds: `docker build -f deployment/Dockerfile.audio .`
- [ ] Verification script: `python scripts/verify_local_models.py`

---

## Benefits of New Structure

1. **Clear Separation of Concerns**
   - Services isolated
   - Shared code in `core/`
   - Scripts organized

2. **Microservice Ready**
   - Each service can be deployed independently
   - Docker containers map cleanly to services

3. **Better Maintainability**
   - Easy to find files
   - Logical grouping
   - Scalable structure

4. **Professional Standards**
   - Industry-standard layout
   - Easy onboarding for new devs
   - Clear documentation organization

---

## Execution Order

1. ✅ Create directory structure
2. ✅ Move files (services → core → scripts → tests → deployment → docs)
3. ✅ Create __init__.py files
4. ✅ Update imports in moved files
5. ✅ Update Dockerfiles
6. ✅ Test each service
7. ✅ Update documentation paths
8. ✅ Verify everything works
9. ✅ Commit changes

---

**Status**: Ready for execution  
**Estimated Time**: 30-45 minutes  
**Breaking Risk**: LOW (with systematic approach)
