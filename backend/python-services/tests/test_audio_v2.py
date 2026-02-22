#!/usr/bin/env python3
"""
Test script for Audio Analysis Service V2.0 (Model-Based)
Tests the new /analyze-audio endpoint with real audio
"""

import requests
import json
import base64
import numpy as np
import soundfile as sf
import io

# Audio Analysis Service URL
AUDIO_URL = "http://localhost:8001"

def create_test_audio():
    """Generate a simple test audio (3 seconds of sine wave)"""
    print("🎵 Generating test audio (3 seconds, 16kHz sine wave)...")
    
    sample_rate = 16000
    duration = 3.0  # seconds
    frequency = 440.0  # A4 note
    
    # Generate sine wave
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = np.sin(2 * np.pi * frequency * t)
    
    # Add some amplitude envelope (fade in/out)
    fade_samples = int(0.1 * sample_rate)
    audio[:fade_samples] *= np.linspace(0, 1, fade_samples)
    audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    
    # Convert to 16-bit PCM
    audio = (audio * 32767).astype(np.int16)
    
    # Save to bytes buffer as WAV
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format='WAV', subtype='PCM_16')
    buffer.seek(0)
    
    # Encode to base64
    audio_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    print(f"   ✅ Generated {duration}s audio at {sample_rate}Hz")
    print(f"   ✅ Base64 length: {len(audio_base64)} chars\n")
    
    return audio_base64


def test_health():
    """Test health endpoint"""
    print("=" * 70)
    print("🏥 Testing Health Endpoint")
    print("=" * 70)
    
    try:
        response = requests.get(f"{AUDIO_URL}/health")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response:\n{json.dumps(data, indent=2)}")
            print("✅ Health check passed!\n")
            return True
        else:
            print(f"❌ Health check failed: {response.text}\n")
            return False
            
    except Exception as e:
        print(f"❌ Could not connect to service: {e}\n")
        return False


def test_models_info():
    """Test models info endpoint"""
    print("=" * 70)
    print("🧠 Testing Models Info Endpoint")
    print("=" * 70)
    
    try:
        response = requests.get(f"{AUDIO_URL}/models/info")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response:\n{json.dumps(data, indent=2)}")
            print("✅ Models info retrieved!\n")
            return True
        else:
            print(f"❌ Failed: {response.text}\n")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_audio_analysis():
    """Test main audio analysis endpoint"""
    print("=" * 70)
    print("🎤 Testing Audio Analysis Endpoint")
    print("=" * 70)
    
    # Generate test audio
    audio_base64 = create_test_audio()
    
    payload = {
        "audio_base64": audio_base64,
        "transcript_optional": False  # Let Whisper transcribe
    }
    
    print(f"📤 Sending audio analysis request...")
    print(f"   Audio size: {len(audio_base64)} chars (base64)")
    print(f"   Transcript mode: Auto-transcribe (Whisper)")
    print()
    
    try:
        print("⏳ Processing (this may take 10-30s on first request)...")
        print("   Models are downloading and initializing...\n")
        
        response = requests.post(
            f"{AUDIO_URL}/analyze-audio",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120  # 2 minute timeout for first request
        )
        
        print(f"Status: {response.status_code}\n")
        
        if response.status_code == 200:
            result = response.json()
            
            print("=" * 70)
            print("✅ ANALYSIS RESULTS")
            print("=" * 70)
            
            # Display results in organized format
            print("\n🎭 EMOTION ANALYSIS:")
            print(f"   Emotion: {result.get('emotion', 'N/A')}")
            print(f"   Confidence: {result.get('emotion_score', 0):.2f}")
            
            print("\n📝 TRANSCRIPTION:")
            print(f"   Text: {result.get('transcript', 'N/A')}")
            print(f"   Word Count: {result.get('word_count', 0)}")
            print(f"   Speech Rate: {result.get('speech_rate_wpm', 0):.1f} WPM")
            
            print("\n🎯 FLUENCY METRICS:")
            print(f"   Fluency Score: {result.get('fluency_score', 0):.1f}/100")
            print(f"   Pause Count: {result.get('pause_count', 0)}")
            print(f"   Hesitations: {result.get('hesitation_count', 0)}")
            
            print("\n💭 SENTIMENT ANALYSIS:")
            print(f"   Sentiment: {result.get('sentiment', 'N/A')}")
            print(f"   Score: {result.get('sentiment_score', 0):.1f}/100")
            
            print("\n⭐ OVERALL CONFIDENCE:")
            print(f"   Score: {result.get('confidence_score', 0):.1f}/100")
            print(f"   Grade: {result.get('confidence_grade', 'N/A')}")
            print(f"   Interpretation: {result.get('interpretation', 'N/A')[:100]}...")
            
            print("\n" + "=" * 70)
            print("✅ Audio analysis completed successfully!")
            print("=" * 70 + "\n")
            
            return True
        else:
            print(f"❌ Analysis failed: {response.text}\n")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (models may still be downloading)")
        print("   Try running the test again in a few minutes\n")
        return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("🚀 AUDIO ANALYSIS SERVICE V2.0 - TEST SUITE")
    print("=" * 70)
    print("Testing Model-Based Architecture:")
    print("  • Wav2Vec2 for emotion recognition")
    print("  • Whisper for transcription")
    print("  • DistilBERT for sentiment analysis")
    print("=" * 70 + "\n")
    
    # Run tests
    results = {
        "Health Check": test_health(),
        "Models Info": test_models_info(),
        "Audio Analysis": test_audio_analysis()
    }
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
    
    total = len(results)
    passed = sum(results.values())
    
    print("=" * 70)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Service is working correctly.")
    else:
        print("⚠️  Some tests failed. Check logs above for details.")
    
    print("=" * 70 + "\n")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
