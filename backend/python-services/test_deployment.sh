#!/bin/bash

# Video Analysis Service - Deployment Test Script
# Tests Docker build and deployment before pushing to production

set -e  # Exit on error

echo "============================================================"
echo "🧪 Video Analysis Service - Deployment Test"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="hireprep-video-analysis"
CONTAINER_NAME="test-video-analysis"
TEST_PORT="8001"

# Function to cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

echo "📋 Pre-deployment Checklist:"
echo "-----------------------------------------------------------"

# Check 1: Model file exists
echo -n "1. Checking for model file (face_landmarker.task)... "
if [ -f "face_landmarker.task" ]; then
    SIZE=$(ls -lh face_landmarker.task | awk '{print $5}')
    echo -e "${GREEN}✅ Found (${SIZE})${NC}"
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    echo "   Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    exit 1
fi

# Check 2: Dockerfile exists
echo -n "2. Checking for Dockerfile.video... "
if [ -f "Dockerfile.video" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    exit 1
fi

# Check 3: Requirements file exists
echo -n "3. Checking for requirements.txt... "
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    exit 1
fi

# Check 4: video_analysis.py exists
echo -n "4. Checking for video_analysis.py... "
if [ -f "video_analysis.py" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    exit 1
fi

# Check 5: Docker is running
echo -n "5. Checking Docker status... "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    echo "   Please start Docker Desktop"
    exit 1
fi

echo ""
echo "============================================================"
echo "🔨 Building Docker Image"
echo "============================================================"

docker build -f Dockerfile.video -t $IMAGE_NAME . || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo "============================================================"
echo "🚀 Starting Container"
echo "============================================================"

docker run -d \
    --name $CONTAINER_NAME \
    -p $TEST_PORT:8001 \
    --memory="2g" \
    --cpus="2" \
    $IMAGE_NAME

echo -e "${GREEN}✅ Container started${NC}"
echo "   Container ID: $(docker ps -q -f name=$CONTAINER_NAME)"
echo ""

echo "⏳ Waiting 10 seconds for service to initialize..."
sleep 10

echo ""
echo "============================================================"
echo "🧪 Running Health Checks"
echo "============================================================"

# Health check with retries
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo -n "Attempt $((RETRY_COUNT+1))/$MAX_RETRIES: "
    
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$TEST_PORT/health 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo "   Response: $BODY"
        HEALTH_OK=true
        break
    else
        echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "   Retrying in 5 seconds..."
            sleep 5
        fi
    fi
done

if [ "$HEALTH_OK" = false ]; then
    echo ""
    echo -e "${RED}❌ Health check failed after $MAX_RETRIES attempts${NC}"
    echo ""
    echo "📋 Container Logs:"
    echo "-----------------------------------------------------------"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "============================================================"
echo "📊 Container Stats"
echo "============================================================"

docker stats $CONTAINER_NAME --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "============================================================"
echo "📋 Container Logs (Last 20 lines)"
echo "============================================================"

docker logs --tail 20 $CONTAINER_NAME

echo ""
echo "============================================================"
echo "✅ DEPLOYMENT TEST PASSED"
echo "============================================================"
echo ""
echo "The service is ready for deployment!"
echo ""
echo "📍 Endpoints:"
echo "   Health Check: http://localhost:$TEST_PORT/health"
echo "   Analyze Video: http://localhost:$TEST_PORT/analyze-video (POST)"
echo ""
echo "🧪 To test with webcam:"
echo "   python3 test_flask_api.py"
echo ""
echo "🐳 Docker Commands:"
echo "   View logs:     docker logs -f $CONTAINER_NAME"
echo "   Stop:          docker stop $CONTAINER_NAME"
echo "   Remove:        docker rm $CONTAINER_NAME"
echo "   Restart:       docker restart $CONTAINER_NAME"
echo ""
echo "☁️  Next Steps for Production:"
echo "   1. Tag image: docker tag $IMAGE_NAME your-registry/$IMAGE_NAME:v1.0"
echo "   2. Push: docker push your-registry/$IMAGE_NAME:v1.0"
echo "   3. Deploy to cloud platform (AWS ECS, GCP Cloud Run, etc.)"
echo ""
echo "Press Enter to stop the test container and cleanup..."
read

