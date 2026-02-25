#!/usr/bin/env python3
"""
Interview Analysis Aggregator
Combines video emotions + audio metrics + answer correctness for final report.

Total Storage Required: 9.3 MB (Video models only)
- Video: MediaPipe (3.6MB) + DeepFace (5.7MB) = 9.3MB
- Audio: 0 MB (signal processing only)
"""

from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class InterviewAggregator:
    """
    Aggregate multimodal data for comprehensive interview assessment
    
    Inputs:
    1. Video Analysis: Emotions from DeepFace (7 emotions)
    2. Audio Metrics: Voice confidence, pace, nervousness
    3. Answer Correctness: Technical accuracy scores
    """
    
    # Emotion mapping from video
    EMOTION_WEIGHTS = {
        'happy': {'confidence': 1.2, 'stress': -0.5},
        'neutral': {'confidence': 1.0, 'stress': 0.0},
        'surprised': {'confidence': 0.9, 'stress': 0.3},
        'sad': {'confidence': 0.5, 'stress': 0.8},
        'angry': {'confidence': 0.4, 'stress': 1.0},
        'fear': {'confidence': 0.3, 'stress': 1.2},
        'disgust': {'confidence': 0.6, 'stress': 0.7}
    }
    
    def __init__(self):
        logger.info("✅ InterviewAggregator initialized")
    
    def aggregate(
        self,
        video_emotions: Dict,
        audio_metrics: Dict,
        answer_correctness: Dict
    ) -> Dict:
        """
        Aggregate all analysis data into comprehensive report
        
        Args:
            video_emotions: {
                'dominant_emotion': 'happy',
                'emotion_confidence': 0.85,
                'emotion_timeline': [...],
                'emotion_distribution': {'happy': 0.6, 'neutral': 0.3, ...}
            }
            audio_metrics: {
                'voice_confidence': 78,
                'speaking_rate': 145,
                'nervousness_score': 22,
                'filler_words': {...}
            }
            answer_correctness: {
                'total_questions': 5,
                'correct_answers': 4,
                'accuracy': 80.0,
                'technical_score': 82
            }
        
        Returns:
            Comprehensive interview assessment
        """
        
        # 1. Extract emotion insights from video
        emotion_score = self._score_emotions(video_emotions)
        
        # 2. Extract audio performance
        audio_score = self._score_audio(audio_metrics)
        
        # 3. Technical correctness
        technical_score = answer_correctness.get('technical_score', 0)
        
        # 4. Calculate composite scores
        overall_score = self._calculate_overall(
            emotion_score,
            audio_score,
            technical_score,
            audio_metrics
        )
        
        # 5. Generate feedback
        feedback = self._generate_feedback(
            video_emotions,
            audio_metrics,
            answer_correctness,
            overall_score
        )
        
        # 6. Grade and recommendations
        grade = self._assign_grade(overall_score)
        recommendations = self._generate_recommendations(
            video_emotions,
            audio_metrics,
            answer_correctness
        )
        
        return {
            'overall_score': round(overall_score, 1),
            'grade': grade,
            
            # Component scores
            'component_scores': {
                'emotional_composure': round(emotion_score, 1),
                'voice_delivery': round(audio_score, 1),
                'technical_accuracy': round(technical_score, 1)
            },
            
            # Detailed breakdown
            'emotion_analysis': {
                'dominant_emotion': video_emotions.get('dominant_emotion', 'neutral'),
                'emotion_stability': self._calculate_emotion_stability(video_emotions),
                'confidence_indicator': video_emotions.get('emotion_confidence', 0),
                'stress_level': self._calculate_stress_level(video_emotions)
            },
            
            'voice_analysis': {
                'confidence': audio_metrics.get('voice_confidence', 0),
                'clarity': audio_metrics.get('volume_consistency', 0),
                'pace': audio_metrics.get('speaking_rate', 0),
                'nervousness': audio_metrics.get('nervousness_score', 0),
                'filler_word_count': audio_metrics.get('filler_words', {}).get('count', 0)
            },
            
            'technical_performance': {
                'accuracy': answer_correctness.get('accuracy', 0),
                'questions_answered': answer_correctness.get('total_questions', 0),
                'correct_answers': answer_correctness.get('correct_answers', 0)
            },
            
            # Feedback and recommendations
            'feedback': feedback,
            'recommendations': recommendations,
            
            # Interview readiness
            'interview_readiness': self._assess_readiness(overall_score, feedback)
        }
    
    def _score_emotions(self, video_emotions: Dict) -> float:
        """Score emotional composure from video analysis"""
        dominant = video_emotions.get('dominant_emotion', 'neutral').lower()
        confidence = video_emotions.get('emotion_confidence', 0.5)
        distribution = video_emotions.get('emotion_distribution', {})
        
        # Base score from dominant emotion
        base_score = 75.0  # Neutral baseline
        
        if dominant in self.EMOTION_WEIGHTS:
            emotion_factor = self.EMOTION_WEIGHTS[dominant]['confidence']
            base_score = 75 * emotion_factor
        
        # Adjust for emotion stability (less variation = better)
        if distribution:
            variation = len([v for v in distribution.values() if v > 0.1])
            stability_bonus = max(0, (4 - variation) * 5)
            base_score += stability_bonus
        
        # Confidence multiplier
        base_score *= (0.7 + confidence * 0.3)
        
        return max(0, min(100, base_score))
    
    def _score_audio(self, audio_metrics: Dict) -> float:
        """Score voice delivery from audio metrics"""
        voice_conf = audio_metrics.get('voice_confidence', 70)
        nervousness = audio_metrics.get('nervousness_score', 30)
        volume_consistency = audio_metrics.get('volume_consistency', 70)
        speaking_rate = audio_metrics.get('speaking_rate', 140)
        
        # Ideal speaking rate: 140-160 WPM
        rate_score = 100 - abs(speaking_rate - 150) * 0.5
        rate_score = max(0, min(100, rate_score))
        
        # Composite audio score
        audio_score = (
            voice_conf * 0.35 +
            (100 - nervousness) * 0.25 +
            volume_consistency * 0.20 +
            rate_score * 0.20
        )
        
        return audio_score
    
    def _calculate_overall(
        self,
        emotion_score: float,
        audio_score: float,
        technical_score: float,
        audio_metrics: Dict
    ) -> float:
        """Calculate weighted overall score"""
        # Weights: Technical > Audio > Emotional
        overall = (
            technical_score * 0.45 +    # Most important
            audio_score * 0.30 +         # Delivery matters
            emotion_score * 0.25         # Composure matters
        )
        
        # Penalties
        filler_count = audio_metrics.get('filler_words', {}).get('count', 0)
        if filler_count > 5:
            overall -= (filler_count - 5) * 0.5
        
        return max(0, min(100, overall))
    
    def _calculate_emotion_stability(self, video_emotions: Dict) -> float:
        """Calculate how stable emotions were during interview"""
        distribution = video_emotions.get('emotion_distribution', {})
        if not distribution:
            return 75.0
        
        # Stability = concentration in fewer emotions
        dominant_ratio = max(distribution.values()) if distribution else 0
        stability = dominant_ratio * 100
        
        return min(100, stability)
    
    def _calculate_stress_level(self, video_emotions: Dict) -> float:
        """Calculate stress level from emotions"""
        distribution = video_emotions.get('emotion_distribution', {})
        if not distribution:
            return 25.0
        
        stress = 0
        for emotion, ratio in distribution.items():
            if emotion.lower() in self.EMOTION_WEIGHTS:
                stress += ratio * self.EMOTION_WEIGHTS[emotion.lower()]['stress'] * 100
        
        return max(0, min(100, stress))
    
    def _generate_feedback(
        self,
        video_emotions: Dict,
        audio_metrics: Dict,
        answer_correctness: Dict,
        overall_score: float
    ) -> Dict:
        """Generate detailed feedback"""
        strengths = []
        improvements = []
        
        # Technical feedback
        accuracy = answer_correctness.get('accuracy', 0)
        if accuracy >= 80:
            strengths.append("Strong technical knowledge")
        elif accuracy < 60:
            improvements.append("Review technical concepts more thoroughly")
        
        # Voice feedback
        voice_conf = audio_metrics.get('voice_confidence', 0)
        if voice_conf >= 75:
            strengths.append("Confident voice delivery")
        else:
            improvements.append("Work on voice confidence and clarity")
        
        # Nervousness
        nervousness = audio_metrics.get('nervousness_score', 0)
        if nervousness > 40:
            improvements.append("Practice relaxation techniques to reduce nervousness")
        
        # Filler words
        filler_count = audio_metrics.get('filler_words', {}).get('count', 0)
        if filler_count > 8:
            improvements.append(f"Reduce filler words (detected {filler_count} instances)")
        elif filler_count <= 3:
            strengths.append("Clear articulation with minimal filler words")
        
        # Emotional feedback
        dominant = video_emotions.get('dominant_emotion', '').lower()
        if dominant in ['happy', 'neutral']:
            strengths.append("Maintained positive composure")
        elif dominant in ['fear', 'sad', 'angry']:
            improvements.append("Work on maintaining emotional composure under pressure")
        
        return {
            'strengths': strengths,
            'areas_for_improvement': improvements,
            'overall_assessment': self._get_overall_assessment(overall_score)
        }
    
    def _get_overall_assessment(self, score: float) -> str:
        """Get text assessment based on score"""
        if score >= 90:
            return "Outstanding performance! Interview-ready."
        elif score >= 80:
            return "Strong performance with minor areas to polish."
        elif score >= 70:
            return "Good performance, but practice recommended."
        elif score >= 60:
            return "Fair performance, significant practice needed."
        else:
            return "Needs improvement in multiple areas."
    
    def _assign_grade(self, score: float) -> str:
        """Assign letter grade"""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "A-"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "B-"
        elif score >= 65:
            return "C+"
        elif score >= 60:
            return "C"
        else:
            return "D"
    
    def _generate_recommendations(
        self,
        video_emotions: Dict,
        audio_metrics: Dict,
        answer_correctness: Dict
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Technical recommendations
        accuracy = answer_correctness.get('accuracy', 0)
        if accuracy < 70:
            recommendations.append("📚 Study core technical concepts more thoroughly")
            recommendations.append("💻 Practice coding problems daily")
        
        # Voice recommendations
        speaking_rate = audio_metrics.get('speaking_rate', 140)
        if speaking_rate > 180:
            recommendations.append("🗣️ Slow down your speaking pace for better clarity")
        elif speaking_rate < 120:
            recommendations.append("⚡ Increase speaking pace to sound more confident")
        
        # Nervousness recommendations
        nervousness = audio_metrics.get('nervousness_score', 0)
        if nervousness > 35:
            recommendations.append("🧘 Practice deep breathing exercises before interviews")
            recommendations.append("🎤 Record yourself practicing to build confidence")
        
        # Filler word recommendations
        filler_count = audio_metrics.get('filler_words', {}).get('count', 0)
        if filler_count > 5:
            recommendations.append("💬 Pause instead of using filler words")
            recommendations.append("🎯 Practice speaking deliberately and slowly")
        
        # Emotional recommendations
        stress = self._calculate_stress_level(video_emotions)
        if stress > 50:
            recommendations.append("😌 Work on stress management techniques")
            recommendations.append("🎭 Practice mock interviews to reduce anxiety")
        
        return recommendations
    
    def _assess_readiness(self, overall_score: float, feedback: Dict) -> Dict:
        """Assess interview readiness"""
        ready = overall_score >= 75
        confidence_level = "high" if overall_score >= 85 else "medium" if overall_score >= 70 else "low"
        
        return {
            'ready_for_interview': ready,
            'confidence_level': confidence_level,
            'estimated_success_rate': f"{min(100, overall_score + 5):.0f}%",
            'practice_sessions_recommended': max(0, int((85 - overall_score) / 5)) if overall_score < 85 else 0
        }


# Singleton instance
_aggregator = None

def get_aggregator():
    """Get singleton InterviewAggregator instance"""
    global _aggregator
    if _aggregator is None:
        _aggregator = InterviewAggregator()
    return _aggregator
