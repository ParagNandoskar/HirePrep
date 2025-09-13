# HirePrep API Manual Route Testing (Postman)

This document lists all major backend API routes for manual testing in Postman. For each route, you get:
- Method & Endpoint
- Example request body (if needed)
- Example response
- Required headers (if any)

---

## Health & Status

### GET /health
- **Description:** Check backend health
- **Headers:** None
- **Response:**
```json
{
  "status": "healthy",
  "service": "hireprep-backend",
  "timestamp": "2025-09-11T12:00:00Z"
}
```

### GET /api/status/status
- **Description:** System status
- **Headers:** Authorization: Bearer <token>
- **Response:**
```json
{
  "status": "ok",
  "details": {...}
}
```

---

## Auth

### POST /api/auth/register
- **Description:** Register new user
- **Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "yourpassword",
  "role": "student"
}
```
- **Response:**
```json
{
  "user": {...},
  "token": "..."
}
```

### POST /api/auth/login
- **Description:** Login
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```
- **Response:**
```json
{
  "user": {...},
  "token": "..."
}
```

### POST /api/auth/refresh-token
- **Description:** Refresh JWT
- **Body:**
```json
{
  "refreshToken": "..."
}
```
- **Response:**
```json
{
  "token": "..."
}
```

### GET /api/auth/profile
- **Description:** Get user profile
- **Headers:** Authorization: Bearer <token>

### PUT /api/auth/profile
- **Description:** Update profile
- **Headers:** Authorization: Bearer <token>
- **Body:**
```json
{
  "name": "Jane Doe",
  "bio": "Updated bio"
}
```

### POST /api/auth/change-password
- **Description:** Change password
- **Headers:** Authorization: Bearer <token>
- **Body:**
```json
{
  "currentPassword": "yourpassword",
  "newPassword": "newpassword"
}
```

### POST /api/auth/logout
- **Description:** Logout
- **Headers:** Authorization: Bearer <token>

---

## Jobs

### GET /api/job/
- **Description:** List jobs
- **Headers:** Optional Authorization

### GET /api/job/:jobId
- **Description:** Get job details
- **Headers:** Optional Authorization

### POST /api/job/
- **Description:** Create job (company only)
- **Headers:** Authorization: Bearer <company token>
- **Body:**
```json
{
  "title": "Software Engineer",
  "description": "...",
  "requirements": ["..."],
  "location": "Remote"
}
```

### PUT /api/job/:jobId
- **Description:** Update job (company only)
- **Headers:** Authorization: Bearer <company token>

### DELETE /api/job/:jobId
- **Description:** Delete job (company only)
- **Headers:** Authorization: Bearer <company token>

### GET /api/job/company/my-jobs
- **Description:** List company jobs
- **Headers:** Authorization: Bearer <company token>

### PUT /api/job/:jobId/applications/:studentId/status
- **Description:** Update application status
- **Headers:** Authorization: Bearer <company token>
- **Body:**
```json
{
  "status": "accepted"
}
```

### GET /api/job/match/:studentId
- **Description:** Get recommended jobs
- **Headers:** Authorization: Bearer <student token>

### POST /api/job/:jobId/apply
- **Description:** Apply to job
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "coverLetter": "I am interested in this job."
}
```

---

## Resume

### POST /api/resume/upload
- **Description:** Upload resume (student only)
- **Headers:** Authorization: Bearer <student token>
- **Body:** Form-data (file: resume.pdf)

### GET /api/resume/my-resume
- **Description:** Get my resume
- **Headers:** Authorization: Bearer <student token>

### GET /api/resume/:userId
- **Description:** Get resume by userId
- **Headers:** Authorization: Bearer <token>

### PUT /api/resume/update-data
- **Description:** Update resume data
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "education": [...],
  "experience": [...]
}
```

### DELETE /api/resume/delete
- **Description:** Delete resume
- **Headers:** Authorization: Bearer <student token>

### GET /api/resume/analyze/job/:jobId
- **Description:** Analyze resume for job
- **Headers:** Authorization: Bearer <student token>

### GET /api/resume/analytics/my-resume
- **Description:** Resume analytics
- **Headers:** Authorization: Bearer <student token>

---

## Interview

### POST /api/interview/start
- **Description:** Start interview
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "jobId": "...",
  "studentId": "..."
}
```

### GET /api/interview/:interviewId
- **Description:** Get interview details
- **Headers:** Authorization: Bearer <token>

### POST /api/interview/:interviewId/cancel
- **Description:** Cancel interview
- **Headers:** Authorization: Bearer <student token>

### POST /api/interview/:interviewId/finish
- **Description:** Finish interview
- **Headers:** Authorization: Bearer <student token>

### POST /api/interview/:interviewId/submit-answer
- **Description:** Submit answer
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "questionId": "...",
  "answer": "..."
}
```

### POST /api/interview/:interviewId/analyze-video
- **Description:** Analyze video
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "videoData": ["base64string1", "base64string2"],
  "interviewId": "..."
}
```

### POST /api/interview/:interviewId/analyze-audio
- **Description:** Analyze audio
- **Headers:** Authorization: Bearer <student token>
- **Body:**
```json
{
  "audioData": ["base64string1", "base64string2"],
  "interviewId": "..."
}
```

### GET /api/interview/history/my-interviews
- **Description:** Get interview history
- **Headers:** Authorization: Bearer <student token>

---

## Leaderboard

### GET /api/leaderboard/:jobId
- **Description:** Get leaderboard for job
- **Headers:** Authorization: Bearer <token>

### GET /api/leaderboard/:jobId/stats
- **Description:** Get leaderboard stats
- **Headers:** Authorization: Bearer <token>

### GET /api/leaderboard/:jobId/candidate/:studentId/position
- **Description:** Get candidate position
- **Headers:** Authorization: Bearer <token>

### POST /api/leaderboard/:jobId/generate
- **Description:** Generate leaderboard (company only)
- **Headers:** Authorization: Bearer <company token>

### PUT /api/leaderboard/:jobId/candidate/:studentId/status
- **Description:** Update candidate status (company only)
- **Headers:** Authorization: Bearer <company token>
- **Body:**
```json
{
  "status": "shortlisted"
}
```

### POST /api/leaderboard/:jobId/compare-candidates
- **Description:** Compare candidates (company only)
- **Headers:** Authorization: Bearer <company token>
- **Body:**
```json
{
  "candidateIds": ["id1", "id2"]
}
```

### GET /api/leaderboard/analytics/top-performers
- **Description:** Get top performers
- **Headers:** Authorization: Bearer <token>

---

## Notes
- Replace `<token>` with your JWT access token
- Replace IDs with actual values from your database
- For file uploads, use Postman's form-data mode
- For endpoints requiring authorization, set the `Authorization` header

---

This file covers all major routes for manual Postman testing. Add more routes as needed for your custom features.
