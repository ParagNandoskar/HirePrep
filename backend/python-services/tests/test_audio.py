#!/usr/bin/env python3
"""
Test script for Audio Analysis Service
Sends a sample request to test the debug logging
"""

import requests
import json
import base64

# Audio Analysis Service URL
AUDIO_URL = "http://localhost:8002"

def test_health():
    """Test health endpoint"""
    print("=" * 60)
    print("Testing Audio Service Health...")
    print("=" * 60)
    
    response = requests.get(f"{AUDIO_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_audio_analysis():
    """Test audio analysis endpoint"""
    print("=" * 60)
    print("Testing Audio Analysis...")
    print("=" * 60)
    
    # Create a simple test audio data (base64 encoded dummy data)
    # In a real scenario, you would encode actual audio file
    test_audio = base64.b64encode(b"This is test audio data").decode('utf-8')
    
    payload = {
        "audioData": [test_audio],
        "transcript": "This is a test transcript for sentiment analysis. I am feeling confident and positive about this interview."
    }
    
    print(f"Sending request with:")
    print(f"  - Audio chunks: {len(payload['audioData'])}")
    print(f"  - Transcript: '{payload['transcript'][:50]}...'")
    print()
    
    try:
        response = requests.post(
            f"{AUDIO_URL}/analyze-audio",
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
        print("❌ Could not connect to audio service.")
        print("   Make sure the service is running on port 8002")
        print("   Run: cd /Users/sahil/Desktop/projects/hireprep/backend/python-services")
        print("        source venv/bin/activate")
        print("        python audio_analysis.py")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

if __name__ == "__main__":
    print("\n🎵 Audio Analysis Service Test\n")
    test_health()
    test_audio_analysis()
    print("=" * 60)
    print("Test Complete!")
    print("=" * 60)
