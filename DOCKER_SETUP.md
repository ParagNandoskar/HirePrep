# Docker Setup Guide for HirePrep

**Last Updated:** March 29, 2026

## Overview

The root Docker Compose setup runs four services:

- backend (Node.js + Express + Redis + Bull)
- nlp-service (Python Flask)
- audio-service (Python Flask)
- redis (official image)

Video service is intentionally **not** included in Docker. Keep `backend/video-service` running locally (for example, behind ngrok) for hybrid deployment.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2 (`docker compose` command)

## Service Ports

- backend: `5000:5000`
- nlp-service: `8000:8000`
- audio-service: `8001:8001`
- redis: `6379:6379`

## Quick Start

```bash
# from project root
cd HirePrep

# build and start all Dockerized services
docker compose up --build -d

# check status
docker compose ps

# stream logs
docker compose logs -f
```

## Health Checks

```bash
curl http://localhost:5000/api/health
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## Environment Configuration

Compose uses these env files:

- `./backend/.env`
- `./backend/nlp-service/.env`
- `./backend/audio-service/.env`

Important backend overrides are injected in compose so service-to-service calls resolve correctly in Docker:

- `REDIS_HOST=redis`
- `NLP_SERVICE_URL=http://nlp-service:8000`
- `AUDIO_SERVICE_URL=http://audio-service:8001`

## Common Commands

```bash
# rebuild one service
docker compose build backend

# restart one service
docker compose up -d backend

# view logs for one service
docker compose logs -f backend
docker compose logs -f nlp-service
docker compose logs -f audio-service
docker compose logs -f redis

# stop and remove containers/network
docker compose down

# stop and remove containers/network + anonymous volumes
docker compose down -v
```

## Redis Verification

```bash
docker compose ps redis
docker compose exec redis redis-cli ping
# expected: PONG
```

## Troubleshooting

### Port already in use

Change host-side mapping in `docker-compose.yml`, then restart:

```bash
docker compose down
docker compose up -d
```

### Backend cannot reach NLP or audio services

- Verify all services are up: `docker compose ps`
- Check backend logs: `docker compose logs -f backend`
- Confirm backend environment values in compose are not overridden incorrectly in local shell.

### Slow first startup for NLP service

The NLP image installs Python dependencies and spaCy model during build, so first build is expected to take longer.

## Notes

- Use `docker compose` (not legacy `docker-compose`) for all commands.
- Keep secrets in env files and never commit real credentials.
- Video-service remains local/ngrok by design.
