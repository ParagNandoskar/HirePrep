# HirePrep Backend - Complete Implementation

A comprehensive, production-ready backend API for the HirePrep platform - an AI-powered interview and job matching system with integrated Python NLP microservices.

## 🎉 Project Status: COMPLETE ✅

The HirePrep backend has been fully implemented with all features from the original requirements. This is a production-ready, scalable backend system with comprehensive AI-powered features.

## 🚀 Key Features

### Core Platform Features
- **Authentication & Authorization** - JWT-based auth with refresh tokens for students and companies
- **Resume Upload & AI Parsing** - Upload PDFs/DOCX, extract structured data using Google Gemini + Python NLP
- **Job Posting & Matching** - Hybrid semantic + rule-based job-candidate matching
- **Real-time Mock Interviews** - WebRTC + Socket.IO for live interview sessions
- **Multi-modal AI Analysis** - Video/audio analysis via Python microservices with DeepFace integration
- **Comprehensive Leaderboard** - Advanced candidate ranking and scoring system
- **RESTful API** - Clean, documented API endpoints with consistent response format

### Advanced AI Integration
- **Python NLP Microservice** - Multi-domain skill extraction (200+ skills across 20+ categories)
- **Real DeepFace Emotion Analysis** - Actual computer vision for emotion detection (replaced simulated data)
- **Hybrid Job Matching** - Combines rule-based scoring (Python) + semantic similarity (Gemini)
- **Interview AI** - Dynamic question generation and real-time analysis
- **Reliable Question Identification** - Enhanced interview controller with robust questionId lookup

## 🏗 Complete Architecture

```
backend/
├── 📄 package.json                  # Dependencies & scripts
├── 📄 server.js                     # Main server entry point
├── 📄 Dockerfile                    # Docker configuration
├── 📄 docker-compose.yml            # Multi-service orchestration
├── 📄 .env.example                  # Environment template
├── 📄 .gitignore                    # Git ignore rules
│
├── 📂 src/                          # Source code
│   ├── 📄 app.js                    # Express app configuration
│   │
│   ├── 📂 config/                   # Configuration files
│   │   ├── database.js              # MongoDB connection
│   │   ├── cloudinary.js            # File storage config
│   │   └── gemini.js                # Google Gemini AI config
│   │
│   ├── 📂 models/                   # Database schemas
│   │   ├── User.js                  # User model (students & companies)
│   │   ├── Resume.js                # Resume storage & parsing
│   │   ├── Job.js                   # Job postings
│   │   ├── Interview.js             # Interview sessions (enhanced with questionId)
│   │   └── Leaderboard.js           # Candidate rankings
│   │
│   ├── 📂 controllers/              # Business logic
│   │   ├── authController.js        # Authentication & users
│   │   ├── resumeController.js      # Resume management (Python NLP integrated)
│   │   ├── jobController.js         # Job postings & applications
│   │   ├── interviewController.js   # Interview management (enhanced reliability)
│   │   └── leaderboardController.js # Rankings & analytics
│   │
│   ├── 📂 services/                 # Core business services
│   │   ├── resumeParser.js          # Python NLP + Gemini embeddings integration
│   │   ├── jobMatcher.js            # Hybrid rule-based + semantic matching
│   │   ├── leaderboard.js           # Ranking algorithms (updated for Python NLP)
│   │   └── interviewService.js      # Interview AI & analysis
│   │
│   ├── 📂 routes/                   # API endpoints
│   │   ├── auth.js                  # Authentication routes
│   │   ├── resume.js                # Resume routes
│   │   ├── job.js                   # Job routes
│   │   ├── interview.js             # Interview routes
│   │   ├── leaderboard.js           # Leaderboard routes
│   │   └── status.js                # System status
│   │
│   ├── 📂 middlewares/              # Express middlewares
│   │   ├── authMiddleware.js        # JWT authentication
│   │   ├── errorHandler.js          # Error handling
│   │   └── validation.js            # Request validation
│   │
│   └── 📂 utils/                    # Helper utilities
│       ├── jwt.js                   # JWT token management
│       ├── scoring.js               # Core aggregation functions (cleaned up)
│       └── helpers.js               # Common utilities
│
└── 📂 python-services/              # AI Microservices (Finalized)
    ├── app.py                       # NLP service (resume parsing + job matching)
    ├── video_analysis.py            # DeepFace emotion analysis (real AI)
    ├── audio_analysis.py            # Audio features (no STT - frontend handles)
    ├── requirements.txt             # Python dependencies (finalized)
    ├── Dockerfile.video             # Enhanced video service Docker
    └── Dockerfile.audio             # Audio service Docker
```

## 🛠 Enhanced Tech Stack

| Component | Technology | Integration Status |
|-----------|------------|-------------------|
| **Backend** | Node.js + Express.js | ✅ Complete |
| **Database** | MongoDB + Mongoose | ✅ Complete |
| **Authentication** | JWT with refresh tokens | ✅ Complete |
| **File Storage** | Cloudinary | ✅ Complete |
| **AI Services** | Google Gemini API | ✅ Complete |
| **Real-time** | Socket.IO + WebRTC | ✅ Complete |
| **NLP Service** | Python + spaCy + scikit-learn | ✅ Complete |
| **Video Analysis** | Python + DeepFace + MediaPipe | ✅ Complete |
| **Audio Analysis** | Python + Librosa | ✅ Complete |
| **Containerization** | Docker + Docker Compose | ✅ Complete |

## 🎯 Architecture Enhancements

### 1. Python NLP Microservice Integration ✅

**Resume Processing Flow:**
```
File Upload → Temp File → Python NLP Service → Parsed Data + Gemini Embeddings → MongoDB
```

**Job Matching Flow:**
```
Resume + Job → Python Rule-based Scoring + Gemini Semantic Similarity → Hybrid Score
```

**Key Benefits:**
- **Accuracy**: Multi-domain skill database (200+ skills, 20+ categories)
- **Performance**: Specialized Python NLP processing
- **Scalability**: Microservice architecture enables independent scaling
- **Maintainability**: Clear separation of concerns

### 2. Real DeepFace Emotion Analysis ✅

**Before vs After:**
- **Before**: Random emotion scores with `np.random.normal()`
- **After**: Actual DeepFace emotion analysis from facial expressions

**Implementation:**
```python
# Model loaded once at startup for performance
self.emotion_model = DeepFace.build_model("Emotion")

# Real emotion analysis per frame
analysis = DeepFace.analyze(
    img_path=frame, 
    actions=['emotion'], 
    enforce_detection=False,
    models={'emotion': self.emotion_model}, 
    detector_backend='mediapipe'
)
```

### 3. Enhanced Interview Controller ✅

**Improvement: Reliable Question Identification**

**Before (Fragile):**
```javascript
// Prone to false matches with substring search
const questionIndex = interview.conversation.findIndex(
  msg => msg.type === 'question' && msg.content.includes(questionId)
);
```

**After (Robust):**
```javascript
// Reliable exact ID matching
const questionMessage = interview.conversation.find(
  msg => msg.type === 'question' && msg.questionId === questionId
);
```

### 4. Cleaned Architecture - Scoring.js ✅

**Removed Deprecated Functions:**
- `calculateResumeJobMatch` → Now in Python NLP service
- `calculateExperienceMatch` → Now in Python NLP service
- `calculateEducationMatch` → Now in Python NLP service

**Retained Core Functions:**
- `calculateInterviewScore` - Video/Audio/QA aggregation
- `calculateFinalScore` - Resume + Interview combination
- `calculatePercentile` - Statistical ranking
- `normalizeScore` - Score standardization
- `calculateConfidenceInterval` - Advanced analytics

## 📋 Complete API Documentation

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user (student/company) |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh-token` | Refresh access token |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Resume Endpoints (Python NLP Integrated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/upload` | Upload & parse resume (Python NLP + Gemini) |
| GET | `/api/resume/my-resume` | Get user's resume |
| GET | `/api/resume/:userId` | Get specific user's resume |
| PUT | `/api/resume/update-data` | Update parsed resume data |
| DELETE | `/api/resume/delete` | Delete resume |

### Job Endpoints (Hybrid Matching)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Get all jobs (with filters) |
| POST | `/api/jobs` | Create job posting (company) |
| GET | `/api/jobs/:jobId` | Get job details |
| GET | `/api/jobs/match/:studentId` | Get job recommendations (hybrid scoring) |
| POST | `/api/jobs/:jobId/apply` | Apply to job (student) |

### Interview Endpoints (Enhanced Reliability)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Start interview session (with questionId) |
| GET | `/api/interview/:interviewId` | Get interview details |
| POST | `/api/interview/:interviewId/submit-answer` | Submit answer (reliable lookup) |
| POST | `/api/interview/:interviewId/analyze-video` | Process video (DeepFace) |
| POST | `/api/interview/:interviewId/analyze-audio` | Process audio analysis |
| POST | `/api/interview/:interviewId/finish` | Complete interview |

### Leaderboard Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard/:jobId` | Get job leaderboard |
| POST | `/api/leaderboard/:jobId/generate` | Generate/update leaderboard |
| PUT | `/api/leaderboard/:jobId/candidate/:studentId/status` | Update candidate status |

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ (for microservices)
- MongoDB Atlas account
- Google Gemini API key
- Cloudinary account

### 1. Clone and Install
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your actual configuration values
```

**Required Environment Variables:**
```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Install Python Dependencies
```bash
cd python-services
pip install -r requirements.txt
cd ..
```

### 4. Run All Services

#### Option A: Docker (Recommended)
```bash
docker-compose up --build
```

#### Option B: Individual Services
```bash
# Terminal 1: Main API server
npm run dev

# Terminal 2: Python NLP service (resume parsing + job matching)
cd python-services && python app.py

# Terminal 3: Video analysis service (DeepFace)
cd python-services && python video_analysis.py

# Terminal 4: Audio analysis service
cd python-services && python audio_analysis.py
```

## 🔄 Service Communication

### Python NLP Service Integration

**Resume Parsing:**
```javascript
// Node.js calls Python NLP service
const response = await axios.post('http://localhost:5001/parse-resume', formData);
// Combines with Gemini embeddings
const embeddings = await this.generateResumeEmbeddings(parsedData);
```

**Job Matching:**
```javascript
// Python rule-based scoring + Gemini semantic similarity
const pythonScores = await matchJobWithPythonNLP(resume, job);
const semanticScore = this.cosineSimilarity(resume.embedding, job.embedding);
const hybridScore = combineScores(pythonScores, semanticScore);
```

### Service Boundaries

| Service | Responsibility | Technology |
|---------|---------------|------------|
| **Frontend** | Speech-to-Text | Browser Web Speech API |
| **Node.js Backend** | API, Authentication, Aggregation | Express.js + Gemini |
| **Python NLP Service** | Resume Parsing, Job Matching | spaCy + scikit-learn |
| **Video Service** | Emotion Analysis | DeepFace + MediaPipe |
| **Audio Service** | Audio Features | Librosa + NumPy |

## 🔒 Production Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (students/companies)
- ✅ Input validation and sanitization (Joi)
- ✅ Rate limiting configured
- ✅ CORS configuration
- ✅ Security headers (Helmet.js)
- ✅ Password hashing (bcrypt)
- ✅ File upload security (Cloudinary)

## 📊 Performance Optimizations

- ✅ **Database**: Indexed queries, aggregation pipelines
- ✅ **Caching**: Resume embeddings, job matches
- ✅ **File Processing**: Async upload processing
- ✅ **AI Models**: DeepFace model loaded once at startup
- ✅ **Real-time**: Efficient Socket.IO event handling
- ✅ **Microservices**: Independent scaling capabilities

## 🧪 Testing & Validation

### Health Check Endpoints
- Main API: `GET /health`
- Python NLP: `GET http://localhost:5001/health`
- Video Analysis: `GET http://localhost:8001/health`
- Audio Analysis: `GET http://localhost:8002/health`

### Testing Commands
```bash
# Run Node.js tests
npm test

# Test Python NLP service
curl -X POST http://localhost:5001/parse-resume -F "file=@test_resume.pdf"

# Test DeepFace integration
curl http://localhost:8001/health

# Test audio analysis
curl http://localhost:8002/health
```

## 🔧 Configuration Details

### Docker Services
```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
  
  nlp-service:
    build: python-services/
    ports: ["5001:5001"]
  
  video-analysis:
    build: 
      context: python-services/
      dockerfile: Dockerfile.video
    ports: ["8001:8001"]
  
  audio-analysis:
    build:
      context: python-services/
      dockerfile: Dockerfile.audio
    ports: ["8002:8002"]
```

### Python Dependencies (Finalized)
```txt
flask==2.3.2
flask-cors==4.0.0
numpy==1.24.3
opencv-python==4.8.0.74
mediapipe==0.10.21 
librosa==0.10.1
scikit-learn==1.3.2
scipy==1.11.1
deepface==0.0.79
spacy>=3.7.0
PyPDF2==3.0.1
python-docx==1.1.0
# speechrecognition removed - frontend handles STT
```

## 🚀 Production Deployment

### Resource Requirements
- **CPU**: 4+ cores (2+ for DeepFace processing)
- **Memory**: 2GB+ (1GB+ for DeepFace models)
- **Storage**: 1GB+ (500MB+ for AI models)
- **Network**: High bandwidth for video/audio processing

### Deployment Commands
```bash
# Build and deploy all services
docker-compose up --build -d

# Scale specific services
docker-compose up --scale video-analysis=2 --scale nlp-service=2

# Monitor services
docker-compose logs -f
```

## 📈 Performance Expectations

### API Response Times
- **Authentication**: <100ms
- **Resume Upload**: 2-5 seconds (Python NLP processing)
- **Job Matching**: <1 second (hybrid scoring)
- **Interview Questions**: <2 seconds (Gemini generation)

### AI Processing Times
- **DeepFace Initialization**: 2-5 seconds (one-time)
- **Video Frame Analysis**: 100-300ms
- **Audio Analysis**: 200-500ms per chunk
- **Resume Parsing**: 3-8 seconds per document

## 🐛 Troubleshooting Guide

### Common Issues

1. **Python NLP Service Connection Error**
   ```bash
   # Check service status
   curl http://localhost:5001/health
   
   # Verify Python dependencies
   cd python-services && pip install -r requirements.txt
   ```

2. **DeepFace Model Loading Error**
   ```bash
   # Check video service logs
   docker-compose logs video-analysis
   
   # Verify system dependencies
   apt-get install libgomp1 ffmpeg
   ```

3. **MongoDB Connection Issues**
   ```bash
   # Check connection string format
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   
   # Verify network access
   ping cluster.mongodb.net
   ```

4. **Gemini API Errors**
   ```bash
   # Verify API key
   curl -H "Authorization: Bearer $GEMINI_API_KEY" https://api.gemini.com/health
   
   # Check rate limits
   ```

## 📞 Support & Documentation

### API Response Format
All APIs follow consistent format:
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "statusCode": 200
}
```

### Error Handling
- Comprehensive error logging
- Structured error responses
- Graceful service degradation
- Timeout handling for all services

## 🚧 Future Enhancements

While the current implementation is complete and production-ready, potential future enhancements include:

1. **Advanced Analytics** - More detailed candidate insights
2. **ML Model Training** - Custom models for domain-specific analysis  
3. **Real-time Collaboration** - Multi-interviewer support
4. **Mobile API** - Mobile-specific endpoints
5. **Advanced Security** - OAuth2, SSO integration

## 🎉 Implementation Summary

### ✅ **Complete Feature Set**
- Authentication & user management
- Resume upload & AI parsing (Python NLP + Gemini)
- Job posting & hybrid matching
- Real-time interviews with multi-modal analysis
- Comprehensive leaderboard system
- Production-ready deployment

### ✅ **Architecture Excellence**
- Microservices with clear separation of concerns
- Real AI integration (DeepFace, Python NLP, Gemini)
- Robust error handling and graceful degradation
- Scalable, maintainable codebase

### ✅ **Production Ready**
- Docker containerization
- Security best practices
- Performance optimizations
- Comprehensive documentation
- Health monitoring

---

**Built with ❤️ for the HirePrep platform**

*This backend provides a complete, production-ready foundation for an AI-powered interview and job matching platform with real computer vision, NLP processing, and semantic analysis capabilities.*

- Node.js 18+ and npm
- Python 3.9+ (for microservices)
- MongoDB Atlas account
- Google Gemini API key
- Cloudinary account

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your actual configuration values
```

### 3. Install Python Dependencies

```bash
cd python-services
pip install -r requirements.txt
cd ..
```

### 4. Run Development Servers

#### Option A: Run All Services with Docker
```bash
docker-compose up --build
```

#### Option B: Run Services Individually
```bash
# Terminal 1: Main API server
npm run dev

# Terminal 2: Video analysis service
cd python-services && python video_analysis.py

# Terminal 3: Audio analysis service  
cd python-services && python audio_analysis.py
```

## 📝 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user (student/company) |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh-token` | Refresh access token |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Resume Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/upload` | Upload & parse resume |
| GET | `/api/resume/my-resume` | Get user's resume |
| GET | `/api/resume/:userId` | Get specific user's resume |
| PUT | `/api/resume/update-data` | Update parsed resume data |
| DELETE | `/api/resume/delete` | Delete resume |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Get all jobs (with filters) |
| POST | `/api/jobs` | Create job posting (company) |
| GET | `/api/jobs/:jobId` | Get job details |
| GET | `/api/jobs/match/:studentId` | Get job recommendations |
| POST | `/api/jobs/:jobId/apply` | Apply to job (student) |

### Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Start interview session |
| GET | `/api/interview/:interviewId` | Get interview details |
| POST | `/api/interview/:interviewId/submit-answer` | Submit interview answer |
| POST | `/api/interview/:interviewId/analyze-video` | Process video analysis |
| POST | `/api/interview/:interviewId/analyze-audio` | Process audio analysis |
| POST | `/api/interview/:interviewId/finish` | Complete interview |

### Leaderboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard/:jobId` | Get job leaderboard |
| POST | `/api/leaderboard/:jobId/generate` | Generate/update leaderboard |
| PUT | `/api/leaderboard/:jobId/candidate/:studentId/status` | Update candidate status |

## 🔧 Configuration

### Required Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🔄 API Response Format

All API responses follow this consistent format:

```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "statusCode": 200
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "auth"
```

## 📊 Monitoring & Logging

- Health check endpoint: `GET /health`
- Logs are written to console in development
- Error tracking with structured error responses
- Performance monitoring through middleware

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build -d

# Scale specific services
docker-compose up --scale video-analysis=2 --scale audio-analysis=2
```

### Production Considerations

1. **Security**:
   - Use strong JWT secrets
   - Enable CORS properly
   - Rate limiting configured
   - Helmet.js security headers

2. **Performance**:
   - MongoDB indexes configured
   - Cloudinary CDN for file delivery
   - Gzip compression enabled
   - Connection pooling

3. **Monitoring**:
   - Health checks for all services
   - Error logging and alerting
   - Performance metrics collection

## 🤖 AI Services

### Video Analysis
- Emotion detection
- Eye contact scoring
- Engagement measurement
- Confidence assessment

### Audio Analysis
- Tone analysis (confidence, enthusiasm, clarity)
- Stress level detection
- Speech rate and pause patterns
- Sentiment analysis

### Resume Parsing
- Structured data extraction
- Skills categorization
- Experience analysis
- Quality scoring

### Job Matching
- Semantic similarity using embeddings
- Skills gap analysis
- Experience level matching
- Improvement recommendations

## 📈 Performance Optimization

- **Database**: Indexed queries, aggregation pipelines
- **Caching**: Resume embeddings, job matches
- **File Processing**: Async upload processing
- **Real-time**: Efficient Socket.IO event handling

## 🔒 Security Features

- JWT authentication with refresh tokens
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Security headers via Helmet.js

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGODB_URI format
   - Verify network access to MongoDB Atlas
   - Ensure correct credentials

2. **Gemini API Errors**
   - Verify API key is valid
   - Check API quota limits
   - Ensure proper request format

3. **Python Services Not Responding**
   - Check if services are running on correct ports
   - Verify Python dependencies installed
   - Check service logs for errors

4. **File Upload Issues**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper file format

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation
- Check service logs for errors
- Verify environment configuration

## 🚧 Development

### Adding New Features

1. **New API Endpoints**:
   - Add route in `/routes`
   - Implement controller in `/controllers`
   - Add validation in `/middlewares/validation.js`

2. **Database Models**:
   - Add schema in `/models`
   - Add indexes for performance
   - Update related services

3. **AI Services**:
   - Extend existing Python services
   - Add new analysis capabilities
   - Update aggregation logic

### Code Style

- ESLint configuration included
- Prettier for code formatting
- Consistent error handling
- Comprehensive logging

---

Built with ❤️ for the HirePrep platform
