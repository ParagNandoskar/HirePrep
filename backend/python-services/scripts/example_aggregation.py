#!/usr/bin/env python3
"""
Example: How to aggregate Video + Audio + Answer data for final report

ARCHITECTURE:
1. Video Analysis (9.3 MB models): Emotion detection via DeepFace
2. Audio Analysis (0 MB): Signal processing for voice metrics
3. Answer Evaluation (Gemini API): Content accuracy & relevance

FINAL REPORT COMBINES:
- Emotional state (from video)
- Voice confidence & nervousness (from audio)
- Technical correctness (from Gemini API)

Storage Required:
- Video Models: 9.3 MB (MediaPipe + DeepFace)
- Audio Models: 0 MB (signal processing only)
- Answer Evaluation: 0 MB (Gemini API)
- Total: 9.3 MB ✅ Deployment-ready!
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.interview_aggregator import get_aggregator


def example_aggregation():
    """Example of aggregating multimodal interview data"""
    
    # Get aggregator instance
    aggregator = get_aggregator()
    
    # Example 1: Good performance
    print("="*60)
    print("EXAMPLE 1: Strong Candidate")
    print("="*60)
    
    # From Video Analysis (DeepFace + MediaPipe)
    video_data = {
        'dominant_emotion': 'happy',
        'emotion_confidence': 0.85,
        'emotion_distribution': {
            'happy': 0.60,
            'neutral': 0.30,
            'surprised': 0.10
        }
    }
    
    # From Audio Analysis (Signal Processing - librosa)
    audio_data = {
        'voice_confidence': 82,
        'speaking_rate': 148,
        'volume_consistency': 85,
        'nervousness_score': 18,
        'pause_count': 3,
        'total_pause_seconds': 1.5,
        'filler_words': {
            'count': 2,
            'unique_fillers': ['um', 'uh'],
            'rate_percent': 1.5
        }
    }
    
    # From Gemini API (Answer Correctness Evaluation)
    answer_data = {
        'total_questions': 5,
        'correct_answers': 4,
        'accuracy': 80.0,
        'technical_score': 82,
        'gemini_evaluation': {
            'relevance_score': 85,
            'depth_score': 78,
            'clarity_score': 80
        }
    }
    
    result = aggregator.aggregate(video_data, audio_data, answer_data)
    
    print(f"\nOverall Score: {result['overall_score']}/100")
    print(f"Grade: {result['grade']}")
    print(f"\nComponent Scores:")
    for component, score in result['component_scores'].items():
        print(f"  {component}: {score}/100")
    
    print(f"\nInterview Readiness:")
    readiness = result['interview_readiness']
    print(f"  Ready: {readiness['ready_for_interview']}")
    print(f"  Confidence: {readiness['confidence_level']}")
    print(f"  Success Rate: {readiness['estimated_success_rate']}")
    
    print(f"\nStrengths:")
    for strength in result['feedback']['strengths']:
        print(f"  ✅ {strength}")
    
    print(f"\nAreas for Improvement:")
    for improvement in result['feedback']['areas_for_improvement']:
        print(f"  ⚠️  {improvement}")
    
    print(f"\nRecommendations:")
    for rec in result['recommendations']:
        print(f"  {rec}")
    
    # Example 2: Nervous candidate
    print("\n\n" + "="*60)
    print("EXAMPLE 2: Nervous Candidate")
    print("="*60)
    
    # From Video Analysis (DeepFace sees fear/nervousness)
    video_data2 = {
        'dominant_emotion': 'fear',
        'emotion_confidence': 0.72,
        'emotion_distribution': {
            'fear': 0.45,
            'neutral': 0.30,
            'sad': 0.15,
            'surprised': 0.10
        }
    }
    
    # From Audio Analysis (High nervousness indicators)
    audio_data2 = {
        'voice_confidence': 58,
        'speaking_rate': 165,  # Too fast
        'volume_consistency': 65,
        'nervousness_score': 48,  # High nervousness
        'pause_count': 8,
        'total_pause_seconds': 4.2,
        'filler_words': {
            'count': 12,  # Too many
            'unique_fillers': ['um', 'uh', 'like', 'you know'],
            'rate_percent': 5.8
        }
    }
    
    # From Gemini API (Lower scores due to incomplete answers)
    answer_data2 = {
        'total_questions': 5,
        'correct_answers': 3,
        'accuracy': 60.0,
        'technical_score': 62,
        'gemini_evaluation': {
            'relevance_score': 65,
            'depth_score': 58,
            'clarity_score': 60
        }
    }
    
    result2 = aggregator.aggregate(video_data2, audio_data2, answer_data2)
    
    print(f"\nOverall Score: {result2['overall_score']}/100")
    print(f"Grade: {result2['grade']}")
    print(f"\nComponent Scores:")
    for component, score in result2['component_scores'].items():
        print(f"  {component}: {score}/100")
    
    print(f"\nEmotion Analysis:")
    print(f"  Dominant: {result2['emotion_analysis']['dominant_emotion']}")
    print(f"  Stress Level: {result2['emotion_analysis']['stress_level']:.1f}/100")
    
    print(f"\nVoice Analysis:")
    print(f"  Confidence: {result2['voice_analysis']['confidence']:.1f}/100")
    print(f"  Nervousness: {result2['voice_analysis']['nervousness']:.1f}/100")
    print(f"  Filler Words: {result2['voice_analysis']['filler_word_count']}")
    
    print(f"\nInterview Readiness:")
    readiness2 = result2['interview_readiness']
    print(f"  Ready: {readiness2['ready_for_interview']}")
    print(f"  Confidence: {readiness2['confidence_level']}")
    print(f"  Practice Sessions: {readiness2['practice_sessions_recommended']}")
    
    print(f"\nRecommendations:")
    for rec in result2['recommendations'][:5]:  # Show first 5
        print(f"  {rec}")
    
    print("\n" + "="*60)
    print("Integration Complete! 🎉")
    print("="*60)
    print("\nHow to use in your application:")
    print("1. Frontend sends video frames → /analyze-video endpoint")
    print("2. Frontend sends audio + transcript → /analyze-audio endpoint")
    print("3. Frontend sends answer + question → Gemini API for evaluation")
    print("4. Backend calls aggregator.aggregate(video, audio, gemini_scores)")
    print("5. Display comprehensive interview report to user!")
    print("\n📊 Data Flow:")
    print("  Browser → Video (DeepFace emotions)")
    print("  Browser → Audio (Voice metrics)")
    print("  Browser → Gemini API (Answer correctness)")
    print("  Backend → Aggregator (Combines all 3)")
    print("  Backend → User (Final report)")
    print("\n💾 Storage Requirements:")
    print("  Video Models: 9.3 MB")
    print("  Audio Models: 0 MB (signal processing)")
    print("  Gemini API: 0 MB (cloud service)")
    print("  Total: 9.3 MB ✅ Perfect for deployment!")
    print("="*60)


if __name__ == "__main__":
    example_aggregation()
