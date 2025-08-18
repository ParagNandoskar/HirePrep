You are an expert **backend architect & senior full-stack developer**.
Build a **production-ready backend** for a platform where students upload resumes, companies post jobs, and an AI system conducts mock interviews with real-time analysis.

---

## 🏗 Tech Stack

* **Node.js + Express.js** (backend framework)
* **MongoDB Atlas** (database)
* **JWT Authentication** (for students & companies)
* **Socket.IO + WebRTC** (real-time interview video/audio)
* **Python Microservices** (for AI analysis, called from Node.js backend)

---

## 🔑 Features

### 1. **Authentication & Users**

* Register/Login (JWT based).
* Two roles: `student` and `company`.

### 2. **Resume Upload & Parsing**

* Students upload resumes (PDF/DOCX).
* Resume is stored in **Cloudinary / local storage**.
* Resume text is sent to **Google Gemini API** → extract:

  * Skills
  * Education
  * Experience
* Store structured resume data in **MongoDB**.

✅ **Gemini Model Used**:

* **Gemini 2.5 Flash-Lite** → for resume parsing (fast, cost-efficient).

### 3. **Job Posting (Company)**

* Companies can post jobs (title, description, required skills).
* Jobs stored in DB.

### 4. **Job Recommendation & Matching**

* Backend matches student skills (from parsed resume) with job required skills.
* Ranking algorithm for best matches.

✅ **Gemini Model Used**:

* **Gemini Embedding API** → generate semantic vectors for resumes and job descriptions, then compute similarity.

### 5. **Mock Interview (Real-time)**

* Student starts mock interview session.
* Interview handled via **WebRTC + Socket.IO**.
* AI Interview Bot:

  * Uses Gemini API to generate **dynamic interview questions**.
  * Sends/receives conversation in real-time.

✅ **Gemini Model Used**:

* **Gemini 2.5 Flash** → for generating dynamic, conversational interview questions.

### 6. **AI Analysis (Microservices Integration)**

* **Video Analysis**

  * Stream student webcam frames to Python microservice.
  * Uses **OpenCV + DeepFace + MediaPipe**.
  * Returns facial emotion analysis, eye contact, engagement score.

* **Audio Analysis**

  * Stream student audio chunks to Python microservice.
  * Uses **Hugging Face Wav2Vec2 + OpenSMILE**.
  * Returns tone, stress, clarity, sentiment.

* Backend aggregates results + interview Q/A correctness.

### 7. **Leaderboard**

* After interviews, backend generates a leaderboard by scoring candidates:

  * Resume–job match score (Gemini embeddings).
  * AI Video score (facial analysis).
  * AI Audio score (tone analysis).
  * AI Q/A score.
* Top candidates sent to companies.

---

## 📂 Backend Structure

```
backend/
 ┣ src/
 ┃ ┣ config/        → DB, Cloudinary, Gemini API configs
 ┃ ┣ models/        → User, Resume, Job, Interview, Leaderboard
 ┃ ┣ routes/        → auth.js, resume.js, job.js, interview.js, leaderboard.js
 ┃ ┣ controllers/   → business logic
 ┃ ┣ services/      → resumeParser.js, jobMatcher.js, leaderboard.js
 ┃ ┣ middlewares/   → authMiddleware.js, errorHandler.js
 ┃ ┣ utils/         → JWT utils, scoring functions
 ┃ ┗ app.js         → Express setup
 ┣ python-services/
 ┃ ┣ video_analysis.py   → (OpenCV + DeepFace + MediaPipe)
 ┃ ┗ audio_analysis.py   → (Wav2Vec2 + OpenSMILE)
 ┣ docker-compose.yml    → containerize Node + Python services
 ┣ package.json
 ┗ server.js


---

## ⚡ API Endpoints

### Auth

* `POST /api/auth/register` → Register (student/company).
* `POST /api/auth/login` → Login.

### Resume

* `POST /api/resume/upload` → Upload + parse resume (Gemini Flash-Lite).
* `GET /api/resume/:userId` → Get parsed resume.

### Jobs

* `POST /api/jobs` → Post job (company).
* `GET /api/jobs` → Get all jobs.
* `GET /api/jobs/match/:studentId` → Recommend jobs to student (Gemini Embeddings).

### Interview

* `POST /api/interview/start` → Start interview session (WebRTC + Socket.IO).
* `POST /api/interview/analyze` → Send audio/video stream → AI analysis microservices.
* `POST /api/interview/finish` → Save report.

### Leaderboard

* `GET /api/leaderboard/:jobId` → Get ranked candidates.

---

## 🎯 Additional Requirements

* Code must be modular, clean, and use **async/await**.
* Use **dotenv** for secrets (MongoDB URI, Gemini API key).
* Use **Mongoose** for DB models.
* Use **Docker** for Python microservices.
* Add **error handling & validation** middleware.
* Return responses in JSON format (`{ success, data, message }`).

---

👉 **TASK**: Generate the **complete backend codebase** with all routes, models, controllers, and service integrations based on the above architecture.

---
