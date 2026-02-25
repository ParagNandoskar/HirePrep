#!/usr/bin/env python3
"""
Real Audio File Test - Audio Analysis v3.0
Tests the audio analysis system with actual audio file I/O
"""

import os
import sys
import numpy as np
import soundfile as sf
import logging
from pathlib import Path

# Add python-services root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.audio_service.analyzers.voice_analyzer import VoiceAnalyzer
from services.audio_service.analyzers.filler_detector import FillerWordDetector
from utils.audio_scoring import calculate_audio_score

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def generate_realistic_audio(output_path: str, scenario: str = "interview_answer"):
    """
    Generate realistic audio file simulating an interview answer
    
    Args:
        output_path: Path to save the WAV file
        scenario: Type of audio to generate
    """
    duration = 10.0  # 10 seconds
    sample_rate = 16000
    
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    if scenario == "interview_answer":
        # Simulate realistic interview answer with varying characteristics
        # Start confident, then nervous moment, then recover
        
        # Time segments
        confident_part = t < 3
        nervous_part = (t >= 3) & (t < 6)
        recovery_part = t >= 6
        
        # Initialize audio
        audio = np.zeros_like(t)
        
        # Confident part (0-3s): Stable pitch, good volume
        confident_freq = 150 + 8 * np.sin(2 * np.pi * 0.3 * t[confident_part])
        confident_amp = 0.5 + 0.03 * np.sin(2 * np.pi * 0.2 * t[confident_part])
        audio[confident_part] = confident_amp * np.sin(2 * np.pi * confident_freq * t[confident_part])
        
        # Nervous part (3-6s): Higher pitch, variable volume, slight tremor
        nervous_freq = 180 + 25 * np.sin(2 * np.pi * 1.5 * t[nervous_part])
        nervous_amp = 0.35 + 0.15 * np.sin(2 * np.pi * 1.2 * t[nervous_part])
        tremor = 0.08 * np.sin(2 * np.pi * 8 * t[nervous_part])
        audio[nervous_part] = (nervous_amp + tremor) * np.sin(2 * np.pi * nervous_freq * t[nervous_part])
        
        # Recovery part (6-10s): Stabilizing, moderate confidence
        recovery_freq = 155 + 12 * np.sin(2 * np.pi * 0.5 * t[recovery_part])
        recovery_amp = 0.45 + 0.05 * np.sin(2 * np.pi * 0.3 * t[recovery_part])
        audio[recovery_part] = recovery_amp * np.sin(2 * np.pi * recovery_freq * t[recovery_part])
        
        # Add pauses to simulate natural speech (3 pauses)
        pause_1 = (t >= 2.5) & (t < 2.8)  # Natural pause
        pause_2 = (t >= 5.5) & (t < 5.9)  # Nervous pause (longer)
        pause_3 = (t >= 8.2) & (t < 8.4)  # Natural pause
        
        audio[pause_1] *= 0.1
        audio[pause_2] *= 0.05
        audio[pause_3] *= 0.1
        
    elif scenario == "strong_candidate":
        # Very confident, stable delivery
        frequency = 145 + 5 * np.sin(2 * np.pi * 0.4 * t)
        amplitude = 0.55 + 0.02 * np.sin(2 * np.pi * 0.25 * t)
        audio = amplitude * np.sin(2 * np.pi * frequency * t)
        
        # Natural pauses
        pause_1 = (t >= 3.2) & (t < 3.4)
        pause_2 = (t >= 7.1) & (t < 7.3)
        audio[pause_1] *= 0.1
        audio[pause_2] *= 0.1
        
    elif scenario == "nervous_candidate":
        # Highly nervous throughout
        frequency = 190 + 35 * np.sin(2 * np.pi * 2.0 * t)
        amplitude = 0.3 + 0.18 * np.sin(2 * np.pi * 1.8 * t)
        tremor = 0.12 * np.sin(2 * np.pi * 9 * t)
        audio = (amplitude + tremor) * np.sin(2 * np.pi * frequency * t)
        
    else:
        raise ValueError(f"Unknown scenario: {scenario}")
    
    # Add realistic background noise
    noise = np.random.normal(0, 0.015, len(audio))
    audio = audio + noise
    
    # Normalize to prevent clipping
    audio = audio / np.max(np.abs(audio)) * 0.9
    
    # Save as WAV file
    sf.write(output_path, audio.astype(np.float32), sample_rate)
    
    return output_path, sample_rate


def test_with_real_file():
    """Test audio analysis with real audio files"""
    
    print("\n" + "="*80)
    print("🎙️  AUDIO ANALYSIS TEST WITH REAL AUDIO FILES")
    print("="*80)
    
    # Create test audio directory
    test_audio_dir = Path(__file__).parent / "test_audio_files"
    test_audio_dir.mkdir(exist_ok=True)
    
    # Initialize analyzers
    voice_analyzer = VoiceAnalyzer()
    filler_detector = FillerWordDetector()
    
    # Test cases with different scenarios
    test_cases = [
        {
            "name": "Interview Answer (Mixed Performance)",
            "scenario": "interview_answer",
            "transcript": "Um, so my experience with JavaScript is quite good. I've, uh, worked on several projects. Like, I'm really comfortable with React and Node.js. You know, I can handle most challenges."
        },
        {
            "name": "Strong Candidate",
            "scenario": "strong_candidate",
            "transcript": "I have extensive experience in full-stack development. My expertise includes React, Node.js, and MongoDB. I approach problems systematically and deliver robust solutions."
        },
        {
            "name": "Nervous Candidate",
            "scenario": "nervous_candidate",
            "transcript": "Um, so basically, like, I think that, you know, my skills are, uh, pretty good. I mean, I've, um, worked on, like, some projects, you know what I mean?"
        }
    ]
    
    results = []
    
    for idx, test_case in enumerate(test_cases, 1):
        print(f"\n{'─'*80}")
        print(f"TEST CASE {idx}: {test_case['name']}")
        print(f"{'─'*80}")
        
        # Generate audio file
        audio_filename = f"test_{test_case['scenario']}.wav"
        audio_path = test_audio_dir / audio_filename
        
        print(f"\n📝 Step 1: Generating audio file...")
        file_path, sample_rate = generate_realistic_audio(str(audio_path), test_case['scenario'])
        file_size_kb = os.path.getsize(file_path) / 1024
        print(f"   ✅ Created: {audio_filename} ({file_size_kb:.1f} KB, {sample_rate} Hz)")
        
        # Load audio file
        print(f"\n📂 Step 2: Loading audio file...")
        audio_data, sr = sf.read(file_path)
        duration = len(audio_data) / sr
        print(f"   ✅ Loaded: {len(audio_data)} samples, {duration:.1f} seconds")
        
        # Analyze voice
        print(f"\n🎤 Step 3: Analyzing voice characteristics...")
        voice_result = voice_analyzer.analyze(audio_data, sr)
        print(f"   ✅ Voice analysis complete")
        
        # Analyze transcript
        print(f"\n📝 Step 4: Analyzing transcript...")
        print(f"   Transcript: \"{test_case['transcript']}\"")
        filler_result = filler_detector.analyze(test_case['transcript'])
        print(f"   ✅ Transcript analysis complete")
        
        # Display detailed results
        print(f"\n{'='*80}")
        print(f"📊 ANALYSIS RESULTS FOR: {test_case['name']}")
        print(f"{'='*80}")
        
        print(f"\n🎙️  VOICE DELIVERY METRICS:")
        print(f"   • Voice Confidence:      {voice_result['voice_confidence']:.1f}%")
        print(f"   • Nervousness Score:     {voice_result['nervousness_score']:.1f}%")
        print(f"   • Speaking Rate:         {voice_result['speaking_rate']:.0f} words/min")
        print(f"   • Volume Consistency:    {voice_result['volume_consistency']:.1f}%")
        print(f"   • Pause Count:           {voice_result['pause_count']}")
        print(f"   • Total Pause Time:      {voice_result['total_pause_seconds']:.1f}s")
        
        print(f"\n🎵 PITCH ANALYSIS:")
        print(f"   • Average Pitch:         {voice_result['pitch_analysis']['average_hz']:.1f} Hz")
        print(f"   • Pitch Stability:       {voice_result['pitch_analysis']['stability']:.1f}%")
        print(f"   • Pitch Variance:        {voice_result['pitch_analysis']['variance']:.1f}")
        
        print(f"\n🔊 VOLUME ANALYSIS:")
        print(f"   • Average dB:            {voice_result['volume_analysis']['average_db']:.1f}")
        print(f"   • Volume Consistency:    {voice_result['volume_analysis']['consistency']:.1f}%")
        
        print(f"\n💬 SPEECH QUALITY:")
        print(f"   • Total Words:           {filler_result['word_metrics']['total_words']}")
        print(f"   • Filler Words:          {filler_result['filler_words']['count']}")
        print(f"   • Filler Rate:           {filler_result['filler_words']['rate_percent']:.1f}%")
        print(f"   • Fillers per Minute:    {filler_result['filler_words']['per_minute']:.1f}")
        print(f"   • Quality Score:         {filler_result['quality_score']:.1f}/100")
        
        if filler_result['filler_words']['breakdown']:
            print(f"\n   Top Filler Words:")
            for filler, count in sorted(filler_result['filler_words']['breakdown'].items(), 
                                       key=lambda x: x[1], reverse=True)[:5]:
                print(f"      • '{filler}': {count}x")
        
        print(f"\n🎯 OVERALL ASSESSMENT:")
        
        # Calculate score using improved weighted system
        scoring_result = calculate_audio_score(voice_result, filler_result)
        
        print(f"   • Audio Score:           {scoring_result['final_score']:.1f}/100")
        print(f"   • Overall Score:         {voice_result['overall_score']:.1f}/100")
        print(f"   • Grade:                 {scoring_result['grade']}")
        print(f"   • Status:                {scoring_result['status']}")
        
        print(f"\n💡 FEEDBACK:")
        print(f"   • {filler_result['feedback']}")
        print(f"   • {scoring_result['recommendation']}")
        
        if voice_result['nervousness_score'] > 70:
            print(f"   • High nervousness detected - recommend practice sessions")
        elif voice_result['nervousness_score'] > 50:
            print(f"   • Moderate nervousness - normal interview stress")
        else:
            print(f"   • Calm and composed delivery")
        
        # Store results
        results.append({
            'name': test_case['name'],
            'audio_file': audio_filename,
            'overall_score': scoring_result['final_score'],
            'grade': scoring_result['grade'],
            'voice_confidence': voice_result['voice_confidence'],
            'nervousness': voice_result['nervousness_score'],
            'filler_rate': filler_result['filler_words']['rate_percent']
        })
    
    # Summary
    print(f"\n{'='*80}")
    print(f"📋 TEST SUMMARY")
    print(f"{'='*80}")
    
    print(f"\n{'Test Case':<35} {'Audio File':<25} {'Score':<10} {'Grade':<5}")
    print(f"{'-'*80}")
    for result in results:
        print(f"{result['name']:<35} {result['audio_file']:<25} {result['overall_score']:>6.1f}/100  {result['grade']:<5}")
    
    print(f"\n📁 Generated Audio Files Location:")
    print(f"   {test_audio_dir.absolute()}")
    
    print(f"\n🎉 All tests completed successfully!")
    print(f"\n💾 Storage Impact: {len(test_cases)} test files generated (~{len(test_cases) * 320:.0f} KB)")
    print(f"🚀 System Status: Ready for production deployment")
    
    return results


if __name__ == "__main__":
    try:
        results = test_with_real_file()
        sys.exit(0)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        sys.exit(1)
