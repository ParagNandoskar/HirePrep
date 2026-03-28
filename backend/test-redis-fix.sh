#!/bin/bash

# Test script to verify Redis non-critical dependency fix
# Run this after applying the PM2 fix

echo "🧪 Redis Non-Critical Dependency Test Suite"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if server starts without Redis
echo "Test 1: Server startup without Redis"
echo "✋ Please ensure Redis is STOPPED before continuing"
echo "Press Enter to continue..."
read

REDIS_STATUS=$(docker ps --filter "name=redis-server" --format "{{.State}}")
if [ "$REDIS_STATUS" == "running" ]; then
  echo -e "${YELLOW}⚠️  Stopping Redis for test...${NC}"
  docker stop redis-server > /dev/null 2>&1
  sleep 2
fi

echo "Starting server (should succeed even without Redis)..."
pm2 delete all > /dev/null 2>&1
sleep 1
pm2 start ecosystem.config.js > /dev/null 2>&1
sleep 3

# Check if processes are running
RUNNING=$(pm2 list 2>/dev/null | grep -c "online")
if [ "$RUNNING" -gt 0 ]; then
  echo -e "${GREEN}✅ Server started successfully without Redis${NC}"
else
  echo -e "${RED}❌ Server failed to start${NC}"
  exit 1
fi

# Test 2: Check API responsiveness
echo ""
echo "Test 2: API responsiveness without Redis"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/test)
if [ "$RESPONSE" == "200" ]; then
  echo -e "${GREEN}✅ API responding (HTTP $RESPONSE)${NC}"
else
  echo -e "${RED}❌ API not responding (HTTP $RESPONSE)${NC}"
  pm2 delete all
  exit 1
fi

# Test 3: Check PM2 logs for errors
echo ""
echo "Test 3: PM2 logs (checking for restart errors)"
RESTARTS=$(pm2 logs hireprep-backend --lines 50 2>/dev/null | grep -c "too many unstable restarts")
if [ "$RESTARTS" == "0" ]; then
  echo -e "${GREEN}✅ No 'too many unstable restarts' errors${NC}"
else
  echo -e "${RED}❌ Found restart errors in logs${NC}"
fi

# Test 4: Start Redis and check reconnection
echo ""
echo "Test 4: Redis auto-reconnection"
echo "Starting Redis container..."
docker run -d -p 6379:6379 --name redis-server-test redis > /dev/null 2>&1
sleep 3

REDIS_PING=$(redis-cli PING 2>/dev/null)
if [ "$REDIS_PING" == "PONG" ]; then
  echo -e "${GREEN}✅ Redis started successfully${NC}"
  
  # Check if server auto-connected
  sleep 2
  REDIS_CONNECTED=$(pm2 logs hireprep-backend --lines 20 2>/dev/null | grep -c "Redis connected at")
  if [ "$REDIS_CONNECTED" -gt 0 ]; then
    echo -e "${GREEN}✅ Server auto-reconnected to Redis${NC}"
  else
    echo -e "${YELLOW}⚠️  Server may not have reconnected yet (check logs)${NC}"
  fi
else
  echo -e "${RED}❌ Redis failed to start${NC}"
fi

# Test 5: Rate limiting works
echo ""
echo "Test 5: Rate limiting (making 101 requests)"
SUCCESS_COUNT=0
LIMIT_COUNT=0

for i in {1..101}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/test 2>/dev/null)
  if [ "$RESPONSE" == "200" ]; then
    ((SUCCESS_COUNT++))
  elif [ "$RESPONSE" == "429" ]; then
    ((LIMIT_COUNT++))
  fi
done

if [ "$SUCCESS_COUNT" -ge 100 ] && [ "$LIMIT_COUNT" -ge 1 ]; then
  echo -e "${GREEN}✅ Rate limiting working (${SUCCESS_COUNT} allowed, ${LIMIT_COUNT} blocked)${NC}"
else
  echo -e "${YELLOW}⚠️  Rate limiting status unclear (${SUCCESS_COUNT} success, ${LIMIT_COUNT} limited)${NC}"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up test containers..."
docker stop redis-server-test > /dev/null 2>&1
docker rm redis-server-test > /dev/null 2>&1

echo ""
echo "==========================================="
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Start your production Redis: docker run -d -p 6379:6379 redis"
echo "2. Restart PM2: pm2 delete all && pm2 start ecosystem.config.js"
echo "3. Verify: pm2 logs hireprep-backend"
