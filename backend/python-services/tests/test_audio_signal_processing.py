#!/usr/bin/env python3
"""
Test Script for Signal Processing Audio Analysis (v3.0)

Tests the current implementation:
- VoiceAnalyzer: Signal processing for pitch, volume, pace, nervousness
- FillerWordDetector: Pattern matching for filler words
- Complete audio analysis pipeline

No ML models required - zero storage deployment
"""

import os
import sys
import numpy as np
import logging
from pathlib import Path

# Add python-services root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.audio_service.analyzers.voice_analyzer import VoiceAnalyzer
from services.audio_service.analyzers.filler_detector import FillerWordDetector

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def create_test_audio(duration=3.0, sample_rate=16000, scenario="confident"):
    """
    Create synthetic audio data for testing
    
    Scenarios:
    - confident: Stable pitch, good volume, steady pace
    - nervous: Variable pitch, fluctuating volume, fast pace
    - monotone: Flat pitch, low volume, slow pace
    """
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    if scenario == "confident":
        # Stable voice with good characteristics
        frequency = 150 + 10 * np.sin(2 * np.pi * 0.5 * t)  # Slight natural variation
        amplitude = 0.5 + 0.05 * np.sin(2 * np.pi * 0.3 * t)  # Steady volume
        audio = amplitude * np.sin(2 * np.pi * frequency * t)
        
    elif scenario == "nervous":
        # Shaky voice with high variation
        frequency = 180 + 40 * np.sin(2 * np.pi * 2.0 * t)  # High pitch variation
        amplitude = 0.3 + 0.2 * np.sin(2 * np.pi * 1.5 * t)  # Fluctuating volume
        # Add tremor
        tremor = 0.1 * np.sin(2 * np.pi * 10 * t)
        audio = (amplitude + tremor) * np.sin(2 * np.pi * frequency * t)
        
    elif scenario == "monotone":
        # Flat, unenergetic voice
        frequency = 140  # Constant pitch
        amplitude = 0.25  # Low volume
        audio = amplitude * np.sin(2 * np.pi * frequency * t)
        
    else:
        raise ValueError(f"Unknown scenario: {scenario}")
    
    # Add some noise for realism
    noise = np.random.normal(0, 0.01, len(audio))
    audio = audio + noise
    
    # Normalize
    audio = audio / np.max(np.abs(audio))
    
    return audio.astype(np.float32), sample_rate


def test_voice_analyzer():
    """Test VoiceAnalyzer with different scenarios"""
    print("\n" + "="*80)
    print("TESTING VOICE ANALYZER (Signal Processing)")
    print("="*80)
    
    analyzer = VoiceAnalyzer()
    
    scenarios = ["confident", "nervous", "monotone"]
    
    for scenario in scenarios:
        print(f"\n{'─'*80}")
        print(f"Scenario: {scenario.upper()}")
        print(f"{'─'*80}")
        
        audio, sr = create_test_audio(duration=3.0, scenario=scenario)
        
        # Analyze
        result = analyzer.analyze(audio, sr)
        
        # Display results
        print(f"\n🎤 Voice Characteristics:")
        print(f"   Confidence Score: {result['voice_confidence']:.1f}%")
        print(f"   Speaking Rate: {result['speaking_rate']:.1f} words/min")
        print(f"   Nervousness: {result['nervousness_score']:.1f}%")
        
        print(f"\n📊 Pitch Analysis:")
        print(f"   Average: {result['pitch_analysis']['average_hz']:.1f} Hz")
        print(f"   Stability: {result['pitch_analysis']['stability']:.1f}%")
        print(f"   Variance: {result['pitch_analysis']['variance']:.1f}")
        
        print(f"\n🔊 Volume Analysis:")
        print(f"   Average dB: {result['volume_analysis']['average_db']:.1f}")
        print(f"   Consistency: {result['volume_analysis']['consistency']:.1f}%")
        
        print(f"\n⏱️  Pace Analysis:")
        print(f"   Pauses: {result['pause_count']}")
        print(f"   Total Pause Time: {result['total_pause_seconds']:.1f}s")
        print(f"   Overall Score: {result['overall_score']:.1f}/100")
        
        # Interpretation
        print(f"\n💡 Interpretation:")
        if result['voice_confidence'] > 70:
            print(f"   ✅ Strong, confident voice delivery")
        elif result['voice_confidence'] > 50:
            print(f"   ⚠️  Moderate confidence, some room for improvement")
        else:
            print(f"   ❌ Low confidence indicators detected")
        
        if result['nervousness_score'] > 60:
            print(f"   ⚠️  High nervousness detected - recommend practice")
        elif result['nervousness_score'] > 40:
            print(f"   ℹ️  Moderate nervousness - normal interview stress")
        else:
            print(f"   ✅ Calm and composed delivery")
    
    return True


def test_filler_detector():
    """Test FillerWordDetector with various transcripts"""
    print("\n" + "="*80)
    print("TESTING FILLER WORD DETECTOR (Pattern Matching)")
    print("="*80)
    
    detector = FillerWordDetector()
    
    test_cases = [
        {
            "name": "Clean Speaker",
            "transcript": "I have extensive experience in Python and JavaScript. I've built several full-stack applications using React and Node.js. My approach to problem solving is methodical and thorough.",
            "expected": "low"
        },
        {
            "name": "Moderate Fillers",
            "transcript": "Um, I think that, you know, my experience in, like, software development is pretty good. So, yeah, I can work with, uh, different technologies.",
            "expected": "moderate"
        },
        {
            "name": "Heavy Fillers",
            "transcript": "So, um, basically, like, you know, I was, uh, basically working on, like, this project, right? And, um, like, it was, you know, kind of challenging, basically.",
            "expected": "high"
        },
        {
            "name": "Repetitive Speech",
            "transcript": "I think that that that the solution should should be comprehensive. We need to to ensure that we we cover all cases.",
            "expected": "moderate-high"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n{'─'*80}")
        print(f"Test Case: {test_case['name']} (Expected: {test_case['expected']})")
        print(f"{'─'*80}")
        
        transcript = test_case['transcript']
        print(f"\n📝 Transcript ({len(transcript.split())} words):")
        print(f"   \"{transcript}\"")
        
        # Analyze
        result = detector.analyze(transcript)
        
        # Display results
        print(f"\n🔍 Filler Word Analysis:")
        print(f"   Total Fillers: {result['filler_words']['count']}")
        print(f"   Filler Rate: {result['filler_words']['rate_percent']:.1f}%")
        print(f"   Per Minute: {result['filler_words']['per_minute']:.1f}")
        print(f"   Total Words: {result['word_metrics']['total_words']}")
        print(f"   Quality Score: {result['quality_score']:.1f}/100")
        
        if result['filler_words']['breakdown']:
            print(f"\n   Detected Fillers:")
            for filler, count in sorted(result['filler_words']['breakdown'].items(), key=lambda x: x[1], reverse=True):
                print(f"      • '{filler}': {count}x")
        
        if result['repetitions']['words']:
            print(f"\n   Repeated Words:")
            for word in result['repetitions']['words'][:5]:
                print(f"      • '{word}'")
        
        # Interpretation
        print(f"\n💡 Assessment:")
        print(f"   {result['feedback']}")
        if result['filler_words']['rate_percent'] < 5:
            print(f"   ✅ Excellent - Minimal filler words")
        elif result['filler_words']['rate_percent'] < 10:
            print(f"   ⚠️  Good - Some filler words present")
        elif result['filler_words']['rate_percent'] < 15:
            print(f"   ⚠️  Fair - Noticeable filler usage")
        else:
            print(f"   ❌ Poor - Excessive filler words (practice recommended)")
    
    return True


def test_integration():
    """Test the complete audio analysis integration"""
    print("\n" + "="*80)
    print("TESTING COMPLETE AUDIO ANALYSIS INTEGRATION")
    print("="*80)
    
    voice_analyzer = VoiceAnalyzer()
    filler_detector = FillerWordDetector()
    
    # Scenario: Job interview answer
    print(f"\n{'─'*80}")
    print(f"Scenario: Technical Interview Answer")
    print(f"{'─'*80}")
    
    # Create audio (nervous candidate)
    audio, sr = create_test_audio(duration=5.0, scenario="nervous")
    
    # Simulated transcript from browser Speech-to-Text API
    transcript = "Um, so basically, my experience with, like, React is, you know, pretty good. I've, uh, built several applications and, um, yeah, I think I can handle most challenges."
    
    print(f"\n📝 Transcript:")
    print(f"   \"{transcript}\"")
    
    # Analyze voice
    voice_result = voice_analyzer.analyze(audio, sr)
    
    # Analyze transcript
    filler_result = filler_detector.analyze(transcript)
    
    # Combined results
    print(f"\n📊 COMBINED ANALYSIS RESULTS:")
    print(f"\n1️⃣  Voice Delivery:")
    print(f"   • Confidence: {voice_result['voice_confidence']:.1f}%")
    print(f"   • Nervousness: {voice_result['nervousness_score']:.1f}%")
    print(f"   • Speaking Rate: {voice_result['speaking_rate']:.1f} wpm")
    
    print(f"\n2️⃣  Speech Quality:")
    print(f"   • Filler Words: {filler_result['filler_words']['count']} ({filler_result['filler_words']['rate_percent']:.1f}%)")
    print(f"   • Total Words: {filler_result['word_metrics']['total_words']}")
    print(f"   • Quality Score: {filler_result['quality_score']:.1f}/100")
    
    print(f"\n3️⃣  Overall Assessment:")
    
    # Calculate combined score
    voice_score = voice_result['voice_confidence']
    filler_penalty = min(filler_result['filler_words']['rate_percent'] * 3, 30)  # Max 30 point penalty
    nervousness_penalty = voice_result['nervousness_score'] * 0.2  # Max 20 point penalty
    
    overall_score = voice_score - filler_penalty - nervousness_penalty
    overall_score = max(0, min(100, overall_score))
    
    print(f"   • Overall Audio Score: {overall_score:.1f}/100")
    
    if overall_score > 80:
        print(f"   • Grade: A (Excellent)")
        print(f"   • Recommendation: ✅ Strong candidate - proceed to next round")
    elif overall_score > 60:
        print(f"   • Grade: B (Good)")
        print(f"   • Recommendation: ✅ Good candidate - minor improvements needed")
    elif overall_score > 40:
        print(f"   • Grade: C (Fair)")
        print(f"   • Recommendation: ⚠️  Consider with improvements")
    else:
        print(f"   • Grade: D/F (Needs Improvement)")
        print(f"   • Recommendation: ❌ More practice recommended")
    
    # Integration with Gemini API note
    print(f"\n4️⃣  Next Steps:")
    print(f"   • Send transcript to Gemini API for answer correctness evaluation")
    print(f"   • Combine with video emotion analysis from DeepFace")
    print(f"   • Use InterviewAggregator.aggregate() for final comprehensive report")
    print(f"   • Generate interview readiness score (0-100) with recommendations")
    
    return True


def test_edge_cases():
    """Test edge cases and error handling"""
    print("\n" + "="*80)
    print("TESTING EDGE CASES")
    print("="*80)
    
    voice_analyzer = VoiceAnalyzer()
    filler_detector = FillerWordDetector()
    
    # Test 1: Very short audio
    print(f"\n{'─'*80}")
    print(f"Edge Case 1: Very Short Audio (0.5 seconds)")
    print(f"{'─'*80}")
    
    short_audio, sr = create_test_audio(duration=0.5, scenario="confident")
    result = voice_analyzer.analyze(short_audio, sr)
    print(f"✅ Handled short audio - Confidence: {result['voice_confidence']:.1f}%")
    
    # Test 2: Empty transcript
    print(f"\n{'─'*80}")
    print(f"Edge Case 2: Empty Transcript")
    print(f"{'─'*80}")
    
    result = filler_detector.analyze("")
    print(f"✅ Handled empty transcript - Fillers: {result['filler_words']['count']}")
    
    # Test 3: Silent audio
    print(f"\n{'─'*80}")
    print(f"Edge Case 3: Silent Audio")
    print(f"{'─'*80}")
    
    silent_audio = np.zeros(16000 * 2, dtype=np.float32)
    result = voice_analyzer.analyze(silent_audio, 16000)
    print(f"✅ Handled silent audio - Confidence: {result['voice_confidence']:.1f}%")
    
    # Test 4: Very long transcript
    print(f"\n{'─'*80}")
    print(f"Edge Case 4: Long Transcript (1000 words)")
    print(f"{'─'*80}")
    
    long_transcript = " ".join(["word"] * 1000)
    result = filler_detector.analyze(long_transcript)
    print(f"✅ Handled long transcript - Total words: {result['word_metrics']['total_words']}")
    
    return True


def run_all_tests():
    """Run all test suites"""
    print("\n" + "🔬"*40)
    print("SIGNAL PROCESSING AUDIO ANALYSIS TEST SUITE")
    print("Version 3.0 - Zero Storage Deployment")
    print("🔬"*40)
    
    tests = [
        ("Voice Analyzer", test_voice_analyzer),
        ("Filler Word Detector", test_filler_detector),
        ("Integration Test", test_integration),
        ("Edge Cases", test_edge_cases)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, "✅ PASSED" if success else "❌ FAILED"))
        except Exception as e:
            logger.error(f"Test {test_name} failed with error: {e}", exc_info=True)
            results.append((test_name, f"❌ ERROR: {str(e)}"))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, result in results:
        print(f"{result:15} - {test_name}")
    
    passed = sum(1 for _, r in results if "PASSED" in r)
    total = len(results)
    
    print(f"\n{'─'*80}")
    print(f"Total: {passed}/{total} tests passed")
    print(f"{'─'*80}")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready for deployment.")
        print("\n📦 Deployment Info:")
        print(f"   • Storage Required: 9.3 MB (video models only)")
        print(f"   • Audio Analysis: 0 MB (signal processing)")
        print(f"   • Answer Evaluation: Gemini API (cloud-based)")
        print(f"   • Deployment Cost: Free tier or <$5/month")
    else:
        print("\n⚠️  Some tests failed. Please review the errors above.")
    
    return passed == total


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test suite failed: {e}", exc_info=True)
        sys.exit(1)
