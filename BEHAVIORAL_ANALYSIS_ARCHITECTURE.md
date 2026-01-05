# 🎯 HirePrep AI Interview System - Complete Architecture

## 📋 Overview
HirePrep uses a **multi-modal behavioral analysis system** that combines:
- **Content Analysis** (60%): Gemini AI evaluates answer quality, technical knowledge, problem-solving
- **Behavioral Analysis** (40%): Python microservices analyze video (body language, eye contact, cheating detection) and audio (tone, confidence, stress)

**Final Score Formula**: `Overall Score = (Content Score × 0.6) + (Behavioral Score × 0.4)`

---

## 🏗️ System Architecture

### **Frontend** (React + Vite)
```
AIVoiceInterview.jsx
├── Camera & Microphone Access (navigator.mediaDevices)
├── MediaRecorder API (records video + audio)
├── Web Speech API (voice-to-text in real-time)
├── Frame Extraction (canvas.toDataURL every 2 seconds)
└── Audio Chunk Extraction (Blob slicing)
```

### **Backend** (Node.js + Express)
```
geminiVoiceController.js
├── initializeVoiceInterview() → Creates session
├── getNextQuestion() → Gemini generates dynamic questions
├── getQuestionAudio() → Google Cloud TTS (natural voice)
├── submitAnswer() → Receives:
│   ├── answerText (transcript)
│   ├── videoFrames[] (base64 images)
│   ├── audioChunks[] (base64 audio)
│   └── Calls Python services for behavioral analysis
└── completeInterview() → Combines all scores
```

### **Python Microservices** (Flask)
```
Video Analysis Service (Port 8001)
├── DeepFace Emotion Detection
├── MediaPipe Face Detection
├── Eye Contact Tracking
├── Engagement Score
├── Multiple Persons Detection (cheating)
└── Looking Away Detection (cheating)

Audio Analysis Service (Port 8002)
├── Librosa Audio Processing
├── Tone Analysis (confidence, enthusiasm, clarity)
├── Stress Level Detection
├── Speech Pace Analysis
├── Sentiment Analysis
└── Volume & Energy Metrics
```

---

## 🔄 Complete Interview Flow

### **Step 1: Initialization**
```javascript
// Frontend
initializeInterview(jobId, candidateName)
  ↓
// Backend
sessionId = `${jobId}_${timestamp}`
stores in memory: {
  jobTitle, companyName, description, requirements,
  conversationHistory: [],
  currentQuestionIndex: 0
}
```

### **Step 2: Question Generation**
```javascript
// Frontend clicks "Next Question"
  ↓
// Backend: Gemini AI generates question based on:
- Job description
- Previous 4 conversation turns
- Current question number (1-5)
  ↓
// Google TTS converts question to MP3 audio
  ↓
// Frontend plays audio + displays text
```

### **Step 3: Recording & Analysis**
```javascript
// User clicks "Start Speaking"
  ↓
// Frontend starts:
1. MediaRecorder (video + audio recording)
2. Web Speech API (real-time transcript)
3. Frame extraction loop (every 2 seconds):
   - Draw video frame to canvas
   - Convert to base64 image
   - Store in videoFrames[]
4. Audio chunk extraction:
   - Slice audio Blob every 2 seconds
   - Convert to base64
   - Store in audioChunks[]
  ↓
// User clicks "Stop Speaking"
  ↓
// Frontend sends to backend:
{
  sessionId,
  answerText: "I have 5 years of experience...",
  videoFrames: ["data:image/jpeg;base64,/9j/4AAQ...", ...],
  audioChunks: ["data:audio/webm;base64,GkXfo...", ...]
}
```

### **Step 4: Behavioral Analysis (Parallel)**
```javascript
// Backend geminiVoiceController.submitAnswer()
  ↓
// Parallel Processing:

Promise.all([
  // Video Analysis
  POST http://localhost:8001/analyze-video
  {
    videoData: videoFrames[],
    interviewId: sessionId
  }
  ↓
  Python analyzes each frame:
  - Face detection (multiple persons?)
  - Eye contact percentage
  - Emotion recognition (DeepFace)
  - Engagement score
  - Looking away detection
  ↓
  Returns: {
    eyeContact: 75,
    engagement: 80,
    confidence: 70,
    attentiveness: 85,
    multiplePersonsDetected: false,
    lookingAwayPercentage: 15
  }
  ↓
  videoScore = weighted average - penalties
  
  // Audio Analysis
  POST http://localhost:8002/analyze-audio
  {
    audioChunks: audioChunks[],
    interviewId: sessionId
  }
  ↓
  Python analyzes audio features:
  - Tone (confidence, enthusiasm, clarity)
  - Stress level (pitch variation, energy)
  - Speech pace (words per minute)
  - Sentiment (positive/negative/neutral)
  ↓
  Returns: {
    toneAnalysis: {
      confidence: 68,
      clarity: 75,
      enthusiasm: 60,
      pace: 'moderate'
    },
    stressLevel: 45,
    sentimentScore: 65
  }
  ↓
  audioScore = weighted average of metrics
])

// Combine Behavioral Scores
behavioralScore = (videoScore × 0.5) + (audioScore × 0.5)

// Store in conversation history
conversationHistory.push({
  type: 'candidate_answer',
  content: answerText,
  behavioralAnalysis: {
    videoScore: 75,
    audioScore: 68,
    overallBehavioralScore: 71.5,
    cheatingIndicators: { ... },
    metrics: { ... }
  }
})
```

### **Step 5: Repeat for 5 Questions**
```
Question 1 → Answer 1 → Analysis 1
Question 2 → Answer 2 → Analysis 2
Question 3 → Answer 3 → Analysis 3
Question 4 → Answer 4 → Analysis 4
Question 5 → Answer 5 → Analysis 5
```

### **Step 6: Final Comprehensive Analysis**
```javascript
// Frontend calls completeInterview(sessionId)
  ↓
// Backend geminiVoiceService.generateFinalAnalysis()
  ↓

// 1. Calculate Average Behavioral Scores
avgBehavioralScore = average of all 5 answers' behavioral scores
avgVideoScore = average of all video scores
avgAudioScore = average of all audio scores

// 2. Check for Cheating Indicators
hasCheating = any answer had:
  - multiplePersonsDetected: true
  - lookingAwayPercentage > 50%
  - noFaceDetected > 30% of frames

// 3. Gemini AI Content Analysis
Gemini analyzes full transcript:
  ↓
  Returns: {
    contentScore: 78,
    communicationScore: 80,
    technicalScore: 75,
    problemSolvingScore: 82,
    culturalFitScore: 85,
    strengths: [...],
    improvements: [...],
    insights: "...",
    recommendation: "Recommended"
  }

// 4. Combine Scores
finalScore = (contentScore × 0.6) + (avgBehavioralScore × 0.4)
           = (78 × 0.6) + (71.5 × 0.4)
           = 46.8 + 28.6
           = 75.4 (rounded to 75)

// 5. Add Behavioral Insights
behavioralInsights = {
  eyeContact: avgVideoScore > 70 ? 'Good' : 'Needs Improvement',
  confidence: avgAudioScore > 70 ? 'Confident' : 'Nervous',
  engagement: avgBehavioralScore > 70 ? 'Highly Engaged' : 'Low Engagement'
}

// 6. Integrity Warning
if (hasCheating) {
  integrityWarning = '⚠️ Potential integrity concerns detected'
  recommendation = 'Requires Further Review'
}

// 7. Return Final Analysis
{
  overallScore: 75,
  contentScore: 78,
  behavioralScore: 72,
  videoScore: 75,
  audioScore: 68,
  communicationScore: 80,
  technicalScore: 75,
  problemSolvingScore: 82,
  culturalFitScore: 85,
  strengths: [...],
  improvements: [...],
  insights: "...",
  behavioralInsights: { ... },
  recommendation: "Recommended",
  integrityWarning: null
}
  ↓
// Update Application in MongoDB
Application.findByIdAndUpdate({
  interviewStatus: 'completed',
  screeningScore: 75,
  aiAnalysis: { ... },
  interviewCompletedAt: new Date()
})
```

---

## 📊 Scoring Breakdown

### **Content Score (60% weight)**
```
Gemini AI analyzes:
- Answer relevance to question
- Technical accuracy
- Problem-solving approach
- Communication clarity
- Job fit

Returns: contentScore (0-100)
```

### **Behavioral Score (40% weight)**
```
Video Score (50%):
├── Eye Contact (30%)
├── Engagement (25%)
├── Confidence (25%)
└── Attentiveness (20%)
Penalties:
├── Multiple persons: -20
├── Looking away > 50%: -15
└── No face > 30%: -10

Audio Score (50%):
├── Confidence (30%)
├── Clarity (25%)
├── Enthusiasm (20%)
├── Stress Control (15%)
└── Sentiment (10%)

behavioralScore = (videoScore × 0.5) + (audioScore × 0.5)
```

### **Final Score**
```
Overall Score = (contentScore × 0.6) + (behavioralScore × 0.4)

Example:
- Content: 80
- Behavioral: 70
- Final: (80 × 0.6) + (70 × 0.4) = 48 + 28 = 76
```

---

## 🎤 Recording Technologies

### **Video Recording**
```javascript
// MediaRecorder API
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp8,opus',
  videoBitsPerSecond: 1000000
});

// Frame extraction for Python analysis
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
ctx.drawImage(video, 0, 0);
const frame = canvas.toDataURL('image/jpeg', 0.8);
videoFrames.push(frame.split(',')[1]); // base64 only
```

### **Audio Recording**
```javascript
// Same MediaRecorder captures audio
// Extract chunks every 2 seconds
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    const reader = new FileReader();
    reader.onloadend = () => {
      audioChunks.push(reader.result.split(',')[1]); // base64
    };
    reader.readAsDataURL(event.data);
  }
};
```

### **Voice-to-Text (Real-time)**
```javascript
// Web Speech API (browser native)
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  let interimTranscript = '';
  let finalTranscript = '';
  
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript + ' ';
    } else {
      interimTranscript += transcript;
    }
  }
  
  setTranscript(finalTranscript + interimTranscript);
};
```

---

## 🚨 Cheating Detection

### **Visual Indicators**
```python
# video_analysis.py

1. Multiple Persons Detection
   - MediaPipe detects > 1 face in frame
   - Penalty: -20 points
   - Warning: "Multiple persons detected"

2. Frequent Looking Away
   - Eye gaze direction analysis
   - > 50% frames looking away
   - Penalty: -15 points
   - Warning: "Candidate frequently looked away"

3. No Face Detected
   - > 30% frames without face
   - Penalty: -10 points
   - Warning: "Face not visible for extended periods"
```

### **Audio Indicators**
```python
# audio_analysis.py

1. Background Voices (future enhancement)
   - Multiple voice detection
   - Warning: "Multiple voices detected"

2. Unnatural Pauses (future enhancement)
   - Reading from script detection
   - Warning: "Unusual speech patterns"
```

---

## 🗄️ Data Storage

### **MongoDB Application Schema**
```javascript
{
  interviewStatus: 'completed',
  screeningScore: 75,
  aiAnalysis: {
    scores: {
      overall: 75,        // Final combined score
      content: 78,        // Gemini content analysis
      behavioral: 72,     // Average behavioral across 5 answers
      video: 75,          // Average video score
      audio: 68,          // Average audio score
      communication: 80,
      technical: 75,
      problemSolving: 82,
      culturalFit: 85
    },
    strengths: [
      "Clear communication",
      "Strong technical knowledge"
    ],
    improvements: [
      "Could improve eye contact",
      "Reduce nervousness"
    ],
    insights: "Candidate demonstrated solid technical skills...",
    behavioralInsights: {
      eyeContact: "Good",
      confidence: "Moderate",
      engagement: "Highly Engaged"
    },
    recommendation: "Recommended",
    integrityWarning: null  // or "⚠️ Potential integrity concerns..."
  },
  interviewCompletedAt: "2026-01-04T10:30:00.000Z"
}
```

### **S3 Storage (Optional)**
```
AWS S3 Bucket: hireprep-interview-videos
├── interviews/
    ├── {candidateId}/
        ├── {interviewId}/
            ├── question-1-1704361800000.webm
            ├── question-2-1704361900000.webm
            ├── question-3-1704362000000.webm
            ├── question-4-1704362100000.webm
            └── question-5-1704362200000.webm
```

---

## 🔧 Python Microservices Setup

### **1. Video Analysis (Port 8001)**
```python
# video_analysis.py
from flask import Flask, request, jsonify
from deepface import DeepFace
import mediapipe as mp
import cv2

app = Flask(__name__)
face_detection = mp.solutions.face_detection.FaceDetection()
face_mesh = mp.solutions.face_mesh.FaceMesh()

@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    data = request.get_json()
    video_frames = data['videoData']  # base64 images
    
    # Analyze each frame
    results = []
    for frame in video_frames:
        # Decode base64
        img = decode_frame(frame)
        
        # Face detection
        faces = face_detection.process(img)
        
        # Emotion analysis (DeepFace)
        emotions = DeepFace.analyze(img, actions=['emotion'])
        
        # Eye contact tracking (MediaPipe Face Mesh)
        landmarks = face_mesh.process(img)
        
        results.append({
            'faces_count': len(faces),
            'emotions': emotions,
            'eye_contact': calculate_eye_contact(landmarks)
        })
    
    return jsonify(aggregate_results(results))

if __name__ == '__main__':
    app.run(port=8001)
```

### **2. Audio Analysis (Port 8002)**
```python
# audio_analysis.py
from flask import Flask, request, jsonify
import librosa
import numpy as np

app = Flask(__name__)

@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    data = request.get_json()
    audio_chunks = data['audioChunks']  # base64 audio
    
    results = []
    for chunk in audio_chunks:
        # Decode base64
        audio = decode_audio(chunk)
        
        # Extract features
        mfcc = librosa.feature.mfcc(y=audio)
        pitch = librosa.piptrack(y=audio)
        energy = np.sum(audio ** 2) / len(audio)
        
        # Analyze tone
        tone = analyze_tone(audio)
        stress = calculate_stress(pitch, energy)
        
        results.append({
            'confidence': tone['confidence'],
            'clarity': tone['clarity'],
            'enthusiasm': tone['enthusiasm'],
            'stress_level': stress
        })
    
    return jsonify(aggregate_results(results))

if __name__ == '__main__':
    app.run(port=8002)
```

---

## 🚀 Running the System

### **1. Start Backend (Node.js)**
```bash
cd backend
npm start
# Running on http://localhost:5000
```

### **2. Start Python Services**
```bash
# Terminal 1: Video Analysis
cd backend
.\venv\Scripts\Activate.ps1
cd python-services
python video_analysis.py
# Running on http://localhost:8001

# Terminal 2: Audio Analysis
cd backend
.\venv\Scripts\Activate.ps1
cd python-services
$env:PORT="8002"
python audio_analysis.py
# Running on http://localhost:8002
```

### **3. Start Frontend (React)**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

### **4. Health Check**
```bash
# Check Python services
curl http://localhost:5000/api/gemini-voice/behavioral-health

# Response:
{
  "status": "healthy",
  "services": {
    "video": "operational",
    "audio": "operational"
  },
  "timestamp": "2026-01-04T10:30:00.000Z"
}
```

---

## 💰 Cost Analysis (FREE!)

### **Gemini API**
- Free Tier: 1,500 requests/day
- Per Interview: 7 API calls
  - 1 × initialize
  - 5 × generate questions
  - 1 × final analysis
- **Daily Capacity: ~214 interviews**

### **Google Cloud TTS**
- Uses Gemini API key (included in free tier)
- **Cost: $0**

### **Browser APIs**
- Web Speech API: FREE (Chrome/Edge)
- MediaRecorder API: FREE (all browsers)
- **Cost: $0**

### **Python Processing**
- Runs locally on your server
- **Cost: $0**

### **AWS S3 (Optional Video Storage)**
- Free Tier: 5GB storage, 20,000 GET requests
- Per Interview: ~50MB (5 videos)
- **Monthly Capacity: ~100 interviews (free tier)**
- **Paid: $0.023/GB after free tier**

### **Total Cost: $0 for 214 interviews/day!** 🎉

---

## 🔐 Security & Privacy

### **Video/Audio Storage**
- Videos stored in S3 with `ACL: 'private'`
- Signed URLs for temporary access (1 hour)
- Auto-delete after 30 days (implement lifecycle policy)

### **Authentication**
- All API routes protected with JWT middleware
- Only authenticated candidates can start interviews

### **Data Privacy**
- Video/audio analyzed in real-time, not stored permanently (optional)
- Only scores and insights stored in MongoDB
- GDPR compliant: Candidates can request data deletion

---

## 📈 Future Enhancements

### **1. Advanced Cheating Detection**
- Screen capture detection
- Tab switching tracking
- Clipboard monitoring
- Multiple monitors detection

### **2. Facial Expression Analysis**
- Micro-expressions (fear, deception)
- Lip sync verification
- Head pose consistency

### **3. Voice Authentication**
- Voiceprint matching
- Deepfake voice detection

### **4. Live Proctoring**
- Real-time alerts for suspicious behavior
- Human proctor intervention

### **5. Multi-language Support**
- Speech recognition in 50+ languages
- Gemini multilingual analysis

---

## 🎓 Technology Stack

### **Frontend**
- React 18
- Vite
- Web Speech API
- MediaRecorder API
- Axios

### **Backend**
- Node.js 18+
- Express.js
- MongoDB + Mongoose
- AWS SDK (S3)
- Gemini AI (2.0 Flash)
- Google Cloud Text-to-Speech

### **Python Microservices**
- Flask 3.0
- OpenCV 4.8
- MediaPipe 0.10
- DeepFace 0.0.92
- Librosa 0.11
- NumPy, SciPy, Scikit-learn

---

## 📞 API Endpoints

```
POST /api/gemini-voice/initialize
Body: { jobId, candidateName }
Returns: { sessionId }

POST /api/gemini-voice/next-question
Body: { sessionId }
Returns: { question, questionNumber, totalQuestions }

POST /api/gemini-voice/question-audio
Body: { questionText, voiceType }
Returns: audio/mpeg buffer

POST /api/gemini-voice/submit-answer
Body: { 
  sessionId, 
  answerText, 
  videoFrames[], 
  audioChunks[],
  videoBlob,
  candidateId,
  questionNumber
}
Returns: { success, behavioralData }

POST /api/gemini-voice/complete
Body: { sessionId, applicationId }
Returns: { overallScore, contentScore, behavioral Score, ... }

GET /api/gemini-voice/progress/:sessionId
Returns: { currentQuestion, totalQuestions, conversationHistory }

GET /api/gemini-voice/behavioral-health
Returns: { status, services: {video, audio} }
```

---

## 🎉 Summary

HirePrep's AI Interview System is a **comprehensive, multi-modal assessment platform** that:

✅ **Analyzes Answer Content** (60%) using Gemini AI  
✅ **Analyzes Behavioral Metrics** (40%) using Python AI  
✅ **Detects Cheating** through video/audio analysis  
✅ **Completely FREE** for 200+ interviews/day  
✅ **Real-time Processing** with instant feedback  
✅ **Secure & Private** with AWS S3 storage  
✅ **Scalable** with microservices architecture  

**Result**: Comprehensive candidate assessment that evaluates **what they say** AND **how they say it**! 🚀
