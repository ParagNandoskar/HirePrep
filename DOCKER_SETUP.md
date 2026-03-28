# Docker Setup Guide for HirePrep

## Quick Start (Development)

### Prerequisites
- Docker Desktop installed and running ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Start All Services
```bash
# Navigate to project root
cd HirePrep

# Start all services (MongoDB, Redis, Node.js backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017
- **Redis:** localhost:6379
- **Mongo Express (UI):** http://localhost:8081 (admin/admin123)

---

## Detailed Setup

### 1. Configure Environment Variables

Create a `.env` file in the project root:
```bash
# Copy from template
cp .env.docker .env

# Or manually set essential variables
export GEMINI_API_KEY=your-api-key-here
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 2. Build and Start Services

```bash
# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### 3. Verify Services

```bash
# Check service status
docker-compose ps

# Expected output:
# NAME                 STATUS
# hireprep-backend     Up (healthy)
# hireprep-mongo       Up (healthy)
# hireprep-redis       Up (healthy)
# hireprep-mongo-express Up (running)
```

### 4. Test Backend

```bash
# API health check
curl http://localhost:5000/api/health

# Test response
{
  "success": true,
  "message": "Server is running",
  "database": {
    "connected": true,
    "status": "Connected"
  }
}
```

---

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongo
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Access MongoDB
```bash
# Using MongoDB shell from CLI
docker exec -it hireprep-mongo mongosh -u admin -p admin123

# Using Mongo Express UI
# Open: http://localhost:8081
# Login: admin / admin123
```

### Access Redis
```bash
# Using Redis CLI
docker exec -it hireprep-redis redis-cli

# Check Redis commands
redis-cli ping           # Should return PONG
redis-cli dbsize        # Shows number of keys
redis-cli FLUSHDB       # Clear database
```

### Rebuild Backend
```bash
# After code changes
docker-compose build backend
docker-compose up -d backend
```

### Fresh Start
```bash
# Remove all containers and volumes (WARNING: Clears database)
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## File Structure

```
HirePrep/
├── docker-compose.yml       # Main configuration
├── .env.docker              # Development environment variables
├── .dockerignore            # Files to exclude from Docker build
└── backend/
    ├── Dockerfile           # Backend image definition
    ├── server.js
    ├── package.json
    ├── src/
    ├── uploads/             # Volume mount for files
    └── logs/                # Volume mount for logs
```

---

## Service Configuration

### Backend Service
- **Image:** Built from `./backend/Dockerfile`
- **Port:** 5000
- **Health Check:** HTTP GET `/api/health`
- **Volumes:**
  - Source code (live reload)
  - `/uploads` (persistent)
  - `/logs` (persistent)
- **Dependencies:** Waits for MongoDB & Redis to be healthy

### MongoDB Service
- **Image:** mongo:7.0
- **Port:** 27017
- **Username:** admin
- **Password:** admin123
- **Database:** hireprep
- **Volumes:**
  - `mongodb_data:/data/db` (persistent)
  - `mongodb_config:/data/configdb` (persistent)

### Redis Service
- **Image:** redis:7-alpine
- **Port:** 6379
- **Volumes:**
  - `redis_data:/data` (persistent)
- **Features:** AOF persistence enabled

### Mongo Express (UI)
- **Image:** mongo-express:latest
- **Port:** 8081
- **Username:** admin
- **Password:** admin123
- **Purpose:** Visual MongoDB management tool

---

## Environment Variables

### Essential (Must Configure)
```bash
GEMINI_API_KEY=your-api-key
JWT_SECRET=your-secure-random-key
JWT_REFRESH_SECRET=your-secure-random-key
```

### Optional (for AWS S3)
```bash
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
```

### Database Configuration (Docker)
```bash
MONGODB_URI=mongodb://admin:admin123@mongo:27017/hireprep?authSource=admin
REDIS_HOST=redis
```

All environment variables are pre-configured in `docker-compose.yml` and `.env.docker`.

---

## Troubleshooting

### Issue: "connection refused" for MongoDB
```bash
# Check MongoDB is healthy
docker-compose ps mongo

# View MongoDB logs
docker-compose logs mongo

# Rebuild MongoDB service
docker-compose down mongo
docker-compose up -d mongo
```

### Issue: Backend can't connect to MongoDB
```bash
# Verify connection string
echo $MONGODB_URI
# Should show: mongodb://admin:admin123@mongo:27017/hireprep?authSource=admin

# Check MongoDB is running
docker exec hireprep-mongo mongosh -u admin -p admin123 --eval "db.adminCommand('ping')"
```

### Issue: Redis connection error
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker exec hireprep-redis redis-cli ping
# Should return: PONG
```

### Issue: Port already in use
```bash
# Change port in docker-compose.yml
# Change: ports: - "5000:5000"  →  "5001:5000"
# Then restart: docker-compose restart
```

### Issue: Slow startup (pending healthcheck)
```bash
# Services wait for healthchecks (40-60 seconds)
# This is normal. Wait for "healthy" status:
docker-compose ps

# Or watch live:
watch docker-compose ps
```

---

## Performance Tips

### Development with Hot Reload
- Source code is mounted as a volume
- Changes to `.js` files are reflected immediately if using `nodemon`
- No rebuild needed for code changes

### Database Performance
- MongoDB connection pooling is configured (5-10 connections)
- Redis is optimized for caching and rate limiting
- Both have persistence enabled

### Memory Usage
- Individual service memory limits can be added to `docker-compose.yml`
- Example: `mem_limit: 512m` in service configuration

---

## Production Deployment

For production, consider:
1. **Use secrets management** instead of environment variables
2. **Enable SSL/TLS** for MongoDB and Redis
3. **Set resource limits** on containers
4. **Use environment-specific compose files** (docker-compose.prod.yml)
5. **Set restart policies** (already done: `unless-stopped`)
6. **Enable container logs driver** for centralized logging

Example production adjustments:
```yaml
backend:
  mem_limit: 512m
  cpus: '1.0'
  env_file:
    - .env.prod
  environment:
    NODE_ENV: production
    USE_AWS_SECRETS: 'true'

mongo:
  command: --auth --bind_ip 0.0.0.0 --replSet rs0
```

---

## Cleanup

### Remove everything
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker image rm hireprep-backend mongo:7.0 redis:7-alpine mongo-express:latest
```

### Keep data but stop services
```bash
# Stop without removing volumes
docker-compose down

# Restart later
docker-compose up -d
```

---

## Useful Docker Commands

```bash
# Container management
docker-compose ps                    # List services
docker-compose up -d                 # Start in background
docker-compose down                  # Stop and remove containers
docker-compose restart               # Restart services
docker-compose logs -f               # View live logs

# Execute commands inside containers
docker exec -it hireprep-backend bash          # Shell access
docker exec -it hireprep-mongo mongosh -u admin -p admin123   # MongoDB shell
docker exec -it hireprep-redis redis-cli      # Redis CLI

# Resource usage
docker stats                         # Live resource monitoring
docker-compose exec backend npm test # Run tests
```

---

## Next Steps

1. ✅ Run `docker-compose up -d`
2. ✅ Verify services with `docker-compose ps`
3. ✅ Test backend with `curl http://localhost:5000/api/health`
4. ✅ Access Mongo Express at http://localhost:8081
5. ✅ Start developing!

For frontend development, create a similar Docker Compose setup or run it locally on port 3000/5173.
