# Video Analysis Data Storage - Implementation Guide

## 📊 Overview

This implementation provides **dual storage** for video analysis data:

1. **MongoDB** (Primary) - Real-time frame-by-frame storage during interviews
2. **CSV Export** (Secondary) - Generate reports for HR review after interviews

## 🎯 Key Features

✅ **Timestamp every frame** - Know exactly when each analysis was captured  
✅ **Question correlation** - Link confidence scores to specific interview questions  
✅ **Cheating detection** - Track "looking away" incidents with timestamps  
✅ **Trend analysis** - Visualize confidence changes throughout the interview  
✅ **CSV export** - Download detailed reports for offline analysis  

---

## 🗄️ Database Schema

### VideoAnalysisFrame Model

```javascript
{
  // References
  interviewId: ObjectId,         // Link to Interview
  candidateId: ObjectId,         // Link to User
  questionId: Number,            // Question being answered (optional)
  
  // Timestamps
  timestamp: Date,               // When frame was captured
  interviewElapsedTime: Number,  // Seconds since interview started
  questionElapsedTime: Number,   // Seconds since question started
  
  // Face Detection (MediaPipe)
  faceDetection: {
    detected: Boolean,
    confidence: Number,          // 0.0-1.0
    headPose: {
      pitch: Number,             // Looking up/down (-90 to +90)
      yaw: Number,               // Looking left/right (-90 to +90)
      roll: Number               // Head tilt (-180 to +180)
    },
    gaze: {
      x: Number,                 // Horizontal gaze (-1 to +1)
      y: Number                  // Vertical gaze (-1 to +1)
    },
    lookingAway: Boolean,        // True if looking away from screen
    lookingAwayDirection: String // 'left', 'right', 'up', 'down', 'none'
  },
  
  // Emotion Analysis (DeepFace)
  emotion: {
    dominant: String,            // 'happy', 'sad', 'angry', 'fear', etc.
    scores: {
      happy: Number,
      sad: Number,
      angry: Number,
      fear: Number,
      surprise: Number,
      disgust: Number,
      neutral: Number
    }
  },
  
  // Confidence Scores (0-100)
  scores: {
    eyeContact: Number,
    engagement: Number,
    videoConfidence: Number
  }
}
```

---

## 🚀 Implementation Steps

### Step 1: Install Dependencies

#### Python (Flask Service)
```bash
cd backend/python-services
pip install pymongo>=4.6.0
```

#### Node.js (Backend API)
```bash
cd backend
npm install csv-writer
```

### Step 2: Environment Configuration

Create/update `.env` file:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hireprep
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hireprep

# Enable MongoDB Storage in Flask Service
MONGO_STORAGE_ENABLED=true
```

### Step 3: Register Routes

Update `backend/server.js` or `backend/src/app.js`:

```javascript
const videoAnalysisRoutes = require('./src/routes/videoAnalysis');
app.use('/api/video-analysis', videoAnalysisRoutes);
```

### Step 4: Update Interview Model (Optional Enhancement)

Add to `backend/src/models/Interview.js`:

```javascript
// Add this field to track if frame data exists
hasFrameData: {
  type: Boolean,
  default: false
},
frameDataCount: {
  type: Number,
  default: 0
}
```

---

## 📡 API Usage

### 1. Store Frame Data (During Interview)

**Frontend → Flask Service**

```javascript
// Send frames with interview metadata
const response = await fetch('http://localhost:8001/analyze-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoData: [base64Frame1, base64Frame2, ...],
    interviewId: '507f1f77bcf86cd799439011',  // MongoDB ObjectId
    candidateId: '507f1f77bcf86cd799439012',  // MongoDB ObjectId
    questionId: 1  // Current question number (optional)
  })
});
```

**Response:**
```json
{
  "overallVideoScore": 78.5,
  "eyeContactScore": 85.0,
  "engagementScore": 78.5,
  "confidenceScore": 78.5,
  "analysisMetadata": {
    "framesAnalyzed": 5,
    "dominantEmotion": "neutral"
  }
}
```

Frames are **automatically stored in MongoDB** if `MONGO_STORAGE_ENABLED=true`.

### 2. Get Frame-by-Frame Data

**GET** `/api/video-analysis/interview/:interviewId/frames`

Query Parameters:
- `questionId` - Filter by specific question
- `startTime` - ISO timestamp
- `endTime` - ISO timestamp
- `limit` - Max frames to return (default: 1000)

```javascript
const frames = await fetch(
  '/api/video-analysis/interview/507f1f77bcf86cd799439011/frames?questionId=3&limit=100',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Response:**
```json
{
  "interviewId": "507f1f77bcf86cd799439011",
  "frames": [
    {
      "timestamp": "2026-02-20T10:30:15.123Z",
      "questionId": 3,
      "faceDetection": { ... },
      "emotion": { "dominant": "neutral", "scores": {...} },
      "scores": {
        "videoConfidence": 78.5,
        "eyeContact": 85.0,
        "engagement": 78.5
      }
    },
    // ... more frames
  ],
  "count": 100
}
```

### 3. Get Question-Level Statistics

**GET** `/api/video-analysis/interview/:interviewId/stats`

```javascript
const stats = await fetch(
  '/api/video-analysis/interview/507f1f77bcf86cd799439011/stats',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Response:**
```json
{
  "interviewId": "507f1f77bcf86cd799439011",
  "questionStats": [
    {
      "_id": 1,
      "avgConfidence": 72.3,
      "avgEyeContact": 80.5,
      "avgEngagement": 68.2,
      "totalFrames": 45,
      "framesLookingAway": 3,
      "dominantEmotion": "neutral",
      "startTime": "2026-02-20T10:30:00.000Z",
      "endTime": "2026-02-20T10:31:30.000Z"
    },
    // ... stats for each question
  ],
  "summary": {
    "totalQuestions": 5,
    "avgConfidence": 74.8,
    "avgEyeContact": 82.1
  }
}
```

### 4. Get Confidence Trend (for Charts)

**GET** `/api/video-analysis/interview/:interviewId/trend?interval=5`

```javascript
const trend = await fetch(
  '/api/video-analysis/interview/507f1f77bcf86cd799439011/trend?interval=5',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Response:**
```json
{
  "interviewId": "507f1f77bcf86cd799439011",
  "interval": 5,
  "dataPoints": [
    {
      "_id": "2026-02-20T10:30:00.000Z",
      "avgConfidence": 75.2,
      "avgEyeContact": 82.0,
      "questionId": 1,
      "emotionCounts": ["neutral", "neutral", "happy"]
    },
    {
      "_id": "2026-02-20T10:30:05.000Z",
      "avgConfidence": 68.5,
      "avgEyeContact": 72.3,
      "questionId": 1,
      "emotionCounts": ["fear", "neutral"]
    }
    // ... data points every 5 seconds
  ]
}
```

### 5. Detect Cheating Incidents

**GET** `/api/video-analysis/interview/:interviewId/cheating`

```javascript
const cheating = await fetch(
  '/api/video-analysis/interview/507f1f77bcf86cd799439011/cheating',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Response:**
```json
{
  "interviewId": "507f1f77bcf86cd799439011",
  "severity": "medium",
  "flagged": true,
  "totalIncidents": 45,
  "incidents": [
    {
      "_id": 3,
      "incidents": 15,
      "avgLookAwayConfidence": 32.5,
      "directions": ["down", "down", "right", ...],
      "timestamps": [
        "2026-02-20T10:35:12.123Z",
        "2026-02-20T10:35:12.623Z",
        ...
      ]
    }
    // ... incidents per question
  ]
}
```

### 6. Export CSV Report

**GET** `/api/video-analysis/interview/:interviewId/export/csv`

```javascript
// Trigger download
window.location.href = `/api/video-analysis/interview/${interviewId}/export/csv?token=${authToken}`;
```

**Downloads:** `interview_507f1f77bcf86cd799439011_analysis_1708423456789.csv`

**CSV Columns:**
- Timestamp
- Question ID
- Video Confidence (0-100)
- Eye Contact Score (0-100)
- Engagement Score (0-100)
- Face Detected (Yes/No)
- Looking Away (Yes/No)
- Looking Away Direction
- Head Pitch/Yaw/Roll (degrees)
- Gaze X/Y
- Dominant Emotion
- Emotion Scores (%)

---

## 🎨 Frontend Integration Examples

### Example 1: Real-Time Confidence Monitor

```javascript
// React Component
const [confidenceTrend, setConfidenceTrend] = useState([]);

useEffect(() => {
  const fetchTrend = async () => {
    const response = await fetch(
      `/api/video-analysis/interview/${interviewId}/trend?interval=5`
    );
    const data = await response.json();
    setConfidenceTrend(data.dataPoints);
  };
  
  // Poll every 10 seconds during interview
  const interval = setInterval(fetchTrend, 10000);
  return () => clearInterval(interval);
}, [interviewId]);

// Render with Chart.js or Recharts
<LineChart data={confidenceTrend}>
  <Line dataKey="avgConfidence" stroke="#8884d8" />
  <XAxis dataKey="_id" />
</LineChart>
```

### Example 2: Question Performance Table

```javascript
const [questionStats, setQuestionStats] = useState([]);

useEffect(() => {
  fetch(`/api/video-analysis/interview/${interviewId}/stats`)
    .then(res => res.json())
    .then(data => setQuestionStats(data.questionStats));
}, [interviewId]);

return (
  <table>
    <thead>
      <tr>
        <th>Question</th>
        <th>Confidence</th>
        <th>Eye Contact</th>
        <th>Looking Away</th>
      </tr>
    </thead>
    <tbody>
      {questionStats.map(q => (
        <tr key={q._id}>
          <td>Q{q._id}</td>
          <td>{q.avgConfidence.toFixed(1)}%</td>
          <td>{q.avgEyeContact.toFixed(1)}%</td>
          <td>{q.framesLookingAway} frames</td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

### Example 3: Cheating Alert

```javascript
const { data: cheating } = useQuery(
  ['cheating', interviewId],
  () => fetch(`/api/video-analysis/interview/${interviewId}/cheating`).then(r => r.json())
);

if (cheating?.flagged) {
  return (
    <Alert severity={cheating.severity}>
      ⚠️ {cheating.totalIncidents} potential cheating incidents detected
      <Button onClick={() => viewDetails(cheating.incidents)}>
        View Details
      </Button>
    </Alert>
  );
}
```

---

## 📈 Data Analysis Workflows

### Workflow 1: Post-Interview Evaluation

1. **Interview completes** → All frames stored in MongoDB
2. **HR logs in** → Views candidate interview page
3. **Frontend fetches** → `/api/video-analysis/interview/:id/stats`
4. **Display:**
   - Overall confidence: 75.2%
   - Eye contact: 82.0%
   - Engagement: 70.5%
   - Questions answered confidently: 4/5
   - Cheating incidents: 0
5. **HR downloads** CSV for detailed review

### Workflow 2: Real-Time Monitoring (Optional)

1. **Candidate starts interview**
2. **Frontend sends frames** every 1-2 seconds with `interviewId` and `questionId`
3. **Flask service** analyzes and stores in MongoDB
4. **Admin dashboard** polls `/trend` API every 10 seconds
5. **Display live confidence graph** to monitor candidate behavior

### Workflow 3: Question Difficulty Analysis

```javascript
// Aggregate data across multiple interviews
const difficulty = await Interview.aggregate([
  { $match: { jobId: mongoose.Types.ObjectId(jobId) } },
  { $lookup: {
      from: 'videoanalysisframes',
      localField: '_id',
      foreignField: 'interviewId',
      as: 'frames'
    }
  },
  { $unwind: '$frames' },
  { $group: {
      _id: '$frames.questionId',
      avgConfidence: { $avg: '$frames.scores.videoConfidence' },
      candidateCount: { $addToSet: '$studentId' }
    }
  },
  { $project: {
      questionId: '$_id',
      avgConfidence: 1,
      candidateCount: { $size: '$candidateCount' },
      difficulty: {
        $switch: {
          branches: [
            { case: { $gte: ['$avgConfidence', 80] }, then: 'easy' },
            { case: { $gte: ['$avgConfidence', 60] }, then: 'medium' },
            { case: { $lt: ['$avgConfidence', 60] }, then: 'hard' }
          ]
        }
      }
    }
  }
]);

// Result: Which questions make candidates nervous?
// [
//   { questionId: 1, avgConfidence: 85.2, difficulty: 'easy', candidateCount: 42 },
//   { questionId: 3, avgConfidence: 52.1, difficulty: 'hard', candidateCount: 42 },
//   ...
// ]
```

---

## 🔒 Privacy & GDPR Compliance

### Auto-Delete Old Data

Uncomment in `VideoAnalysisFrame.js`:

```javascript
// Auto-delete frames older than 90 days
videoAnalysisFrameSchema.index(
  { createdAt: 1 }, 
  { expireAfterSeconds: 7776000 } // 90 days
);
```

### Manual Deletion

**DELETE** `/api/video-analysis/interview/:interviewId/frames`

```javascript
// Delete all frame data for an interview
await fetch(`/api/video-analysis/interview/${interviewId}/frames`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 🧪 Testing

### Test MongoDB Storage

```bash
# Start MongoDB locally
mongod --dbpath ./data

# Enable storage in Flask service
export MONGO_STORAGE_ENABLED=true
export MONGODB_URI=mongodb://localhost:27017/hireprep

# Start Flask service
cd backend/python-services
python3 video_analysis.py

# Send test frames
python3 test_flask_api.py
```

### Verify Data in MongoDB

```bash
# Open MongoDB shell
mongosh hireprep

# Check frame count
db.videoanalysisframes.countDocuments()

# View sample frame
db.videoanalysisframes.findOne()

# Get frames for specific interview
db.videoanalysisframes.find({ 
  interviewId: ObjectId("507f1f77bcf86cd799439011") 
}).limit(5)
```

---

## 📊 Performance Considerations

### Storage Size

**Per Frame:** ~500-800 bytes (BSON)  
**Per Interview:** 10 minutes × 1 frame/sec = 600 frames = ~300-500 KB  
**1000 Interviews:** ~300-500 MB  

**Recommendation:** Keep frames for 90 days, then delete or archive.

### Query Optimization

All critical queries are indexed:
- `interviewId + timestamp` (timeline queries)
- `interviewId + questionId` (per-question stats)
- `candidateId` (candidate history)

### Batch vs Single Insert

**Batch insert is 10-20x faster:**

```python
# ❌ Slow: Insert frames one by one
for frame in frames:
    storage.store_frame(frame, interview_id, candidate_id)

# ✅ Fast: Batch insert all frames
storage.store_frames_batch(frames, interview_id, candidate_id)
```

---

## 🎯 Recommendation Summary

| Feature | MongoDB | CSV Export |
|---------|---------|------------|
| **Real-time storage** | ✅ Best | ❌ No |
| **Query by question** | ✅ Fast | ⚠️ Manual |
| **Trend analysis** | ✅ Easy aggregations | ⚠️ Manual |
| **Concurrent interviews** | ✅ No conflicts | ❌ File locking |
| **Scalability** | ✅ Production-ready | ❌ Limited |
| **HR review** | ⚠️ Need UI | ✅ Excel-friendly |
| **Backup/archive** | ✅ Built-in | ✅ Simple files |
| **Setup complexity** | ⚠️ Requires MongoDB | ✅ Zero config |

**Final Recommendation:** **Use both!**
- MongoDB for primary storage and real-time queries
- CSV export for HR reports and offline analysis

---

## 🚀 Next Steps

1. ✅ Install dependencies (`pymongo`, `csv-writer`)
2. ✅ Configure MongoDB connection in `.env`
3. ✅ Register `/api/video-analysis` routes
4. ✅ Update frontend to send `interviewId` and `candidateId` with frames
5. ✅ Build dashboard to display confidence trends
6. ✅ Add CSV download button for HR reviewers
7. ✅ Test with real interview scenarios

**Questions?** Check the models and routes for implementation details!
