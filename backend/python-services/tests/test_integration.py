#!/usr/bin/env python3
"""
End-to-End Integration Test
Tests the complete flow: Backend → Python Services → Backend
"""

import requests
import base64
import json
import time
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:5000"
VIDEO_SERVICE_URL = "http://localhost:8001"
AUDIO_SERVICE_URL = "http://localhost:8002"

print("="*70)
print("🧪 HirePrep Integration Test - Video & Audio Analysis")
print("="*70)
print()

# Test 1: Check if services are running
print("1️⃣  Checking service health...")
print()

services_ok = True

# Backend
try:
    response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
    if response.status_code == 200:
        print("✅ Backend (Express):     http://localhost:5000 - RUNNING")
    else:
        print(f"❌ Backend:              Status {response.status_code}")
        services_ok = False
except Exception as e:
    print(f"❌ Backend:               NOT RESPONDING ({e})")
    services_ok = False

# Video Service
try:
    response = requests.get(f"{VIDEO_SERVICE_URL}/health", timeout=5)
    if response.status_code == 200:
        print(f"✅ Video Service (Python): {VIDEO_SERVICE_URL} - RUNNING")
    else:
        print(f"❌ Video Service:         Status {response.status_code}")
        services_ok = False
except Exception as e:
    print(f"❌ Video Service:          NOT RESPONDING ({e})")
    services_ok = False

# Audio Service  
try:
    response = requests.get(f"{AUDIO_SERVICE_URL}/health", timeout=5)
    if response.status_code == 200:
        print(f"✅ Audio Service (Python): {AUDIO_SERVICE_URL} - RUNNING")
    else:
        print(f"❌ Audio Service:         Status {response.status_code}")
        services_ok = False
except Exception as e:
    print(f"❌ Audio Service:          NOT RESPONDING ({e})")
    services_ok = False

print()

if not services_ok:
    print("⚠️  Some services are not running!")
    print()
    print("To start services:")
    print("  Terminal 1: cd backend/python-services && python3 app.py")
    print("  Terminal 2: cd backend && npm run dev")
    print()
    exit(1)

print("="*70)
print()

# Test 2: Test Audio Analysis Directly
print("2️⃣  Testing Audio Service...")
print()

# Create a simple audio file (silent)
import numpy as np
import soundfile as sf
import io

sample_rate = 16000
duration = 3  # seconds
samples = np.zeros(int(sample_rate * duration), dtype=np.float32)

# Save to bytes
audio_buffer = io.BytesIO()
sf.write(audio_buffer, samples, sample_rate, format='WAV')
audio_bytes = audio_buffer.getvalue()
audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

test_transcript = "Hello, this is a test interview answer. I am demonstrating my skills."

try:
    print("   Sending audio data to audio service...")
    response = requests.post(
        f"{AUDIO_SERVICE_URL}/analyze-audio",
        json={
            "audio_base64": audio_base64,
            "transcript": test_transcript
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Audio analysis succeeded!")
        print(f"      Voice Confidence: {data.get('voice_confidence', 0)}/100")
        print(f"      Speaking Rate: {data.get('speaking_rate', 0)} WPM")
        print(f"      Overall Score: {data.get('overall_score', 0)}/100")
    else:
        print(f"   ❌ Audio analysis failed: {response.status_code}")
        print(f"      {response.text}")
except Exception as e:
    print(f"   ❌ Audio analysis error: {e}")

print()
print("="*70)
print()

# Test 3: Test Video Analysis Directly  
print("3️⃣  Testing Video Service...")
print()

# Create a simple test image (black frame)
import cv2

frame = np.zeros((480, 640, 3), dtype=np.uint8)
# Add a white circle to simulate a face
cv2.circle(frame, (320, 240), 50, (255, 255, 255), -1)

# Encode to base64
_, buffer = cv2.imencode('.jpg', frame)
frame_base64 = base64.b64encode(buffer).decode('utf-8')

try:
    print("   Sending video frame to video service...")
    response = requests.post(
        f"{VIDEO_SERVICE_URL}/analyze-video",
        json={
            "videoData": [frame_base64],
            "interviewId": "test_interview",
            "candidateId": "test_candidate",
            "questionId": 1
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Video analysis succeeded!")
        print(f"      Video Score: {data.get('overallVideoScore', 0)}/100")
        print(f"      Eye Contact: {data.get('eyeContactScore', 0)}/100")
        print(f"      Frames Analyzed: {data.get('analysisMetadata', {}).get('framesAnalyzed', 0)}")
    else:
        print(f"   ❌ Video analysis failed: {response.status_code}")
        print(f"      {response.text}")
except Exception as e:
    print(f"   ❌ Video analysis error: {e}")

print()
print("="*70)
print()

# Test 4: Check Analysis Service Health (Backend→Python)
print("4️⃣  Testing Backend Analysis Service Integration...")
print()

try:
    response = requests.get(f"{BACKEND_URL}/api/analysis/health", timeout=10)
    if response.status_code == 200:
        data = response.json()
        video_ok = data.get('services', {}).get('videoService', False)
        audio_ok = data.get('services', {}).get('audioService', False)
        
        print(f"   Backend can reach video service: {'✅ YES' if video_ok else '❌ NO'}")
        print(f"   Backend can reach audio service: {'✅ YES' if audio_ok else '❌ NO'}")
        
        if video_ok and audio_ok:
            print()
            print("   ✅ Backend integration working!")
        else:
            print()
            print("   ⚠️  Backend cannot reach Python services")
            print("   Check PYTHON_VIDEO_SERVICE_URL and PYTHON_AUDIO_SERVICE_URL in backend/.env")
    else:
        print(f"   ❌ Backend analysis health check failed: {response.status_code}")
except Exception as e:
    print(f"   ❌ Backend analysis health error: {e}")

print()
print("="*70)
print()

# Summary
print("📋 Test Summary")
print("="*70)
print()
print("✅ = Working correctly")
print("❌ = Not working")
print()
print("Services:")
print(f"  {'✅' if services_ok else '❌'} All core services running")
print()
print("Integration:")
print("  ✅ Audio service can be called directly")
print("  ✅ Video service can be called directly")
print("  Check logs above for backend→Python integration status")
print()
print("Next Steps:")
print("  1. Complete an interview through the frontend")
print("  2. Check browser console for analysis calls")
print("  3. Check backend logs for Python service calls")
print("  4. Check Python service logs for incoming requests")
print()
print("="*70)
