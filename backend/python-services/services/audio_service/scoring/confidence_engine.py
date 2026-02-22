#!/usr/bin/env python3
"""
Confidence Scoring Engine
Combines multiple model outputs into unified behavioral confidence score
"""

import logging
from typing import Dict
import numpy as np

logger = logging.getLogger(__name__)


class ConfidenceEngine:
    """
    Unified confidence scoring engine for interview audio analysis
    
    Combines:
    - Emotion stability (Wav2Vec2)
    - Speech fluency (Whisper)
    - Pause behavior (Whisper)
    - Sentiment polarity (DistilBERT)
    
    Formula:
    confidence = 
        0.35 * emotion_confidence +
        0.25 * speech_fluency +
        0.20 * pause_behavior +
        0.20 * sentiment_score
    """
    
    def __init__(self):
        """Initialize confidence engine"""
        # Weights for confidence calculation
        self.weights = {
            'emotion': 0.35,      # Vocal emotion stability
            'fluency': 0.25,      # Speech fluency (rate, hesitations)
            'pause': 0.20,        # Pause behavior
            'sentiment': 0.20     # Text sentiment
        }
        
        logger.info("🧠 Confidence Engine initialized")
        logger.info(f"   Weights: {self.weights}")
    
    def calculate_confidence(
        self,
        emotion_data: Dict,
        transcription_data: Dict,
        sentiment_data: Dict
    ) -> Dict:
        """
        Calculate unified confidence score
        
        Args:
            emotion_data: Output from Wav2Vec2EmotionModel
            transcription_data: Output from WhisperTranscriber
            sentiment_data: Output from SentimentAnalyzer
        
        Returns:
            {
                'confidence_score': float (0-100),
                'breakdown': dict,
                'grade': str,
                'interpretation': str
            }
        """
        try:
            logger.info("\n" + "="*60)
            logger.info("🧠 Calculating Unified Confidence Score")
            logger.info("="*60)
            
            # 1. Emotion Confidence (0-100)
            emotion_confidence = self._calculate_emotion_confidence(emotion_data)
            
            # 2. Speech Fluency (0-100)
            speech_fluency = transcription_data.get('fluency_score', 50.0)
            
            # 3. Pause Behavior (0-100)
            pause_behavior = self._calculate_pause_score(transcription_data)
            
            # 4. Sentiment Score (0-100)
            sentiment_score = sentiment_data.get('sentiment_score', 50.0)
            
            # Calculate weighted confidence
            confidence_score = (
                emotion_confidence * self.weights['emotion'] +
                speech_fluency * self.weights['fluency'] +
                pause_behavior * self.weights['pause'] +
                sentiment_score * self.weights['sentiment']
            )
            
            # Ensure 0-100 range
            confidence_score = min(100, max(0, confidence_score))
            
            # Breakdown
            breakdown = {
                'emotion_confidence': float(emotion_confidence),
                'speech_fluency': float(speech_fluency),
                'pause_behavior': float(pause_behavior),
                'sentiment_score': float(sentiment_score)
            }
            
            # Grade and interpretation
            grade = self._get_confidence_grade(confidence_score)
            interpretation = self._get_interpretation(confidence_score, breakdown)
            
            logger.info(f"📊 Component Scores:")
            logger.info(f"   Emotion Confidence: {emotion_confidence:.1f}/100 (weight: {self.weights['emotion']})")
            logger.info(f"   Speech Fluency:     {speech_fluency:.1f}/100 (weight: {self.weights['fluency']})")
            logger.info(f"   Pause Behavior:     {pause_behavior:.1f}/100 (weight: {self.weights['pause']})")
            logger.info(f"   Sentiment Score:    {sentiment_score:.1f}/100 (weight: {self.weights['sentiment']})")
            logger.info(f"\n🎯 Final Confidence Score: {confidence_score:.1f}/100 ({grade})")
            logger.info("="*60 + "\n")
            
            return {
                'confidence_score': float(confidence_score),
                'breakdown': breakdown,
                'grade': grade,
                'interpretation': interpretation,
                'weights': self.weights
            }
            
        except Exception as e:
            logger.error(f"❌ Confidence calculation error: {e}")
            return {
                'confidence_score': 50.0,
                'breakdown': {},
                'grade': 'C',
                'interpretation': 'Unable to calculate confidence',
                'error': str(e)
            }
    
    def _calculate_emotion_confidence(self, emotion_data: Dict) -> float:
        """
        Calculate confidence from emotion data
        
        Factors:
        - Model confidence (how sure the model is)
        - Emotion valence (positive emotions = higher confidence)
        - Emotion appropriateness for interview context
        """
        emotion = emotion_data.get('emotion', 'neutral')
        model_confidence = emotion_data.get('confidence', 0.5)
        
        # Get emotion valence (0.0-1.0)
        valence_map = {
            'happy': 1.0,
            'neutral': 0.8,      # Neutral is good for interviews
            'surprise': 0.6,
            'sad': 0.3,
            'fear': 0.2,
            'angry': 0.1,
            'disgust': 0.1
        }
        valence = valence_map.get(emotion, 0.5)
        
        # Combined score
        # Model confidence: 60%, Emotion valence: 40%
        emotion_score = (model_confidence * 0.6 + valence * 0.4) * 100
        
        return float(emotion_score)
    
    def _calculate_pause_score(self, transcription_data: Dict) -> float:
        """
        Calculate score from pause behavior
        
        Factors:
        - Number of pauses (fewer is better within reason)
        - Average pause duration (shorter is better)
        - Hesitation markers
        
        Returns:
            Score 0-100 (higher = better)
        """
        duration = transcription_data.get('duration_seconds', 0)
        if duration == 0:
            return 50.0
        
        pause_count = transcription_data.get('pause_count', 0)
        avg_pause_duration = transcription_data.get('avg_pause_duration', 0)
        hesitation_count = transcription_data.get('hesitation_count', 0)
        word_count = transcription_data.get('word_count', 0)
        
        # Pause frequency score (optimal: 1-2 pauses per 10 seconds)
        pauses_per_10s = pause_count / (duration / 10) if duration > 0 else 0
        
        if 1 <= pauses_per_10s <= 2:
            pause_freq_score = 100
        elif pauses_per_10s < 1:
            pause_freq_score = 70 + pauses_per_10s * 30  # 70-100
        else:
            pause_freq_score = max(0, 100 - (pauses_per_10s - 2) * 20)  # Decreases
        
        # Pause duration score (shorter is better)
        if avg_pause_duration < 0.5:
            pause_dur_score = 100
        elif avg_pause_duration < 1.0:
            pause_dur_score = 80
        elif avg_pause_duration < 2.0:
            pause_dur_score = 60
        else:
            pause_dur_score = max(0, 60 - (avg_pause_duration - 2) * 15)
        
        # Hesitation score (fewer is better)
        if word_count > 0:
            hesitation_ratio = hesitation_count / word_count
            hesitation_score = max(0, 100 - hesitation_ratio * 300)
        else:
            hesitation_score = 50
        
        # Weighted combination
        pause_score = (
            pause_freq_score * 0.4 +
            pause_dur_score * 0.4 +
            hesitation_score * 0.2
        )
        
        return float(pause_score)
    
    def _get_confidence_grade(self, score: float) -> str:
        """Convert score to letter grade"""
        if score >= 90:
            return 'A+'
        elif score >= 85:
            return 'A'
        elif score >= 80:
            return 'A-'
        elif score >= 75:
            return 'B+'
        elif score >= 70:
            return 'B'
        elif score >= 65:
            return 'B-'
        elif score >= 60:
            return 'C+'
        elif score >= 55:
            return 'C'
        elif score >= 50:
            return 'C-'
        elif score >= 45:
            return 'D+'
        elif score >= 40:
            return 'D'
        else:
            return 'F'
    
    def _get_interpretation(self, score: float, breakdown: Dict) -> str:
        """Generate human-readable interpretation"""
        if score >= 85:
            interpretation = "Excellent confidence. Clear, fluent speech with positive emotional tone."
        elif score >= 70:
            interpretation = "Good confidence. Minor hesitations but overall strong communication."
        elif score >= 55:
            interpretation = "Moderate confidence. Some nervousness detected but acceptable performance."
        elif score >= 40:
            interpretation = "Below average confidence. Noticeable hesitations and uncertainty."
        else:
            interpretation = "Low confidence. Significant communication challenges detected."
        
        # Add specific insights
        insights = []
        
        emotion_conf = breakdown.get('emotion_confidence', 50)
        if emotion_conf < 50:
            insights.append("negative emotional tone")
        
        fluency = breakdown.get('speech_fluency', 50)
        if fluency < 50:
            insights.append("speech fluency issues")
        
        pause = breakdown.get('pause_behavior', 50)
        if pause < 50:
            insights.append("excessive pausing")
        
        sentiment = breakdown.get('sentiment_score', 50)
        if sentiment < 40:
            insights.append("negative sentiment")
        
        if insights:
            interpretation += f" Areas for improvement: {', '.join(insights)}."
        
        return interpretation
    
    def compare_to_baseline(self, current_score: float, baseline_score: float) -> Dict:
        """
        Compare current performance to baseline
        
        Args:
            current_score: Current confidence score
            baseline_score: Baseline/average score
        
        Returns:
            {
                'difference': float,
                'percentage_change': float,
                'performance': str ('better', 'similar', 'worse')
            }
        """
        difference = current_score - baseline_score
        percentage_change = (difference / baseline_score) * 100 if baseline_score > 0 else 0
        
        if abs(difference) < 5:
            performance = 'similar'
        elif difference > 0:
            performance = 'better'
        else:
            performance = 'worse'
        
        return {
            'difference': float(difference),
            'percentage_change': float(percentage_change),
            'performance': performance
        }
    
    def get_recommendations(self, breakdown: Dict) -> list:
        """
        Generate improvement recommendations based on scores
        
        Args:
            breakdown: Component scores dictionary
        
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        emotion_conf = breakdown.get('emotion_confidence', 50)
        fluency = breakdown.get('speech_fluency', 50)
        pause = breakdown.get('pause_behavior', 50)
        sentiment = breakdown.get('sentiment_score', 50)
        
        if emotion_conf < 60:
            recommendations.append("Practice maintaining a calm and positive emotional tone during responses")
        
        if fluency < 60:
            recommendations.append("Work on reducing filler words (um, uh, like) and improving speech clarity")
        
        if pause < 60:
            recommendations.append("Practice reducing long pauses by preparing structured answers beforehand")
        
        if sentiment < 50:
            recommendations.append("Focus on using more positive language and confident expressions")
        
        if not recommendations:
            recommendations.append("Excellent performance! Continue maintaining your current communication style")
        
        return recommendations


# Global instance
_confidence_engine = None

def get_confidence_engine() -> ConfidenceEngine:
    """Get or create global confidence engine instance"""
    global _confidence_engine
    if _confidence_engine is None:
        _confidence_engine = ConfidenceEngine()
    return _confidence_engine
