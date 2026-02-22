# Local Model Setup Guide - Audio Analysis v2.0

## Overview

The audio analysis service now uses **locally stored models** instead of downloading from HuggingFace at runtime. This provides:

- ✅ **No internet required** at runtime
- ✅ **Faster startup** (no download delays)
- ✅ **Production-ready** deployment
- ✅ **Docker-compatible** (offline operation)
- ✅ **Consistent behavior** (no version surprises)

Similar to how MediaPipe uses `.task` files for local execution.

---

## Quick Start

### 1. Download Models (One-Time Setup)

```bash
cd backend/python-services
python download_models.py
```

**What this does:**
- Downloads 3 models (~920MB total)
- Saves them to `audio_service/local_models/`
- Takes 2-10 minutes depending on internet speed

**Models Downloaded:**
- `wav2vec2-emotion/` (~370MB) - Emotion recognition
- `whisper-base/` (~290MB) - Transcription
- `distilbert-sentiment/` (~260MB) - Sentiment analysis

### 2. Run the Service

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate    # Linux/Mac

# Run service
python audio_analysis.py
```

**Expected output:**
```
🚀 Audio Analysis Service v2.0 - MODEL-BASED ARCHITECTURE
   ✅ Using LOCAL model (no internet required)
   Path: audio_service/local_models/wav2vec2-emotion
   ...
```

---

## Directory Structure

```
backend/python-services/
├── download_models.py          # Download script (run once)
├── audio_analysis.py           # Main service
├── audio_service/
│   ├── models/
│   │   ├── wav2vec_emotion.py        # Loads from local
│   │   ├── whisper_transcriber.py    # Loads from local
│   │   └── sentiment_model.py        # Loads from local
│   ├── local_models/                 # Created by download_models.py
│   │   ├── wav2vec2-emotion/         # ~370MB
│   │   ├── whisper-base/             # ~290MB
│   │   └── distilbert-sentiment/     # ~260MB
│   ├── scoring/
│   └── routes/
```

---

## Docker Deployment

### Build Image (After Downloading Models)

```bash
cd backend/python-services

# 1. Download models first
python download_models.py

# 2. Build Docker image
docker build -f Dockerfile.audio -t hireprep-audio-v2 .
```

**Important:** Models are copied into the Docker image during build. They will NOT be downloaded at runtime.

### Run Container

```bash
docker run -d \
  --name audio-analysis \
  -p 8002:8002 \
  hireprep-audio-v2
```

Container runs **completely offline** - no HuggingFace calls.

---

## Verification

### Check Models Were Downloaded

```bash
ls audio_service/local_models/
```

Should show:
```
wav2vec2-emotion/
whisper-base/
distilbert-sentiment/
```

### Check Service Logs

When starting the service, you should see:
```
✅ Using LOCAL model (no internet required)
Path: audio_service/local_models/wav2vec2-emotion
```

If you see:
```
❌ Local model not found at: ...
   Run 'python download_models.py' first to download models.
```

Then you need to run the download script.

---

## Troubleshooting

### Error: "Local model not found"

**Problem:** Service can't find models

**Solution:**
```bash
python download_models.py
```

### Error: Download script fails

**Possible causes:**
1. No internet connection
2. HuggingFace hub is down
3. Insufficient disk space (~1GB needed)

**Solution:**
- Check internet connection
- Ensure you have 1GB free space
- Try again later if HuggingFace is down

### Models not loading in Docker

**Problem:** Container fails to start

**Solution:**
1. Ensure models are downloaded BEFORE building image
2. Check Dockerfile.audio includes:
   ```dockerfile
   COPY audio_service/local_models/ ./audio_service/local_models/
   ```
3. Rebuild image after downloading models

---

## Git and Version Control

**Important:** Models are excluded from git (too large)

`.gitignore` contains:
```
# HuggingFace models (large files, ~920MB)
/backend/python-services/audio_service/local_models/
local_models/
```

**For team deployment:**
1. Each developer runs `download_models.py` locally
2. CI/CD pipeline runs `download_models.py` during build
3. Docker images include models (built after download)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Download ML Models
  run: |
    cd backend/python-services
    python download_models.py

- name: Build Docker Image
  run: |
    cd backend/python-services
    docker build -f Dockerfile.audio -t audio-service:${{ github.sha }} .
```

### Jenkins Pipeline

```groovy
stage('Download Models') {
    steps {
        dir('backend/python-services') {
            sh 'python download_models.py'
        }
    }
}

stage('Build Docker') {
    steps {
        dir('backend/python-services') {
            sh 'docker build -f Dockerfile.audio -t audio-service:latest .'
        }
    }
}
```

---

## Model Update Procedure

If you need to update models (e.g., newer version):

1. **Delete old models:**
   ```bash
   rm -rf audio_service/local_models/*
   ```

2. **Update model names in `download_models.py`:**
   ```python
   "hub_name": "openai/whisper-large-v3",  # Example: upgrade to large
   ```

3. **Re-download:**
   ```bash
   python download_models.py
   ```

4. **Test:**
   ```bash
   python audio_analysis.py
   ```

5. **Rebuild Docker:**
   ```bash
   docker build -f Dockerfile.audio -t hireprep-audio-v2 .
   ```

---

## Performance Notes

### Startup Time
- **With HuggingFace cache:** 10-30s (first request)
- **With local models:** 3-5s (immediate)

### Runtime
- No difference in inference speed
- Same GPU acceleration support
- No network latency

### Storage
- **Cache location (before):** `~/.cache/huggingface/` (1-2GB)
- **Local models (now):** `audio_service/local_models/` (~920MB)

---

## Architecture Comparison

### OLD: Runtime Download
```python
pipeline("audio-classification", model="superb/wav2vec2-base-superb-er")
# ❌ Downloads on first request
# ❌ Requires internet
# ❌ Unpredictable startup time
```

### NEW: Local Loading
```python
pipeline("audio-classification", model="./local_models/wav2vec2-emotion")
# ✅ Loads immediately from disk
# ✅ No internet required
# ✅ Consistent performance
```

---

## FAQ

**Q: Do I need to download models every time I deploy?**
A: No. Once downloaded, models persist locally. Only need to download once per environment/machine.

**Q: Can I use the old HuggingFace cache?**
A: No. The code now expects models in `audio_service/local_models/`. Run `download_models.py`.

**Q: Will this work offline?**
A: Yes! After downloading once, the service runs completely offline.

**Q: How do I verify models are local?**
A: Check startup logs for "✅ Using LOCAL model (no internet required)"

**Q: What if I delete local_models by accident?**
A: Just run `python download_models.py` again to re-download.

**Q: Can I use GPU?**
A: Yes! Local models support GPU acceleration same as before.

---

## Related Files

- `download_models.py` - Model download script
- `audio_service/models/wav2vec_emotion.py` - Wav2Vec2 loading
- `audio_service/models/whisper_transcriber.py` - Whisper loading
- `audio_service/models/sentiment_model.py` - DistilBERT loading
- `Dockerfile.audio` - Docker build config
- `.gitignore` - Excludes local_models from git

---

## Support

For issues:
1. Check logs: `python audio_analysis.py`
2. Verify models exist: `ls audio_service/local_models/`
3. Re-download if needed: `python download_models.py`
4. Check Dockerfile.audio has COPY instruction

---

**Version:** 2.0 (Local Models)  
**Updated:** February 22, 2026  
**Status:** Production Ready ✅
