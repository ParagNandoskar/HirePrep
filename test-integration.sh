#!/bin/bash

# HirePrep Integration Test Script
# Tests video/audio analysis and leaderboard integration

echo "=================================="
echo "🧪 HirePrep Integration Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:5000"

# Test functions
test_backend_health() {
    echo "1️⃣  Testing Backend Health..."
    response=$(curl -s "${BACKEND_URL}/api/health")
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not responding${NC}"
        return 1
    fi
}

test_analysis_health() {
    echo ""
    echo "2️⃣  Testing Analysis Services Health..."
    response=$(curl -s "${BACKEND_URL}/api/analysis/health")
    
    if echo "$response" | grep -q '"videoService":true'; then
        echo -e "${GREEN}✅ Video service is running (port 8001)${NC}"
    else
        echo -e "${RED}❌ Video service is not available${NC}"
    fi
    
    if echo "$response" | grep -q '"audioService":true'; then
        echo -e "${GREEN}✅ Audio service is running (port 8002)${NC}"
    else
        echo -e "${RED}❌ Audio service is not available${NC}"
    fi
}

test_video_service() {
    echo ""
    echo "3️⃣  Testing Video Service Directly..."
    response=$(curl -s "http://localhost:8001/health")
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}✅ Video service responding${NC}"
        echo "   Service: $(echo $response | grep -o '"service":"[^"]*"')"
    else
        echo -e "${RED}❌ Video service not responding${NC}"
    fi
}

test_audio_service() {
    echo ""
    echo "4️⃣  Testing Audio Service Directly..."
    response=$(curl -s "http://localhost:8002/health")
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}✅ Audio service responding${NC}"
        echo "   Version: $(echo $response | grep -o '"version":"[^"]*"')"
    else
        echo -e "${RED}❌ Audio service not responding${NC}"
    fi
}

check_logs() {
    echo ""
    echo "5️⃣  Checking Service Logs..."
    
    # Check if Python services are running
    if pgrep -f "python.*app.py" > /dev/null; then
        echo -e "${GREEN}✅ Python services process found${NC}"
    else
        echo -e "${RED}❌ No Python services process found${NC}"
    fi
    
    # Check if Node backend is running
    if pgrep -f "node.*server.js" > /dev/null || pgrep -f "nodemon" > /dev/null; then
        echo -e "${GREEN}✅ Node.js backend process found${NC}"
    else
        echo -e "${RED}❌ No Node.js backend process found${NC}"
    fi
}

display_summary() {
    echo ""
    echo "=================================="
    echo "📋 Test Summary"
    echo "=================================="
    echo ""
    echo "Required Services:"
    echo "  • Backend (Express): http://localhost:5000"
    echo "  • Video Analysis:     http://localhost:8001"
    echo "  • Audio Analysis:     http://localhost:8002"
    echo "  • Frontend (React):   http://localhost:5173"
    echo ""
    echo "To start all services:"
    echo "  1. cd backend/python-services && python3 app.py"
    echo "  2. cd backend && npm run dev"
    echo "  3. cd frontend && npm run dev"
    echo ""
    echo "View integration guide:"
    echo "  cat INTEGRATION_GUIDE.md"
    echo ""
}

# Run tests
test_backend_health
test_analysis_health
test_video_service
test_audio_service
check_logs
display_summary

echo "=================================="
echo "Test complete! 🎉"
echo "=================================="
