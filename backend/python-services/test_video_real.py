#!/usr/bin/env python3
"""
Real Video Analysis Test
Tests the video analysis service with actual video frames from webcam or sample images
"""

import cv2
import base64
import requests
import json
import numpy as np

def create_test_frame_with_face():
    """Create a test frame with a simple drawn face"""
    # Create a 640x480 image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (240, 240, 240)  # Light gray background
    
    # Draw a simple face
    # Face circle
    cv2.circle(img, (320, 240), 100, (200, 180, 160), -1)
    
    # Eyes
    cv2.circle(img, (290, 220), 15, (50, 50, 50), -1)  # Left eye
    cv2.circle(img, (350, 220), 15, (50, 50, 50), -1)  # Right eye
    
    # Nose
    cv2.line(img, (320, 240), (320, 270), (100, 100, 100), 3)
    
    # Mouth (smile)
    cv2.ellipse(img, (320, 280), (40, 20), 0, 0, 180, (100, 50, 50), 3)
    
    return img

def test_with_webcam():
    """Test with webcam frames"""
    print("\n🎥 Testing with Webcam...")
    print("=" * 60)
    
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Could not open webcam")
        return None
    
    # Create output directory
    output_dir = "captured_frames"
    import os
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    import time
    duration = 10  # seconds
    interval = 0.5 # seconds
    total_frames = int(duration / interval)
    
    print(f"📸 Capturing {total_frames} frames over {duration} seconds (every {interval}s)...")
    print(f"📂 Saving frames to '{output_dir}/'...")

    frames = []
    for i in range(total_frames):
        loop_start = time.time()
        
        ret, frame = cap.read()
        if ret:
            # Save frame for debug
            filename = f"{output_dir}/frame_{i+1}.jpg"
            cv2.imwrite(filename, frame)
            
            # Encode frame to base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_b64 = base64.b64encode(buffer).decode('utf-8')
            frames.append(frame_b64)
            print(f"   [{i+1}/{total_frames}] Saved {filename} ({frame.shape})")
        else:
            print(f"   ⚠️ Failed to capture frame {i+1}")

        # Sleep to match interval
        elapsed = time.time() - loop_start
        if elapsed < interval:
            time.sleep(interval - elapsed)
        else:
            print(f"   Failed to capture frame {i+1}")
    
    cap.release()
    
    if len(frames) == 0:
        print("❌ No frames captured")
        return None
    
    print(f"✅ Captured {len(frames)} frames\n")
    return frames

def test_with_drawn_face():
    """Test with programmatically drawn face"""
    print("\n🎨 Testing with Drawn Face...")
    print("=" * 60)
    
    print("🖼️  Creating test frame with drawn face...")
    frame = create_test_frame_with_face()
    
    # Encode to base64
    _, buffer = cv2.imencode('.jpg', frame)
    frame_b64 = base64.b64encode(buffer).decode('utf-8')
    
    # Use same frame 5 times
    frames = [frame_b64] * 5
    
    print(f"✅ Created frame: {frame.shape}")
    print(f"   Using same frame 5 times\n")
    
    return frames

def send_to_service(frames):
    """Send frames to video analysis service"""
    print("📤 Sending to Video Analysis Service...")
    print("=" * 60)
    
    try:
        response = requests.post(
            'http://localhost:8001/analyze-video',
            json={'videoData': frames},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Analysis Results:")
            print(json.dumps(result, indent=2))
            
            # Highlight key metrics
            print("\n📊 Key Metrics:")
            print(f"   Overall Score: {result.get('overallVideoScore', 0):.1f}/100")
            print(f"   Eye Contact: {result.get('eyeContactScore', 0):.1f}/100")
            print(f"   Confidence: {result.get('confidenceScore', 0):.1f}/100")
            print(f"   Engagement: {result.get('engagementScore', 0):.1f}/100")
            print(f"   Dominant Emotion: {result.get('analysisMetadata', {}).get('dominantEmotion', 'unknown')}")
            
            # Print Frame-by-Frame Breakdown
            frame_details = result.get('analysisMetadata', {}).get('frameDetails', [])
            if frame_details:
                print("\n🎞️  Frame Logic breakdown:")
                print(f"{'Frame':<6} | {'Conf':<6} | {'Eye':<6} | {'Yaw':<6} | {'Pitch':<6} | {'Face':<6} | {'Emotion':<10} | {'Method'}")
                print("-" * 85)
                for f in frame_details:
                    print(f"{f['frame']:<6} | {f['confidence']:<6.1f} | {f['eyeContact']:<6.1f} | {f.get('yaw', 0):<6.1f} | {f.get('pitch', 0):<6.1f} | {'✅' if f['faceDetected'] else '❌':<6} | {f['emotion']:<10} | {f.get('method', '???')}")
            
            return result
        else:
            print(f"❌ Error: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to service. Is it running on port 8001?")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("\n" + "=" * 60)
    print("🎥 Real Video Analysis Test")
    print("=" * 60)
    
    # Try webcam first
    frames = test_with_webcam()
    
    # If webcam fails, use drawn face
    if frames is None:
        print("\n⚠️  Webcam not available, using drawn face instead...")
        frames = test_with_drawn_face()
    
    # Send to service
    if frames:
        result = send_to_service(frames)
        
        if result:
            print("\n" + "=" * 60)
            print("✅ Test Complete!")
            print("=" * 60)
            
            # Check if we got meaningful results
            overall_score = result.get('overallVideoScore', 0)
            if overall_score > 0:
                print("\n🎉 Service is working! Got real analysis results!")
            else:
                print("\n⚠️  Got zero scores - check service logs for details")
        else:
            print("\n❌ Test failed - check service status")
    else:
        print("\n❌ Could not generate test frames")

if __name__ == "__main__":
    main()
