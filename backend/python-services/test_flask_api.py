#!/usr/bin/env python3
"""
Test script for Flask Video Analysis API
Captures frames from webcam and sends to the API to measure FPS and response time
"""

import cv2
import base64
import requests
import time
import json
from datetime import datetime

# Configuration
API_URL = "http://localhost:8001/analyze-video"
HEALTH_URL = "http://localhost:8001/health"
CAPTURE_DURATION = 10  # seconds
FRAME_INTERVAL = 0.2  # seconds between captures (5 FPS capture rate)
BATCH_SIZE = 5  # Send frames in batches

def check_api_health():
    """Check if the API is running"""
    try:
        response = requests.get(HEALTH_URL, timeout=2)
        if response.status_code == 200:
            print("✅ API is healthy:", response.json())
            return True
        else:
            print(f"❌ API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print(f"   Make sure to run: python3 video_analysis.py")
        return False

def encode_frame(frame):
    """Encode frame as base64 string"""
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode('utf-8')

def capture_and_test():
    """Capture frames and test API performance"""
    
    # Check API health first
    if not check_api_health():
        return
    
    print("\n" + "="*60)
    print("🎥 Starting Webcam Capture + API Testing")
    print("="*60)
    print(f"⏱️  Capture Duration: {CAPTURE_DURATION}s")
    print(f"📊 Frame Interval: {FRAME_INTERVAL}s (~{1/FRAME_INTERVAL:.1f} FPS capture)")
    print(f"📦 Batch Size: {BATCH_SIZE} frames per request")
    print("="*60 + "\n")
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return
    
    # Set webcam properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    print("✅ Webcam opened successfully")
    print("📹 Press 'q' to quit early\n")
    
    # Stats tracking
    frames_captured = 0
    frames_sent = 0
    total_api_time = 0
    api_calls = 0
    frame_batch = []
    
    start_time = time.time()
    last_capture = 0
    
    try:
        while True:
            current_time = time.time()
            elapsed = current_time - start_time
            
            # Check if duration exceeded
            if elapsed >= CAPTURE_DURATION:
                print(f"\n⏰ Capture duration ({CAPTURE_DURATION}s) reached")
                break
            
            # Capture frame
            ret, frame = cap.read()
            if not ret:
                print("⚠️  Failed to capture frame")
                continue
            
            # Display frame
            display_frame = frame.copy()
            cv2.putText(display_frame, f"Captured: {frames_captured} | Sent: {frames_sent}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(display_frame, f"Time: {elapsed:.1f}s / {CAPTURE_DURATION}s", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.imshow('API Test - Press Q to quit', display_frame)
            
            # Check for interval
            if current_time - last_capture >= FRAME_INTERVAL:
                # Encode and add to batch
                encoded = encode_frame(frame)
                frame_batch.append(encoded)
                frames_captured += 1
                last_capture = current_time
                
                print(f"📸 Captured frame {frames_captured} (batch: {len(frame_batch)}/{BATCH_SIZE})")
                
                # Send batch when full
                if len(frame_batch) >= BATCH_SIZE:
                    print(f"\n📤 Sending batch of {len(frame_batch)} frames to API...")
                    api_start = time.time()
                    
                    try:
                        response = requests.post(
                            API_URL,
                            json={'videoData': frame_batch},
                            headers={'Content-Type': 'application/json'},
                            timeout=30
                        )
                        
                        api_time = time.time() - api_start
                        total_api_time += api_time
                        api_calls += 1
                        frames_sent += len(frame_batch)
                        
                        if response.status_code == 200:
                            result = response.json()
                            print(f"✅ API Response (took {api_time:.2f}s):")
                            print(f"   Overall Score: {result.get('overallVideoScore', 0):.1f}/100")
                            print(f"   Eye Contact: {result.get('eyeContactScore', 0):.1f}/100")
                            print(f"   Emotion: {result['analysisMetadata'].get('dominantEmotion', 'N/A')}")
                            print(f"   Frames Analyzed: {result['analysisMetadata'].get('framesAnalyzed', 0)}")
                            print(f"   Processing Rate: {len(frame_batch)/api_time:.2f} frames/sec")
                        else:
                            print(f"❌ API Error: {response.status_code}")
                            print(f"   {response.text}")
                    
                    except requests.Timeout:
                        print(f"⏰ Request timeout after 30s")
                    except Exception as e:
                        print(f"❌ Request failed: {e}")
                    
                    # Clear batch
                    frame_batch = []
                    print()
            
            # Check for quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\n⏹️  User quit")
                break
    
    finally:
        # Send remaining frames if any
        if frame_batch:
            print(f"\n📤 Sending final batch of {len(frame_batch)} frames...")
            try:
                api_start = time.time()
                response = requests.post(
                    API_URL,
                    json={'videoData': frame_batch},
                    timeout=30
                )
                api_time = time.time() - api_start
                total_api_time += api_time
                api_calls += 1
                frames_sent += len(frame_batch)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Final batch processed (took {api_time:.2f}s)")
                    print(f"   Score: {result.get('overallVideoScore', 0):.1f}/100")
            except Exception as e:
                print(f"❌ Final batch failed: {e}")
        
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        
        # Print statistics
        total_time = time.time() - start_time
        print("\n" + "="*60)
        print("📊 PERFORMANCE STATISTICS")
        print("="*60)
        print(f"Total Duration: {total_time:.2f}s")
        print(f"Frames Captured: {frames_captured}")
        print(f"Frames Sent to API: {frames_sent}")
        print(f"API Calls Made: {api_calls}")
        print(f"\n📈 RATES:")
        print(f"Capture Rate: {frames_captured/total_time:.2f} fps")
        print(f"Send Rate: {frames_sent/total_time:.2f} fps")
        
        if api_calls > 0:
            avg_api_time = total_api_time / api_calls
            avg_frames_per_batch = frames_sent / api_calls
            fps_processed = avg_frames_per_batch / avg_api_time
            
            print(f"\n⚡ API PERFORMANCE:")
            print(f"Average API Response Time: {avg_api_time:.2f}s per batch")
            print(f"Average Batch Size: {avg_frames_per_batch:.1f} frames")
            print(f"API Processing Rate: {fps_processed:.2f} frames/sec")
            print(f"Per-Frame Processing Time: {avg_api_time/avg_frames_per_batch:.3f}s/frame")
        
        print("="*60 + "\n")

if __name__ == "__main__":
    print("\n🧪 Flask Video Analysis API - Performance Test")
    print("="*60)
    print("This script will:")
    print("1. Check API health at http://localhost:8001/health")
    print("2. Capture frames from your webcam")
    print("3. Send frames to the API in batches")
    print("4. Measure processing performance (FPS)")
    print("="*60)
    
    input("\n⏸️  Press ENTER to start (make sure API is running)...")
    
    capture_and_test()
