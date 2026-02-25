#!/usr/bin/env python3
"""
Improved Audio Scoring System with Proper Weights
Shows calculation breakdown for transparency
"""

def calculate_audio_score_v2(voice_result: dict, filler_result: dict = None, show_breakdown: bool = True):
    """
    Calculate audio score using balanced weights across multiple factors
    
    Components (all 0-100):
    1. Voice Delivery (40%):
       - Voice Confidence (50%)
       - Volume Consistency (30%)
       - Pitch Stability (20%)
    
    2. Speech Quality (30%):
       - Filler Word Score (100 - filler_rate)
       - Or default 75 if no transcript
    
    3. Composure (30%):
       - Calmness (100 - nervousness_score)
    
    Returns score 0-100 with detailed breakdown
    """
    
    # Component 1: Voice Delivery (40%)
    voice_confidence = voice_result['voice_confidence']
    volume_consistency = voice_result['volume_consistency']
    pitch_stability = voice_result['pitch_analysis']['stability']
    
    voice_delivery_score = (
        voice_confidence * 0.50 +
        volume_consistency * 0.30 +
        pitch_stability * 0.20
    )
    
    # Component 2: Speech Quality (30%)
    if filler_result:
        filler_rate = filler_result['filler_words']['rate_percent']
        speech_quality_score = max(0, 100 - (filler_rate * 2))  # 2 points penalty per 1% fillers
    else:
        speech_quality_score = 75  # Default if no transcript
    
    # Component 3: Composure (30%)
    nervousness_score = voice_result['nervousness_score']
    composure_score = 100 - nervousness_score
    
    # Final weighted score
    final_score = (
        voice_delivery_score * 0.40 +
        speech_quality_score * 0.30 +
        composure_score * 0.30
    )
    
    # Determine grade
    if final_score >= 90:
        grade = "A+"
    elif final_score >= 85:
        grade = "A"
    elif final_score >= 80:
        grade = "A-"
    elif final_score >= 75:
        grade = "B+"
    elif final_score >= 70:
        grade = "B"
    elif final_score >= 65:
        grade = "B-"
    elif final_score >= 60:
        grade = "C+"
    elif final_score >= 55:
        grade = "C"
    elif final_score >= 50:
        grade = "C-"
    else:
        grade = "D/F"
    
    breakdown = {
        'final_score': round(final_score, 1),
        'grade': grade,
        'components': {
            'voice_delivery': {
                'score': round(voice_delivery_score, 1),
                'weight': '40%',
                'contribution': round(voice_delivery_score * 0.40, 1),
                'factors': {
                    'voice_confidence': f"{voice_confidence:.1f}% (50%)",
                    'volume_consistency': f"{volume_consistency:.1f}% (30%)",
                    'pitch_stability': f"{pitch_stability:.1f}% (20%)"
                }
            },
            'speech_quality': {
                'score': round(speech_quality_score, 1),
                'weight': '30%',
                'contribution': round(speech_quality_score * 0.30, 1),
                'factors': {
                    'filler_rate': f"{filler_result['filler_words']['rate_percent']:.1f}%" if filler_result else "N/A"
                }
            },
            'composure': {
                'score': round(composure_score, 1),
                'weight': '30%',
                'contribution': round(composure_score * 0.30, 1),
                'factors': {
                    'nervousness': f"{nervousness_score:.1f}%",
                    'calmness': f"{composure_score:.1f}%"
                }
            }
        }
    }
    
    if show_breakdown:
        print(f"\n{'='*80}")
        print(f"📊 SCORING BREAKDOWN (Weighted System v2.0)")
        print(f"{'='*80}")
        
        print(f"\n1️⃣  VOICE DELIVERY (Weight: 40%)")
        print(f"   • Voice Confidence:    {voice_confidence:>6.1f}% × 50% = {voice_confidence * 0.50:>6.1f}")
        print(f"   • Volume Consistency:  {volume_consistency:>6.1f}% × 30% = {volume_consistency * 0.30:>6.1f}")
        print(f"   • Pitch Stability:     {pitch_stability:>6.1f}% × 20% = {pitch_stability * 0.20:>6.1f}")
        print(f"   • Subtotal:            {voice_delivery_score:>6.1f}/100")
        print(f"   • Contribution:        {voice_delivery_score * 0.40:>6.1f} points")
        
        print(f"\n2️⃣  SPEECH QUALITY (Weight: 30%)")
        if filler_result:
            print(f"   • Filler Rate:         {filler_rate:>6.1f}%")
            print(f"   • Penalty:             {filler_rate * 2:>6.1f} points")
            print(f"   • Speech Score:        {speech_quality_score:>6.1f}/100")
        else:
            print(f"   • No transcript:       Default score")
            print(f"   • Speech Score:        {speech_quality_score:>6.1f}/100")
        print(f"   • Contribution:        {speech_quality_score * 0.30:>6.1f} points")
        
        print(f"\n3️⃣  COMPOSURE (Weight: 30%)")
        print(f"   • Nervousness:         {nervousness_score:>6.1f}%")
        print(f"   • Calmness Score:      {composure_score:>6.1f}/100")
        print(f"   • Contribution:        {composure_score * 0.30:>6.1f} points")
        
        print(f"\n{'─'*80}")
        print(f"FINAL SCORE CALCULATION:")
        print(f"  {voice_delivery_score * 0.40:.1f} (Voice) + {speech_quality_score * 0.30:.1f} (Speech) + {composure_score * 0.30:.1f} (Composure)")
        print(f"  = {final_score:.1f}/100")
        print(f"\n🎯 GRADE: {grade}")
        print(f"{'='*80}\n")
    
    return breakdown


def compare_scoring_systems(voice_result: dict, filler_result: dict = None):
    """Compare old vs new scoring system"""
    
    print(f"\n{'='*80}")
    print(f"⚖️  SCORING SYSTEM COMPARISON")
    print(f"{'='*80}")
    
    # Old system
    voice_confidence = voice_result['voice_confidence']
    nervousness_score = voice_result['nervousness_score']
    
    if filler_result:
        filler_rate = filler_result['filler_words']['rate_percent']
        filler_penalty = min(filler_rate * 3, 30)
    else:
        filler_penalty = 0
    
    nervousness_penalty = nervousness_score * 0.2
    old_score = max(0, min(100, voice_confidence - filler_penalty - nervousness_penalty))
    
    if old_score >= 80:
        old_grade = "A"
    elif old_score >= 70:
        old_grade = "B"
    elif old_score >= 60:
        old_grade = "C"
    elif old_score >= 50:
        old_grade = "D"
    else:
        old_grade = "F"
    
    print(f"\n📉 OLD SYSTEM (Simple Penalty-Based):")
    print(f"   Base:                  {voice_confidence:.1f} (voice confidence only)")
    print(f"   - Filler Penalty:      {filler_penalty:.1f}")
    print(f"   - Nervousness Penalty: {nervousness_penalty:.1f}")
    print(f"   = Final Score:         {old_score:.1f}/100")
    print(f"   = Grade:               {old_grade}")
    print(f"\n   ❌ Problems:")
    print(f"      • Only considers voice confidence")
    print(f"      • Ignores volume consistency, pitch stability")
    print(f"      • Ignores excellent speech quality")
    print(f"      • Double-penalizes nervousness")
    
    # New system
    new_breakdown = calculate_audio_score_v2(voice_result, filler_result, show_breakdown=False)
    new_score = new_breakdown['final_score']
    new_grade = new_breakdown['grade']
    
    print(f"\n📈 NEW SYSTEM (Weighted Multi-Factor):")
    print(f"   Voice Delivery (40%):  {new_breakdown['components']['voice_delivery']['score']:.1f} → {new_breakdown['components']['voice_delivery']['contribution']:.1f} pts")
    print(f"   Speech Quality (30%):  {new_breakdown['components']['speech_quality']['score']:.1f} → {new_breakdown['components']['speech_quality']['contribution']:.1f} pts")
    print(f"   Composure (30%):       {new_breakdown['components']['composure']['score']:.1f} → {new_breakdown['components']['composure']['contribution']:.1f} pts")
    print(f"   = Final Score:         {new_score:.1f}/100")
    print(f"   = Grade:               {new_grade}")
    print(f"\n   ✅ Improvements:")
    print(f"      • Balances multiple factors")
    print(f"      • Rewards good volume & pitch")
    print(f"      • Properly weights speech quality")
    print(f"      • Fair composure assessment")
    
    # Comparison
    difference = new_score - old_score
    print(f"\n{'─'*80}")
    print(f"📊 DIFFERENCE: {'+' if difference > 0 else ''}{difference:.1f} points")
    print(f"   Old: {old_score:.1f}/100 ({old_grade}) → New: {new_score:.1f}/100 ({new_grade})")
    print(f"{'='*80}\n")
    
    return {
        'old_score': old_score,
        'old_grade': old_grade,
        'new_score': new_score,
        'new_grade': new_grade,
        'difference': difference
    }


if __name__ == "__main__":
    # Example usage with the user's data
    print("🎯 IMPROVED AUDIO SCORING SYSTEM DEMO")
    print("="*80)
    
    # Sample data from user's test
    voice_result = {
        'voice_confidence': 57.1,
        'nervousness_score': 57.2,
        'speaking_rate': 252,
        'volume_consistency': 81.8,
        'pause_count': 0,
        'total_pause_seconds': 0.0,
        'pitch_analysis': {
            'average_hz': 149.9,
            'stability': 37.2,
            'variance': 38.4
        },
        'volume_analysis': {
            'average_db': -1.4,
            'consistency': 81.8
        },
        'overall_score': 51.7
    }
    
    filler_result = {
        'word_metrics': {
            'total_words': 22,
            'estimated_duration': 8.8
        },
        'filler_words': {
            'count': 0,
            'rate_percent': 0.0,
            'per_minute': 0.0,
            'breakdown': {}
        },
        'quality_score': 100.0,
        'feedback': 'Excellent - very clear and articulate speech'
    }
    
    print("\n📝 Test Case: Strong Candidate")
    print("   Voice Confidence: 57.1%")
    print("   Nervousness: 57.2%")
    print("   Volume Consistency: 81.8%")
    print("   Pitch Stability: 37.2%")
    print("   Filler Rate: 0.0% (perfect speech)")
    
    # Compare systems
    comparison = compare_scoring_systems(voice_result, filler_result)
    
    # Show detailed breakdown
    calculate_audio_score_v2(voice_result, filler_result, show_breakdown=True)
