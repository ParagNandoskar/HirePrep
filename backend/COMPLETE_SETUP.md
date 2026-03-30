# HirePrep - Complete Setup Guide (Docker-Only)

**Last Updated:** March 30, 2026  
**Status:** ✅ Production Ready

---

## Table Of Contents

1. Project Overview
2. BullMQ Queue System
3. Server Configuration
4. Environment Setup
5. Running The Application
6. Testing And Verification
7. Troubleshooting
8. Monitoring

---

## Project Overview

HirePrep is an AI-powered resume screening and interview platform.

- Backend: Node.js + Express.js
- Frontend: React + Vite
- Database: MongoDB Atlas
- Queue/Cache: Redis + BullMQ
- File Storage: AWS S3
- NLP Services: Python microservices
- Runtime: Docker Compose

---

## BullMQ Queue System

BullMQ processes background jobs asynchronously.

Active queues:

- resume-processing
- interview-analysis
- job-recommendations
- email-notifications

Worker startup behavior:

```javascript
if (process.env.ENABLE_WORKERS !== 'false') {
  require('./src/services/worker');
}
```

Key endpoints:

- `GET /api/resumes/job-status/:jobId`
- `GET /api/resumes/queue-stats/:queueName`

---

## Server Configuration

Main runtime is Docker Compose from project root via `docker-compose.yml`.

Exposed service ports:

- backend: `5000`
- nlp-service: `8000`
- audio-service: `8001`
- redis: `6379`

Note: `video-service` may be run separately depending on deployment mode.

---

## Environment Setup

Files:

- `backend/.env` (runtime secrets)
- `backend/.env.example` (template)
- `backend/nlp-service/.env` and `backend/audio-service/.env` if used

Important variables:

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`
- `ENABLE_WORKERS`
- `CORS_ORIGIN`, `FRONTEND_URL`, `CORS_VERCEL_PROJECTS`

Create env from template:

```bash
cd backend
cp .env.example .env
```

---

## Running The Application

From project root:

```bash
docker-compose up -d --build
```

View logs:

```bash
docker-compose logs -f
```

Stop services:

```bash
docker-compose down
```

---

## Testing And Verification

Health check:

```bash
curl http://localhost:5000/api/health
```

Queue stats example:

```bash
curl http://localhost:5000/api/resumes/queue-stats/resume-processing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

Workers not starting:

```bash
cat backend/.env | grep ENABLE_WORKERS
```

Redis check:

```bash
redis-cli ping
```

CORS check:

- Ensure frontend domain is present in `CORS_ORIGIN`
- Ensure `FRONTEND_URL` is correct

MongoDB check:

```bash
cat backend/.env | grep MONGODB_URI
```

---

## Monitoring

Container status:

```bash
docker ps
```

Container resource usage:

```bash
docker stats
```

Backend logs only:

```bash
docker logs -f hireprep_backend_1
```

---

## About backend/logs Folder

For Docker-only deployment, `backend/logs/` is **not required** because logs are written to container stdout/stderr and viewed via `docker logs`.

You can delete `backend/logs/` safely if:

- You are not running Node directly on host
- No custom file logger writes there

If you want to keep the folder for future local/non-Docker runs, leave it empty.

