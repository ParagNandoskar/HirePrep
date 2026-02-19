#!/usr/bin/env python3
"""
Test script for Video Analysis Service
Sends a sample request to test the debug logging
"""

import requests
import json
import base64

# Video Analysis Service URL
VIDEO_URL = "http://localhost:8001"

def test_health():
    """Test health endpoint"""
    print("=" * 60)
    print("Testing Video Service Health...")
    print("=" * 60)
    
    response = requests.get(f"{VIDEO_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_video_analysis():
    """Test video analysis endpoint"""
    print("=" * 60)
    print("Testing Video Analysis...")
    print("=" * 60)
    
    # Create a simple 1x1 pixel PNG image (base64 encoded)
    # This is a minimal valid image for testing
    test_frame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    payload = {
        "videoData": [test_frame, test_frame, test_frame]  # 3 frames for testing
    }
    
    print(f"Sending request with:")
    print(f"  - Video frames: {len(payload['videoData'])}")
    print()
    
    try:
        response = requests.post(
            f"{VIDEO_URL}/analyze-video",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response received successfully!")
            print(json.dumps(result, indent=2))
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to video service.")
        print("   Make sure the service is running on port 8001")
        print("   Run: cd /Users/sahil/Desktop/projects/hireprep/backend/python-services")
        print("        source venv/bin/activate")
        print("        python video_analysis.py")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

if __name__ == "__main__":
    print("\n🎥 Video Analysis Service Test\n")
    test_health()
    test_video_analysis()
    print("=" * 60)
    print("Test Complete!")
    print("=" * 60)
