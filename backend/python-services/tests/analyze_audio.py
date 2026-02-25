#!/usr/bin/env python3
"""
Analyze Any Audio File - Quick Test Script
Usage: python3 analyze_audio.py <audio_file_path> "<transcript>"
"""

import sys
import soundfile as sf
from pathlib import Path

# Add python-services root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.audio_service.analyzers.voice_analyzer import VoiceAnalyzer
from services.audio_service.analyzers.filler_detector import FillerWordDetector
from utils.audio_scoring import calculate_audio_score, print_score_breakdown


def analyze_audio_file(audio_path: str, transcript: str = ""):
    """Analyze an audio file and display results"""
    
    print("\n" + "="*80)
    print(f"🎙️  ANALYZING: {Path(audio_path).name}")
    print("="*80)
    
    # Load audio
    print(f"\n📂 Loading audio file...")
    try:
        audio_data, sample_rate = sf.read(audio_path)
        duration = len(audio_data) / sample_rate
        print(f"   ✅ Loaded: {len(audio_data)} samples")
        print(f"   ✅ Duration: {duration:.2f} seconds")
        print(f"   ✅ Sample Rate: {sample_rate} Hz")
    except Exception as e:
        print(f"   ❌ Error loading audio: {e}")
        return None
    
    # Initialize analyzers
    voice_analyzer = VoiceAnalyzer()
    filler_detector = FillerWordDetector()
    
    # Analyze voice
    print(f"\n🎤 Analyzing voice characteristics...")
    voice_result = voice_analyzer.analyze(audio_data, sample_rate)
    
    # Analyze transcript (if provided)
    filler_result = None
    if transcript:
        print(f"\n📝 Analyzing transcript...")
        print(f"   \"{transcript}\"")
        filler_result = filler_detector.analyze(transcript)
    
    # Display results
    print(f"\n{'='*80}")
    print(f"📊 ANALYSIS RESULTS")
    print(f"{'='*80}")
    
    print(f"\n🎙️  VOICE DELIVERY:")
    print(f"   Confidence:          {voice_result['voice_confidence']:.1f}%")
    print(f"   Nervousness:         {voice_result['nervousness_score']:.1f}%")
    print(f"   Speaking Rate:       {voice_result['speaking_rate']:.0f} wpm")
    print(f"   Pauses:              {voice_result['pause_count']}")
    print(f"   Volume Consistency:  {voice_result['volume_consistency']:.1f}%")
    
    print(f"\n🎵 PITCH:")
    print(f"   Average:             {voice_result['pitch_analysis']['average_hz']:.1f} Hz")
    print(f"   Stability:           {voice_result['pitch_analysis']['stability']:.1f}%")
    
    print(f"\n🔊 VOLUME:")
    print(f"   Average dB:          {voice_result['volume_analysis']['average_db']:.1f}")
    print(f"   Consistency:         {voice_result['volume_analysis']['consistency']:.1f}%")
    
    print(f"\n📈 OVERALL:")
    print(f"   Overall Score:       {voice_result['overall_score']:.1f}/100")
    
    if filler_result:
        print(f"\n💬 SPEECH QUALITY:")
        print(f"   Total Words:         {filler_result['word_metrics']['total_words']}")
        print(f"   Filler Words:        {filler_result['filler_words']['count']} ({filler_result['filler_words']['rate_percent']:.1f}%)")
        print(f"   Quality Score:       {filler_result['quality_score']:.1f}/100")
        print(f"   Feedback:            {filler_result['feedback']}")
        
        if filler_result['filler_words']['breakdown']:
            print(f"\n   Top Fillers:")
            for filler, count in sorted(filler_result['filler_words']['breakdown'].items(), 
                                       key=lambda x: x[1], reverse=True)[:5]:
                print(f"      • '{filler}': {count}x")
    
    # Calculate comprehensive score using improved weighted system
    scoring_result = calculate_audio_score(voice_result, filler_result)
    print_score_breakdown(scoring_result, show_details=True)
    
    print("\n" + "="*80 + "\n")
    
    return {
        'voice_result': voice_result,
        'filler_result': filler_result
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\n❌ Usage: python3 analyze_audio.py <audio_file> [<transcript>]")
        print("\nExample:")
        print('  python3 analyze_audio.py tests/test_audio_files/test_interview_answer.wav "Um, my experience is good..."')
        print('\nOr test without transcript (voice analysis only):')
        print('  python3 analyze_audio.py tests/test_audio_files/test_strong_candidate.wav')
        sys.exit(1)
    
    audio_file = sys.argv[1]
    transcript = sys.argv[2] if len(sys.argv) > 2 else ""
    
    if not Path(audio_file).exists():
        print(f"\n❌ Error: File not found: {audio_file}")
        sys.exit(1)
    
    analyze_audio_file(audio_file, transcript)
