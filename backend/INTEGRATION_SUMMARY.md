# Node.js Backend Integration with Python NLP Microservice

## Overview
Successfully integrated the Node.js backend with the Python NLP microservice for enhanced resume parsing and job matching capabilities.

## Architecture Changes

### 1. Resume Parser Service (`src/services/resumeParser.js`)
- **Added**: Axios integration for Python NLP service communication
- **Added**: `parseResumeWithPythonNLP()` function to delegate parsing to microservice
- **Updated**: Main `parseResume()` method to use Python service for parsing + Gemini for embeddings
- **Retained**: Text extraction methods for fallback compatibility
- **Removed**: Old `parseResumeWithAI()` method (replaced by Python service)

### 2. Resume Controller (`src/controllers/resumeController.js`)
- **Updated**: `uploadResume()` function to use new integrated parsing approach
- **Added**: Temporary file handling for Python service file upload
- **Updated**: Error handling with proper try-catch structure
- **Updated**: Embedding extraction from parsedData returned by Python service

### 3. Job Matcher Service (`src/services/jobMatcher.js`)
- **Added**: `matchJobWithPythonNLP()` function for rule-based job matching
- **Updated**: `calculateJobMatchScore()` to use hybrid approach:
  - Python NLP service for rule-based scoring (skills, experience, education)
  - Gemini embeddings for semantic similarity
- **Updated**: Scoring weights to balance rule-based vs semantic matching
- **Enhanced**: Detailed breakdown of match scores from both systems

### 4. Package Dependencies (`package.json`)
- **Added**: `axios: ^1.6.0` for HTTP requests to Python service
- **Added**: `form-data: ^4.0.0` for file uploads to Python service

## Integration Flow

### Resume Processing Flow:
1. **File Upload**: User uploads resume file to Node.js backend
2. **File Storage**: Temporary file created for Python service processing
3. **Python Processing**: File sent to Python NLP service (localhost:5001) for parsing
4. **Gemini Embeddings**: Resume data processed through Gemini for semantic embeddings
5. **Data Combination**: Python parsing results merged with Gemini embeddings
6. **Storage**: Complete parsed data stored in MongoDB
7. **Cleanup**: Temporary files removed

### Job Matching Flow:
1. **Rule-based Scoring**: Python NLP service calculates detailed skill/experience/education matches
2. **Semantic Scoring**: Gemini embeddings calculate semantic similarity
3. **Hybrid Scoring**: Combined weighted score from both approaches
4. **Detailed Results**: Comprehensive match breakdown with specific skill/experience details

## Service Communication

### Python NLP Service Endpoints:
- `POST /parse-resume`: Resume parsing with file upload
- `POST /match-job`: Job matching with resume and job data

### Request/Response Format:
```javascript
// Parse Resume Request
FormData: { file: <resume_file> }

// Parse Resume Response
{
  "success": true,
  "data": {
    "personalInfo": {...},
    "skills": [...],
    "experience": [...],
    "education": [...],
    "embeddings": [...]  // Added by Gemini
  }
}

// Job Match Request
{
  "resume": <parsed_resume_data>,
  "job": <job_requirements>
}

// Job Match Response
{
  "success": true,
  "data": {
    "overall_score": 0.85,
    "skill_match": { "score": 0.9, "details": [...] },
    "experience_match": { "score": 0.8, "details": [...] },
    "education_match": { "score": 0.7, "details": [...] }
  }
}
```

## Error Handling
- **Fallback**: If Python service is unavailable, basic error responses provided
- **Timeout**: 30-second timeout for parsing, 15-second for job matching
- **Cleanup**: Temporary files always cleaned up in finally blocks
- **Logging**: Comprehensive error logging for debugging

## Benefits of Integration
1. **Accuracy**: Multi-domain skill database with 200+ skills across 20+ categories
2. **Performance**: Specialized Python NLP processing for complex text analysis
3. **Flexibility**: Hybrid scoring combining rule-based and semantic approaches
4. **Scalability**: Microservice architecture enables independent scaling
5. **Maintainability**: Clear separation of concerns between services

## Configuration
- Python NLP Service URL: `http://localhost:5001`
- Timeout Settings: 30s parsing, 15s matching
- Scoring Weights: 35% skills, 25% experience, 15% education, 25% semantic

## Testing Requirements
1. Start Python NLP service on port 5001
2. Ensure MongoDB connection
3. Test resume upload with various file formats
4. Verify job matching with different skill sets
5. Test error scenarios (Python service down, timeouts)

## Migration Status
✅ Resume Parser Service - Complete
✅ Resume Controller - Complete  
✅ Job Matcher Service - Complete
✅ Package Dependencies - Complete
✅ Error Handling - Complete
✅ Documentation - Complete

The Node.js backend is now fully integrated with the Python NLP microservice, providing enhanced AI-powered resume parsing and job matching capabilities.