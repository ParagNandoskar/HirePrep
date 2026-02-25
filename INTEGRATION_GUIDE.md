# HirePrep - Video & Audio Analysis Integration Guide

## 🎯 Overview

Integrated real-time video and audio analysis into the HirePrep interview system with automatic leaderboard updates based on behavioral analysis scores.

## ✅ What's Been Integrated

### Backend Services

1. **Analysis Service** (`backend/src/services/analysisService.js`)
   - Orchestrates video/audio analysis with Python microservices
   - Processes interview answers with combined analysis
   - Automatically updates leaderboard rankings
   - Calculates weighted scores (Video 30%, Audio 30%, QA 40%)

2. **Analysis Routes** (`backend/src/routes/analysis.js`)
   - `POST /api/analysis/video-frame` - Analyze single video frame
   - `POST /api/analysis/audio` - Analyze audio recording
   - `POST /api/analysis/interview-answer` - Process complete answer
   - `POST /api/analysis/finalize-interview/:id` - Finalize and update leaderboard
   - `GET /api/analysis/leaderboard/:jobId` - Get job leaderboard
   - `GET /api/analysis/my-rank/:jobId` - Get candidate's rank
   - `GET /api/analysis/health` - Check service health

3. **Updated Interview Service** (`backend/src/services/interviewService.js`)
   - Enhanced `processVideoAnalysis()` - Calls Python video service
   - Enhanced `processAudioAnalysis()` - Calls Python audio service
   - Proper data transformation for Interview model

### Frontend Components

1. **Analysis Service** (`frontend/src/services/analysisService.js`)
   - API client for video/audio analysis
   - `InterviewRecordingManager` - Manages video/audio capture
   - Media helpers (blob conversion, frame capture, audio recording)
   - Real-time frame analysis (every 2 seconds)

2. **Live Interview Component** (`frontend/src/pages/LiveInterviewAnalysis.jsx`)
   - Complete interview recording UI
   - Real-time video streaming with emotion detection
   - Audio recording with voice quality analysis
   - Automatic score display after each answer
   - Automatic leaderboard update on completion

3. **Updated Leaderboard** (`frontend/src/pages/Leaderboard.jsx`)
   - Uses new analysis service API
   - Shows video/audio/QA score breakdowns
   - Real-time rank updates
   - Percentile calculations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌────────────────┐  ┌──────────────────────────────────┐  │
│  │ LiveInterview  │  │   InterviewRecordingManager      │  │
│  │   Component    │──│   - Video capture every 2s       │  │
│  │                │  │   - Audio recording              │  │
│  └────────────────┘  └──────────────────────────────────┘  │
│           │                        │                         │
│           └────────────┬───────────┘                         │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP/JSON
┌────────────────────────┼─────────────────────────────────────┐
│                        ▼                                     │
│              Backend (Express.js)                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/analysis/* Routes                                │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │  Analysis Service                               │   │ │
│  │  │  - processInterviewAnswer()                    │   │ │
│  │  │  - finalizeInterview()                         │   │ │
│  │  │  - updateLeaderboard()                          │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                        │                         │
│     ┌─────┴─────┐         ┌───────┴────────┐               │
│     │ MongoDB   │         │ Python Services │               │
│     │ Storage   │         │  (Flask Apps)   │               │
│     └───────────┘         └────────┬────────┘               │
│                                    │                         │
└────────────────────────────────────┼─────────────────────────┘
                                     │
         ┌───────────────────────────┴──────────────────────┐
         │                                                   │
┌────────▼──────────┐                       ┌────────────────▼─────┐
│ Video Service     │                       │  Audio Service        │
│ Port: 8001        │                       │  Port: 8002           │
│                   │                       │                       │
│ - MediaPipe       │                       │ - Signal Processing   │
│ - DeepFace        │                       │ - Librosa             │
│ - Emotion detect  │                       │ - Voice analysis      │
│ - Eye contact     │                       │ - Filler detection    │
│ - Engagement      │                       │ - Pace/nervousness    │
└───────────────────┘                       └───────────────────────┘
```

## 🚀 How to Use

### 1. Start All Services

```bash
# Terminal 1: Start Python services
cd backend/python-services
python3 app.py
# This starts both video (8001) and audio (8002) services

# Terminal 2: Start Node.js backend
cd backend
npm run dev
# Backend runs on port 5000

# Terminal 3: Start React frontend
cd frontend
npm run dev
# Frontend runs on port 5173
```

### 2. Environment Variables

Add to `backend/.env`:

```env
# Python Service URLs
PYTHON_VIDEO_SERVICE_URL=http://localhost:8001
PYTHON_AUDIO_SERVICE_URL=http://localhost:8002

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hireprep

# JWT
JWT_SECRET=your_jwt_secret

# AWS S3 (optional for video storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1
```

### 3. Flow: Taking an Interview

1. **Student starts interview**
   ```javascript
   // Frontend calls
   const response = await interviewService.startInterview({
     jobId: '...',
     type: 'screening',
     duration: 30
   })
   ```

2. **Recording starts automatically**
   ```javascript
   const manager = new InterviewRecordingManager(interviewId, videoElement)
   await manager.startRecording()
   ```

3. **Student answers question**
   ```javascript
   // Start recording for question
   manager.startAnswerRecording(questionId)
   
   // ... student speaks ...
   
   // Stop and process
   const audioData = await manager.stopAnswerRecording()
   ```

4. **Analysis happens automatically**
   ```javascript
   // Frontend sends to backend
   await analysisService.processInterviewAnswer({
     interviewId,
     questionId,
     videoBase64,  // Captured frame
     audioBase64,  // Recorded audio
     transcript,   // Optional text
     question,
     answer
   })
   
   // Backend orchestrates:
   // 1. Video analysis (emotions, eye contact, engagement)
   // 2. Audio analysis (voice quality, pace, nervousness, fillers)
   // 3. Combines scores (weighted average)
   // 4. Saves to interview document
   ```

5. **Interview completion**
   ```javascript
   // Finalize interview
   await analysisService.finalizeInterview(interviewId)
   
   // Backend:
   // 1. Aggregates all answer scores
   // 2. Calculates overall score (Video 30%, Audio 30%, QA 40%)
   // 3. Updates leaderboard for the job
   // 4. Assigns ranks based on scores
   ```

6. **View leaderboard**
   ```javascript
   // Get rankings
   const leaderboard = await analysisService.getJobLeaderboard(jobId)
   
   // Shows:
   // - Rank (1, 2, 3, ...)
   // - Name
   // - Overall score
   // - Percentile
   ```

## 📊 Scoring System

### Individual Components

**Video Analysis (30%)**
- Emotion detection: happy, sad, angry, surprised, fear, disgust, neutral
- Eye contact score: 0-100
- Engagement score: 0-100
- Overall video confidence: 0-100

**Audio Analysis (30%)**
- Voice confidence: 0-100
- Speaking rate: WPM (120-160 is ideal)
- Volume consistency: 0-100
- Nervousness: 0-100 (lower is better)
- Filler words: count and percentage

**QA Analysis (40%)**
- Relevance: How well answer addresses question
- Completeness: Thoroughness of response
- Technical accuracy: Correctness
- Communication: Clarity and structure

### Overall Score Calculation

```javascript
// In analysisService.finalizeInterview()
overallScore = (
  avgVideoScore * 0.3 + 
  avgAudioScore * 0.3 + 
  avgQAScore * 0.4
)
```

### Leaderboard Ranking

1. Candidates sorted by `overallScore` (descending)
2. Ranks assigned: 1st, 2nd, 3rd, ...
3. Percentile calculated: `(1 - (rank - 1) / totalCandidates) * 100`

## 🧪 Testing the Integration

### 1. Check Service Health

```bash
# Backend health
curl http://localhost:5000/api/analysis/health

# Should return:
{
  "status": "healthy",
  "services": {
    "videoService": true,
    "audioService": true
  }
}
```

### 2. Test Video Analysis

```bash
curl -X POST http://localhost:8001/analyze-frame \
  -H "Content-Type: application/json" \
  -d '{
    "frame_base64": "...",
    "candidate_id": "test",
    "interview_id": "test",
    "question_id": 1
  }'
```

### 3. Test Audio Analysis

```bash
curl -X POST http://localhost:8002/analyze-audio \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "...",
    "transcript": "This is a test answer"
  }'
```

### 4. End-to-End Test

1. Navigate to: `http://localhost:5173/live-interview-analysis/:jobId`
2. Allow camera and microphone access
3. Answer a question
4. Check browser console for analysis results
5. View leaderboard at: `http://localhost:5173/leaderboard`

## 📁 File Changes Summary

### New Files Created

- ✅ `backend/src/services/analysisService.js` - Analysis orchestration
- ✅ `backend/src/routes/analysis.js` - API endpoints
- ✅ `frontend/src/services/analysisService.js` - Frontend API client
- ✅ `frontend/src/pages/LiveInterviewAnalysis.jsx` - Interview UI
- ✅ `INTEGRATION_GUIDE.md` - This documentation

### Modified Files

- ✅ `backend/src/app.js` - Added analysis routes
- ✅ `backend/src/services/interviewService.js` - Updated video/audio processing
- ✅ `frontend/src/pages/Leaderboard.jsx` - Uses new analysis API

## 🔧 Troubleshooting

### Python Services Not Starting

```bash
# Check if ports are in use
lsof -i :8001
lsof -i :8002

# Kill processes if needed
pkill -f "python.*app.py"

# Restart services
cd backend/python-services
python3 app.py
```

### Camera/Microphone Access Denied

- Must use HTTPS or localhost
- Check browser permissions
- Try different browser (Chrome recommended)

### Analysis Failing

```javascript
// Check service health in frontend
import { analysisService } from './services/analysisService'

const health = await analysisService.checkHealth()
console.log('Service health:', health)
```

### Leaderboard Not Updating

1. Check if interview was finalized:
   ```javascript
   const interview = await Interview.findById(interviewId)
   console.log('Status:', interview.status) // Should be 'completed'
   console.log('Score:', interview.score) // Should have value
   ```

2. Check leaderboard document:
   ```javascript
   const leaderboard = await Leaderboard.findOne({ jobId })
   console.log('Candidates:', leaderboard.candidates.length)
   ```

## 🎓 Best Practices

1. **Frame Capture Rate**
   - Current: Every 2 seconds
   - Adjust in `InterviewRecordingManager` if needed
   - Balance between data quality and performance

2. **Audio Quality**
   - Use `echoCancellation: true`
   - Use `noiseSuppression: true`
   - Record in quiet environment

3. **Error Handling**
   - Always check `response.success`
   - Provide user feedback for failures
   - Log errors for debugging

4. **Performance**
   - Compress frames (current: 0.7 JPEG quality)
   - Use WebM for audio (smaller than WAV)
   - Process analysis asynchronously

## 📈 Next Steps

1. **Add Real-time Feedback**
   - Show live emotion overlay on video
   - Display speaking rate indicator
   - Show filler word counter

2. **Enhance Scoring**
   - Add answer content analysis (Gemini API)
   - Include resume matching score
   - Consider interview difficulty

3. **Improve UI**
   - Add practice mode with instant feedback
   - Show score breakdown after each answer
   - Add tips based on weak areas

4. **Analytics Dashboard**
   - Show trends over multiple interviews
   - Compare performance across jobs
   - Identify strengths and weaknesses

## 🤝 Contributing

To extend this integration:

1. **Add new analysis factors**
   - Update `analysisService.processInterviewAnswer()`
   - Modify scoring weights
   - Update Interview model schema

2. **Add new Python services**
   - Create new Flask app in `backend/python-services/services/`
   - Register routes
   - Update `analysisService.js` to call new endpoints

3. **Enhance frontend**
   - Extend `InterviewRecordingManager`
   - Add new UI components
   - Improve real-time feedback

## 📞 Support

For issues or questions:
- Check logs: `backend/python-services/*.log`
- Enable debug mode in Python services
- Check browser console for frontend errors
- Verify all services are running on correct ports

---

**Last Updated**: February 23, 2026
**Version**: 1.0.0
**Status**: ✅ Fully Integrated and Production Ready
