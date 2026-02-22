# Audio Analysis Service v2.0 - Model-Based Architecture

## 🎯 What Changed?

### OLD System (v1.0) - Heuristic-Based ❌
- Energy-based speech rate estimation
- Manual pause detection with silence thresholds
- Simple pitch variance stress calculation
- Rule-based formulas

### NEW System (v2.0) - Model-Based ✅
- **Wav2Vec2** for emotion recognition from voice
- **Whisper** for accurate transcription + speech metrics
- **DistilBERT** for sentiment analysis
- **Unified confidence engine** combining all models

---

## 🏗️ Architecture

```
audio_service/
├── models/
│   ├── wav2vec_emotion.py      # Emotion detection (Wav2Vec2)
│   ├── whisper_transcriber.py  # Transcription + metrics (Whisper)
│   └── sentiment_model.py      # Sentiment analysis (DistilBERT)
├── scoring/
│   └── confidence_engine.py    # Unified confidence calculation
└── routes/
    └── audio_routes.py         # Flask API endpoints

audio_analysis.py               # Main Flask application
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/python-services
pip install -r requirements.txt
```

**Key Dependencies:**
- `transformers>=4.35.0` - HuggingFace models
- `torch>=2.0.0` - PyTorch backend
- `torchaudio>=2.0.0` - Audio processing for PyTorch
- `librosa>=0.10.0` - Audio preprocessing
- `flask==3.0.0` - Web framework

### 2. Run the Service

```bash
# Development mode
python audio_analysis.py

# Production mode
gunicorn -c gunicorn_config.py audio_analysis:app
```

**Service runs on:** `http://localhost:8002`

---

## 📡 API Endpoints

### 1. Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "service": "audio-analysis-ml-v2",
  "version": "2.0.0",
  "architecture": "model-based"
}
```

### 2. Analyze Audio (Main Endpoint)
```bash
POST /analyze-audio

Request:
{
  "audio_base64": "<base64 encoded audio>",
  "transcript_optional": false
}

Response:
{
  "emotion": "neutral",
  "emotion_score": 0.87,
  "transcript": "I am confident about this role",
  "word_count": 6,
  "speech_rate_wpm": 145.2,
  "pause_count": 1,
  "hesitation_count": 0,
  "fluency_score": 87.5,
  "sentiment": "POSITIVE",
  "sentiment_score": 82.3,
  "confidence_score": 84.7,
  "confidence_grade": "A-",
  "interpretation": "Excellent confidence...",
  "timestamp": "2026-02-22T19:15:30.123Z"
}
```

### 3. Batch Analysis
```bash
POST /analyze-batch

Request:
{
  "audio_chunks": ["<base64>", "<base64>", ...],
  "merge_results": true
}

Response:
{
  "chunks_analyzed": 3,
  "avg_confidence_score": 82.1,
  "dominant_emotion": "neutral",
  "combined_transcript": "..."
}
```

### 4. Model Information
```bash
GET /models/info

Response:
{
  "emotion": {
    "name": "superb/wav2vec2-base-superb-er",
    "type": "audio_classification",
    "loaded": true
  },
  "transcription": {
    "name": "openai/whisper-base",
    "type": "speech_recognition",
    "loaded": true
  },
  "sentiment": {
    "name": "distilbert-base-uncased-finetuned-sst-2-english",
    "type": "text_classification",
    "loaded": true
  }
}
```

---

## 🧠 Confidence Scoring Formula

```python
confidence_score = 
    0.35 * emotion_confidence +    # Wav2Vec2 emotion stability
    0.25 * speech_fluency +        # Whisper fluency metrics
    0.20 * pause_behavior +        # Whisper pause analysis
    0.20 * sentiment_score         # DistilBERT sentiment
```

### Breakdown Components:

1. **Emotion Confidence (35%)**
   - Model confidence from Wav2Vec2
   - Emotion valence (positive vs negative)
   - Consistency across frames

2. **Speech Fluency (25%)**
   - Optimal speech rate: 120-150 WPM
   - Hesitation markers (um, uh, like)
   - Sentence completeness

3. **Pause Behavior (20%)**
   - Pause frequency (1-2 per 10 seconds is optimal)
   - Average pause duration
   - Pause patterns

4. **Sentiment Score (20%)**
   - DistilBERT classification
   - Positive language indicators
   - Confidence markers in speech

---

## 🎭 Model Details

### 1. Wav2Vec2 Emotion Recognition
- **Model:** `superb/wav2vec2-base-superb-er`
- **Input:** Raw audio waveform (16kHz)
- **Output:** 7 emotions (neutral, happy, sad, angry, fear, disgust, surprise)
- **Size:** ~370MB
- **Performance:** ~100ms per audio file

### 2. Whisper Transcription
- **Model:** `openai/whisper-base`
- **Input:** Raw audio waveform (16kHz)
- **Output:** Transcript with word-level timestamps
- **Size:** ~290MB
- **Features:**
  - Speech rate (WPM)
  - Pause detection
  - Hesitation markers
  - Fluency scoring

### 3. DistilBERT Sentiment
- **Model:** `distilbert-base-uncased-finetuned-sst-2-english`
- **Input:** Text transcript
- **Output:** POSITIVE/NEGATIVE + confidence
- **Size:** ~260MB
- **Performance:** ~50ms per text

---

## 🔧 Configuration

### Environment Variables
```bash
PORT=8002                    # Service port
LOG_LEVEL=INFO               # Logging level
GUNICORN_WORKERS=2           # Number of workers
GUNICORN_THREADS=4           # Threads per worker
```

### Model Loading
- **Strategy:** Lazy loading (singleton pattern)
- **First Request:** 10-30s (models auto-download)
- **Subsequent Requests:** <5s per audio
- **Cache Location:** `~/.cache/huggingface/`

---

## 📊 Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| First request | 10-30s | Model download + initialization |
| Emotion detection | ~100ms | Wav2Vec2 inference |
| Transcription | ~2-3s | Whisper inference |
| Sentiment analysis | ~50ms | DistilBERT inference |
| **Total per audio** | **3-5s** | End-to-end processing |

**Optimization Tips:**
- Use GPU for 3-5x speedup
- Batch processing for multiple files
- Pre-load models in production

---

## 🐳 Docker Deployment

### Build Image
```bash
docker build -f Dockerfile.audio -t hireprep-audio-analysis-v2 .
```

### Run Container
```bash
docker run -d \
  --name audio-analysis-v2 \
  -p 8002:8002 \
  --memory="2g" \
  --cpus="2" \
  hireprep-audio-analysis-v2
```

---

## 🧪 Testing

### Test Single Audio
```bash
python test_audio.py
```

### Test with cURL
```bash
# Health check
curl http://localhost:8002/health

# Analyze audio (replace with your base64)
curl -X POST http://localhost:8002/analyze-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhY...",
    "transcript_optional": false
  }'
```

---

## 🔍 Troubleshooting

### Models Not Downloading
```bash
# Set HuggingFace cache directory
export HF_HOME=/path/to/cache

# Or download manually
from transformers import pipeline
pipeline("audio-classification", model="superb/wav2vec2-base-superb-er")
```

### Out of Memory
```bash
# Reduce batch size or use smaller models
# Whisper-tiny instead of Whisper-base
pip install transformers[torch]
```

### Slow Performance
```bash
# Use GPU (if available)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Or use quantized models
from transformers import AutoModel
model = AutoModel.from_pretrained("model_name", load_in_8bit=True)
```

---

## 📝 Migration Guide (v1.0 → v2.0)

### Old Request Format
```json
{
  "audioData": ["chunk1", "chunk2"],
  "transcript": "text here"
}
```

### New Request Format
```json
{
  "audio_base64": "single_audio_base64",
  "transcript_optional": false
}
```

### Response Mapping
| Old Field | New Field |
|-----------|-----------|
| `toneAnalysis.confidence` | `emotion_score` |
| `overallAudioScore` | `confidence_score` |
| `sentimentScores` | `sentiment` + `sentiment_score` |
| - | `fluency_score` (NEW) |
| - | `speech_rate_wpm` (NEW) |

---

## 📚 Further Reading

- [Wav2Vec2 Paper](https://arxiv.org/abs/2006.11477)
- [Whisper Paper](https://arxiv.org/abs/2212.04356)
- [DistilBERT Paper](https://arxiv.org/abs/1910.01108)
- [HuggingFace Transformers Docs](https://huggingface.co/docs/transformers)

---

## 👥 Support

For issues or questions:
1. Check logs: `tail -f /var/log/audio-analysis.log`
2. Verify models are loaded: `GET /models/info`
3. Review documentation above
4. Contact: HirePrep Development Team

---

**Version:** 2.0.0  
**Last Updated:** February 22, 2026  
**License:** Proprietary - HirePrep
