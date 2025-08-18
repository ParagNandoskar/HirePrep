# HirePrep Backend

A comprehensive backend API for the HirePrep platform - an AI-powered interview and job matching system.

## 🚀 Features

- **Authentication & Authorization** - JWT-based auth for students and companies
- **Resume Upload & AI Parsing** - Upload PDFs/DOCX, extract structured data using Google Gemini
- **Job Posting & Matching** - Semantic job-candidate matching using embeddings
- **Real-time Mock Interviews** - WebRTC + Socket.IO for live interview sessions
- **AI Analysis** - Video/audio analysis via Python microservices
- **Leaderboard System** - Comprehensive candidate ranking and scoring
- **RESTful API** - Clean, documented API endpoints

## 🏗 Architecture

```
backend/
├── src/
│   ├── config/          # Database, AI, cloud configs
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route handlers
│   ├── controllers/     # Business logic
│   ├── services/        # AI & business services
│   ├── middlewares/     # Auth, validation, error handling
│   ├── utils/           # Helper functions
│   └── app.js           # Express app setup
├── python-services/     # AI microservices
│   ├── video_analysis.py   # Computer vision analysis
│   ├── audio_analysis.py   # Speech/audio analysis
│   └── requirements.txt
├── docker-compose.yml   # Multi-service deployment
└── server.js           # Main server entry point
```

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **AI Services**: Google Gemini API
- **Real-time**: Socket.IO + WebRTC
- **Microservices**: Python (Flask)
- **Computer Vision**: OpenCV, MediaPipe
- **Audio Processing**: Librosa
- **Containerization**: Docker

## 📋 Prerequisites

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
