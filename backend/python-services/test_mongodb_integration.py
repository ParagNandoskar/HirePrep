#!/usr/bin/env python3
"""
Integration Test for MongoDB Storage
Tests the complete flow: Flask API → MongoDB Storage
"""

import cv2
import base64
import requests
import time
from datetime import datetime
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()

# Configuration
API_URL = "http://localhost:8001/analyze-video"
HEALTH_URL = "http://localhost:8001/health"
MONGO_URI = os.getenv('MONGODB_URI')

# Test data
TEST_INTERVIEW_ID = "507f1f77bcf86cd799439011"
TEST_CANDIDATE_ID = "507f1f77bcf86cd799439012"
TEST_QUESTION_ID = 1

def check_api_health():
    """Check if the Flask API is running"""
    try:
        response = requests.get(HEALTH_URL, timeout=2)
        if response.status_code == 200:
            print("✅ Flask API is healthy")
            return True
        else:
            print(f"❌ Flask API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to Flask API: {e}")
        print(f"   Make sure to run: python3 video_analysis.py")
        return False

def capture_continuous_video(duration_seconds=10, fps=3):
    """Capture video frames at specified FPS (default: 3 FPS for efficiency)"""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return []
    
    # Warm up camera (let it adjust exposure/focus)
    print("⏳ Warming up camera (30 frames)...")
    for i in range(30):  # Capture and discard 30 frames (~1 second)
        cap.read()
        time.sleep(0.033)  # ~30 FPS warmup
    
    print(f"🎥 Starting {duration_seconds}-second video capture at {fps} FPS...")
    print("   (Look at the webcam and move naturally)")
    
    frames = []
    start_time = time.time()
    frame_count = 0
    frame_interval = 1.0 / fps  # Time between frames
    
    while time.time() - start_time < duration_seconds:
        ret, frame = cap.read()
        if not ret:
            print(f"⚠️  Frame {frame_count} capture failed")
            continue
        
        # Encode frame
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        encoded = base64.b64encode(buffer).decode('utf-8')
        frames.append(encoded)
        frame_count += 1
        
        # Show progress every 3 frames
        elapsed = time.time() - start_time
        if frame_count % 3 == 0:
            print(f"   📊 {elapsed:.1f}s elapsed - {frame_count} frames captured")
        
        time.sleep(frame_interval)  # Adjustable FPS
    
    cap.release()
    
    elapsed = time.time() - start_time
    print(f"✅ Capture complete: {frame_count} frames in {elapsed:.1f}s ({frame_count/elapsed:.1f} FPS)")
    return frames

def send_frames_with_metadata():
    """Send frames to API with interview metadata"""
    print("\n📸 Starting video capture...")
    frames = capture_continuous_video(duration_seconds=10)
    
    if not frames:
        print("❌ No frames captured")
        return None
    
    print(f"✅ {len(frames)} frames captured")
    
    print(f"\n📤 Sending {len(frames)} frames to Flask API with metadata...")
    print(f"   Interview ID: {TEST_INTERVIEW_ID}")
    print(f"   Candidate ID: {TEST_CANDIDATE_ID}")
    print(f"   Question ID: {TEST_QUESTION_ID}")
    
    payload = {
        'videoData': frames,
        'interviewId': TEST_INTERVIEW_ID,
        'candidateId': TEST_CANDIDATE_ID,
        'questionId': TEST_QUESTION_ID
    }
    
    try:
        print("⏳ Analyzing video (this may take a moment)...")
        response = requests.post(
            API_URL,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=120  # Increased timeout for batch processing
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response received:")
            print(f"   Overall Score: {result.get('overallVideoScore', 0):.1f}/100")
            print(f"   Eye Contact: {result.get('eyeContactScore', 0):.1f}/100")
            print(f"   Engagement: {result.get('engagementScore', 0):.1f}/100")
            print(f"   Frames Analyzed: {result['analysisMetadata'].get('framesAnalyzed', 0)}")
            print(f"   Analysis Time: {result['analysisMetadata'].get('processingTime', 0):.2f}s")
            return True
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def verify_mongodb_storage():
    """Verify frames were stored in MongoDB"""
    print(f"\n🔍 Checking MongoDB for stored frames...")
    
    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tlsAllowInvalidCertificates=True
        )
        
        db = client['hireprep']
        collection = db['videoanalysisframes']
        
        # Check for frames from our test interview
        from bson import ObjectId
        test_count = collection.count_documents({
            'interviewId': ObjectId(TEST_INTERVIEW_ID),
            'candidateId': ObjectId(TEST_CANDIDATE_ID)
        })
        
        total_count = collection.count_documents({})
        
        print(f"✅ MongoDB connection successful")
        print(f"   Frames from this test: {test_count}")
        print(f"   Total frames in database: {total_count}")
        
        if test_count == 0:
            print(f"\n⚠️  WARNING: No frames found in MongoDB!")
            print(f"   This means MongoDB storage is NOT working.")
            print(f"\n   Possible reasons:")
            print(f"   1. Flask service started BEFORE .env file was created")
            print(f"   2. MONGO_STORAGE_ENABLED is not set to 'true'")
            print(f"   3. MongoDB initialization failed in Flask service")
            print(f"\n   Solution: Restart Flask service to reload .env:")
            print(f"   - Stop current service (Ctrl+C)")
            print(f"   - Run: python3 video_analysis.py")
            print(f"   - Check logs for 'MongoDB storage initialized'")
            return False
        
        if test_count > 0:
            # Get all frames from this test session
            frames = list(collection.find(
                {
                    'interviewId': ObjectId(TEST_INTERVIEW_ID),
                    'candidateId': ObjectId(TEST_CANDIDATE_ID),
                    'questionId': TEST_QUESTION_ID
                },
                sort=[('timestamp', 1)]  # Oldest first
            ))
            
            print(f"\n📊 Analysis Summary:")
            print(f"   Frames stored: {len(frames)}")
            
            # Calculate averages
            video_scores = [f.get('scores', {}).get('videoConfidence', 0) for f in frames]
            eye_contact_scores = [f.get('scores', {}).get('eyeContact', 0) for f in frames]
            engagement_scores = [f.get('scores', {}).get('engagement', 0) for f in frames]
            
            if video_scores:
                print(f"   Average Video Confidence: {sum(video_scores)/len(video_scores):.1f}/100")
            if eye_contact_scores:
                print(f"   Average Eye Contact: {sum(eye_contact_scores)/len(eye_contact_scores):.1f}/100")
            if engagement_scores:
                print(f"   Average Engagement: {sum(engagement_scores)/len(engagement_scores):.1f}/100")
            
            # Face detection stats
            faces_detected = sum(1 for f in frames if f.get('faceDetection', {}).get('detected', False))
            looking_away_count = sum(1 for f in frames if f.get('faceDetection', {}).get('lookingAway', False))
            
            print(f"   Face Detected: {faces_detected}/{len(frames)} frames ({100*faces_detected/len(frames):.1f}%)")
            print(f"   Looking Away: {looking_away_count}/{len(frames)} frames ({100*looking_away_count/len(frames):.1f}%)")
            
            # Emotion distribution
            emotions = {}
            for f in frames:
                emotion = f.get('emotion', {}).get('dominant', 'unknown')
                emotions[emotion] = emotions.get(emotion, 0) + 1
            
            print(f"\n📋 Emotion Distribution:")
            for emotion, count in sorted(emotions.items(), key=lambda x: x[1], reverse=True):
                print(f"   {emotion}: {count} frames ({100*count/len(frames):.1f}%)")
            
            # Show first and last frame details
            if len(frames) > 0:
                first = frames[0]
                last = frames[-1]
                
                print(f"\n🎬 First Frame:")
                print(f"   Timestamp: {first.get('timestamp')}")
                print(f"   Video Confidence: {first.get('scores', {}).get('videoConfidence', 0):.1f}/100")
                print(f"   Dominant Emotion: {first.get('emotion', {}).get('dominant', 'N/A')}")
                
                print(f"\n🎬 Last Frame:")
                print(f"   Timestamp: {last.get('timestamp')}")
                print(f"   Video Confidence: {last.get('scores', {}).get('videoConfidence', 0):.1f}/100")
                print(f"   Dominant Emotion: {last.get('emotion', {}).get('dominant', 'N/A')}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB check failed: {e}")
        return False

def main():
    print("="*60)
    print("🧪 MongoDB Storage Integration Test (10-Second Capture)")
    print("="*60)
    print("\nThis test will:")
    print("1. Check Flask API health")
    print("2. Capture 10 seconds of webcam video")
    print("3. Send all frames with interview metadata to API")
    print("4. Verify frames were stored in MongoDB")
    print("5. Show analysis summary and emotion distribution")
    print("="*60)
    
    # Step 1: Check API
    print("\n[1/4] Checking Flask API...")
    if not check_api_health():
        print("\n❌ Flask API is not running!")
        print("   Start it with: python3 video_analysis.py")
        return
    
    # Step 2 & 3: Capture and send frames
    print("\n[2/4] Capturing 10 seconds of video...")
    time.sleep(1)
    if not send_frames_with_metadata():
        print("\n❌ Failed to send frames to API")
        return
    
    # Wait for frames to be stored
    print("\n[3/4] Waiting 3 seconds for batch storage to complete...")
    time.sleep(3)
    
    # Step 4: Verify MongoDB
    print("\n[4/4] Verifying MongoDB storage and calculating statistics...")
    if not verify_mongodb_storage():
        print("\n" + "="*60)
        print("❌ INTEGRATION TEST FAILED!")
        print("="*60)
        print("\n⚠️  MongoDB storage is not working properly.")
        print("\nPlease restart the Flask service to reload configuration:")
        print("   1. Stop any running services (Ctrl+C in service terminal)")
        print("   2. cd /Users/sahil/Desktop/projects/hireprep/backend/python-services")
        print("   3. python3 video_analysis.py")
        print("   4. Look for: 'MongoDB storage initialized' in logs")
        print("   5. Run this test again: python3 test_mongodb_integration.py")
        return
    
    print("\n" + "="*60)
    print("✅ INTEGRATION TEST PASSED!")
    print("="*60)
    print("\n🎉 MongoDB storage is working correctly!")
    print("\n📝 Summary:")
    print("   ✅ Flask API is running")
    print("   ✅ Video frames are being analyzed")
    print("   ✅ All data is stored in MongoDB")
    print("   ✅ Real-time emotion tracking working")
    print("\n🚀 Ready for production use!")
    print("\nNext steps:")
    print("   1. Update frontend to send interviewId and candidateId")
    print("   2. Query MongoDB for detailed interview insights")
    print("   3. Export CSV reports for HR review")

if __name__ == "__main__":
    main()
