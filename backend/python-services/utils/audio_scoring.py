#!/usr/bin/env python3
"""
Improved Audio Scoring Utility
Provides weighted multi-factor scoring for voice analysis
"""

from typing import Dict, Optional


def calculate_audio_score(voice_result: Dict, filler_result: Optional[Dict] = None) -> Dict:
    """
    Calculate comprehensive audio score using weighted multi-factor system (MORE LENIENT)
    
    Components (0-100):
    1. Voice Delivery (45%):  ← Increased from 40%
       - Voice Confidence (50%)
       - Volume Consistency (30%)
       - Pitch Stability (20%)
    
    2. Speech Quality (35%):  ← Increased from 30%
       - Based on filler word rate
       - Default 75 if no transcript
    
    3. Composure (20%):  ← Reduced from 30%
       - Calmness (100 - nervousness_score)
    
    Args:
        voice_result: Voice analysis results from VoiceAnalyzer
        filler_result: Optional filler analysis from FillerWordDetector
    
    Returns:
        Dictionary with final score, grade, and detailed breakdown
    """
    
    # Component 1: Voice Delivery (45%) - INCREASED WEIGHT
    voice_confidence = voice_result['voice_confidence']
    volume_consistency = voice_result['volume_consistency']
    pitch_stability = voice_result['pitch_analysis']['stability']
    
    voice_delivery_score = (
        voice_confidence * 0.50 +
        volume_consistency * 0.30 +
        pitch_stability * 0.20
    )
    
    # Component 2: Speech Quality (35%) - INCREASED WEIGHT
    if filler_result:
        filler_rate = filler_result['filler_words']['rate_percent']
        # 1.5 points penalty per 1% filler rate (MORE LENIENT - was 2)
        speech_quality_score = max(0, 100 - (filler_rate * 1.5))
    else:
        speech_quality_score = 75  # Default when no transcript
    
    # Component 3: Composure (20%) - REDUCED WEIGHT
    nervousness_score = voice_result['nervousness_score']
    composure_score = 100 - nervousness_score
    
    # Final weighted score
    final_score = (
        voice_delivery_score * 0.45 +  # Increased from 0.40
        speech_quality_score * 0.35 +  # Increased from 0.30
        composure_score * 0.20          # Reduced from 0.30
    )
    
    # Determine grade (MORE LENIENT SCALE)
    if final_score >= 88:
        grade = "A+"
    elif final_score >= 83:
        grade = "A"
    elif final_score >= 78:
        grade = "A-"
    elif final_score >= 73:
        grade = "B+"
    elif final_score >= 68:
        grade = "B"
    elif final_score >= 63:
        grade = "B-"
    elif final_score >= 58:
        grade = "C+"
    elif final_score >= 53:
        grade = "C"
    elif final_score >= 48:
        grade = "C-"
    elif final_score >= 43:
        grade = "D+"
    elif final_score >= 38:
        grade = "D"
    else:
        grade = "F"
    
    # Status based on grade (MORE LENIENT)
    if final_score >= 78:
        status = "✅ Excellent"
        recommendation = "Strong performance - ready for interviews"
    elif final_score >= 68:
        status = "✅ Very Good"
        recommendation = "Good performance - minor improvements suggested"
    elif final_score >= 58:
        status = "✅ Good"
        recommendation = "Solid performance - some areas for improvement"
    elif final_score >= 48:
        status = "⚠️  Fair"
        recommendation = "Acceptable - practice to improve confidence"
    elif final_score >= 38:
        status = "⚠️  Needs Work"
        recommendation = "Needs improvement - focus on key areas"
    else:
        status = "❌ Poor"
        recommendation = "Significant practice needed - consider coaching"
    
    return {
        'final_score': round(final_score, 1),
        'grade': grade,
        'status': status,
        'recommendation': recommendation,
        'breakdown': {
            'voice_delivery': {
                'score': round(voice_delivery_score, 1),
                'weight': 45,  # Updated from 40
                'contribution': round(voice_delivery_score * 0.45, 1),  # Updated
                'components': {
                    'voice_confidence': voice_confidence,
                    'volume_consistency': volume_consistency,
                    'pitch_stability': pitch_stability
                }
            },
            'speech_quality': {
                'score': round(speech_quality_score, 1),
                'weight': 35,  # Updated from 30
                'contribution': round(speech_quality_score * 0.35, 1),  # Updated
                'filler_rate': filler_result['filler_words']['rate_percent'] if filler_result else None
            },
            'composure': {
                'score': round(composure_score, 1),
                'weight': 20,  # Updated from 30
                'contribution': round(composure_score * 0.20, 1),  # Updated
                'nervousness': nervousness_score
            }
        }
    }


def print_score_breakdown(scoring_result: Dict, show_details: bool = True):
    """
    Print formatted score breakdown
    
    Args:
        scoring_result: Result from calculate_audio_score()
        show_details: Whether to show detailed component breakdown
    """
    print(f"\n{'='*80}")
    print(f"🎯 AUDIO SCORE: {scoring_result['final_score']}/100 (Grade: {scoring_result['grade']})")
    print(f"{'='*80}")
    
    if show_details:
        bd = scoring_result['breakdown']
        
        print(f"\n📊 SCORE BREAKDOWN:")
        print(f"\n1️⃣  Voice Delivery ({bd['voice_delivery']['weight']}% weight) = {bd['voice_delivery']['score']:.1f}/100")
        print(f"   → Contributes {bd['voice_delivery']['contribution']:.1f} points")
        print(f"   • Voice Confidence:   {bd['voice_delivery']['components']['voice_confidence']:.1f}% (50%)")
        print(f"   • Volume Consistency: {bd['voice_delivery']['components']['volume_consistency']:.1f}% (30%)")
        print(f"   • Pitch Stability:    {bd['voice_delivery']['components']['pitch_stability']:.1f}% (20%)")
        
        print(f"\n2️⃣  Speech Quality ({bd['speech_quality']['weight']}% weight) = {bd['speech_quality']['score']:.1f}/100")
        print(f"   → Contributes {bd['speech_quality']['contribution']:.1f} points")
        if bd['speech_quality']['filler_rate'] is not None:
            print(f"   • Filler Rate: {bd['speech_quality']['filler_rate']:.1f}%")
        else:
            print(f"   • No transcript provided (default score)")
        
        print(f"\n3️⃣  Composure ({bd['composure']['weight']}% weight) = {bd['composure']['score']:.1f}/100")
        print(f"   → Contributes {bd['composure']['contribution']:.1f} points")
        print(f"   • Nervousness: {bd['composure']['nervousness']:.1f}%")
        print(f"   • Calmness: {bd['composure']['score']:.1f}%")
    
    print(f"\n💡 STATUS: {scoring_result['status']}")
    print(f"📝 RECOMMENDATION: {scoring_result['recommendation']}")
    print(f"{'='*80}\n")
