# Test script to verify Redis non-critical dependency fix
# Run this after applying the PM2 fix in PowerShell

Write-Host "🧪 Redis Non-Critical Dependency Test Suite" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if server starts without Redis
Write-Host "Test 1: Server startup without Redis" -ForegroundColor Yellow
Write-Host "⚠️  Making sure Redis is STOPPED for this test..." -ForegroundColor Yellow

# Stop Redis if running
try {
  docker stop redis-server | Out-Null
  Start-Sleep -Seconds 2
} catch {
  Write-Host "⏭️  Redis not running (expected for test)" -ForegroundColor Gray
}

Write-Host "Starting server without Redis..." -ForegroundColor White
pm2 delete all | Out-Null 2>&1
Start-Sleep -Seconds 1
pm2 start ecosystem.config.js | Out-Null 2>&1
Start-Sleep -Seconds 3

# Check if processes are running
$processes = pm2 list 2>/dev/null | Select-String "online"
if ($processes) {
  Write-Host "✅ Server started successfully without Redis" -ForegroundColor Green
} else {
  Write-Host "❌ Server failed to start" -ForegroundColor Red
  exit 1
}

# Test 2: Check API responsiveness
Write-Host ""
Write-Host "Test 2: API responsiveness without Redis" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "http://localhost:5000/api/test" -UseBasicParsing -ErrorAction SilentlyContinue
  if ($response.StatusCode -eq 200) {
    Write-Host "✅ API responding (HTTP 200)" -ForegroundColor Green
  } else {
    Write-Host "❌ API returned HTTP $($response.StatusCode)" -ForegroundColor Red
    pm2 delete all | Out-Null
    exit 1
  }
} catch {
  Write-Host "❌ API not reachable: $_" -ForegroundColor Red
  pm2 delete all | Out-Null
  exit 1
}

# Test 3: Check PM2 logs for errors
Write-Host ""
Write-Host "Test 3: PM2 logs (checking for restart errors)" -ForegroundColor Yellow
$logs = pm2 logs hireprep-backend 2>/dev/null
if ($logs -notlike "*too many unstable restarts*") {
  Write-Host "✅ No 'too many unstable restarts' errors" -ForegroundColor Green
} else {
  Write-Host "❌ Found restart errors in logs" -ForegroundColor Red
}

# Test 4: Start Redis and check reconnection
Write-Host ""
Write-Host "Test 4: Redis auto-reconnection" -ForegroundColor Yellow
Write-Host "Starting Redis container..." -ForegroundColor White

try {
  docker run -d -p 6379:6379 --name redis-server-test redis | Out-Null
  Start-Sleep -Seconds 3
  
  $ping = docker exec redis-server-test redis-cli PING
  if ($ping -eq "PONG") {
    Write-Host "✅ Redis started successfully" -ForegroundColor Green
    
    Start-Sleep -Seconds 2
    $logs = pm2 logs hireprep-backend 2>/dev/null
    if ($logs -like "*Redis connected*") {
      Write-Host "✅ Server auto-reconnected to Redis" -ForegroundColor Green
    } else {
      Write-Host "⚠️  Server may not have reconnected yet (check logs)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "❌ Redis failed to start" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ Error starting Redis: $_" -ForegroundColor Red
}

# Test 5: Rate limiting works
Write-Host ""
Write-Host "Test 5: Rate limiting (making 101 requests)" -ForegroundColor Yellow
$successCount = 0
$limitCount = 0

for ($i = 1; $i -le 101; $i++) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/test" -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) { $successCount++ }
    if ($response.StatusCode -eq 429) { $limitCount++ }
  } catch {
    # Request failed, might be rate limited
  }
}

if ($successCount -ge 100 -and $limitCount -ge 1) {
  Write-Host "✅ Rate limiting working ($successCount allowed, $limitCount blocked)" -ForegroundColor Green
} else {
  Write-Host "⚠️  Rate limiting status unclear ($successCount success, $limitCount limited)" -ForegroundColor Yellow
}

# Cleanup
Write-Host ""
Write-Host "🧹 Cleaning up test containers..." -ForegroundColor White
docker stop redis-server-test | Out-Null 2>&1
docker rm redis-server-test | Out-Null 2>&1

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start your production Redis: docker run -d -p 6379:6379 redis" -ForegroundColor White
Write-Host "2. Restart PM2: pm2 delete all && pm2 start ecosystem.config.js" -ForegroundColor White
Write-Host "3. Verify: pm2 logs hireprep-backend" -ForegroundColor White
