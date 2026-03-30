#!/usr/bin/env python3
"""
Filler Word Detector
Analyzes transcript for filler words and speech patterns.
No ML models required - pure pattern matching.
"""

import re
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class FillerWordDetector:
    """
    Detect filler words and speech patterns from transcript
    """
    
    # Common filler words and phrases
    FILLER_WORDS = [
        'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean',
        'basically', 'actually', 'literally', 'so', 'well',
        'kind of', 'sort of', 'you see', 'right', 'okay'
    ]
    
    # Repetitive phrases
    REPETITIONS = r'\b(\w+)\s+\1\b'  # Detects repeated words
    
    def __init__(self):
        logger.info("✅ FillerWordDetector initialized (0 MB)")
    
    def analyze(self, transcript: str) -> Dict:
        """
        Analyze transcript for filler words and patterns
        
        Args:
            transcript: Text transcript from browser
        
        Returns:
            Dictionary with filler word analysis
        """
        if not transcript or not transcript.strip():
            return self._get_default_response()
        
        transcript_lower = transcript.lower()
        
        # Count filler words
        filler_counts = {}
        total_fillers = 0
        
        for filler in self.FILLER_WORDS:
            # Use word boundaries for accurate counting
            pattern = r'\b' + re.escape(filler) + r'\b'
            count = len(re.findall(pattern, transcript_lower))
            if count > 0:
                filler_counts[filler] = count
                total_fillers += count
        
        # Count words
        words = transcript.split()
        word_count = len(words)
        
        # Calculate filler rate
        filler_rate = (total_fillers / word_count * 100) if word_count > 0 else 0
        
        # Detect repetitions
        repetitions = re.findall(self.REPETITIONS, transcript_lower)
        repetition_count = len(repetitions)
        
        # Calculate quality score
        quality_score = self._calculate_quality(
            filler_rate, repetition_count, word_count
        )
        
        # Estimate speaking duration (rough)
        # Average speaking rate: 2.5 words per second
        estimated_duration_seconds = word_count / 2.5
        fillers_per_minute = (total_fillers / estimated_duration_seconds * 60) if estimated_duration_seconds > 0 else 0
        
        return {
            'filler_words': {
                'count': total_fillers,
                'unique_fillers': list(filler_counts.keys()),
                'breakdown': filler_counts,
                'rate_percent': round(filler_rate, 2),
                'per_minute': round(fillers_per_minute, 1)
            },
            'repetitions': {
                'count': repetition_count,
                'words': list(set(repetitions)) if repetitions else []
            },
            'word_metrics': {
                'total_words': word_count,
                'estimated_duration': round(estimated_duration_seconds, 1)
            },
            'quality_score': round(quality_score, 1),
            'feedback': self._generate_feedback(filler_rate, total_fillers, quality_score)
        }
    
    def _calculate_quality(
        self, filler_rate: float, repetition_count: int, word_count: int
    ) -> float:
        """Calculate speech quality score (more lenient)"""
        # Start with perfect score
        score = 100.0
        
        # Penalize filler rate (more lenient)
        # Good: <5%, Acceptable: 5-10%, Poor: >10%
        if filler_rate > 10:
            score -= (filler_rate - 10) * 3  # Reduced from 5
        elif filler_rate > 5:
            score -= (filler_rate - 5) * 2   # Reduced from 3
        
        # Penalize repetitions (more lenient)
        score -= repetition_count * 3  # Reduced from 5
        
        # Penalize very short responses (more lenient)
        if word_count < 15:  # Reduced threshold from 20
            score -= 5  # Reduced from 10
        
        return max(0, min(100, score))
    
    def _generate_feedback(
        self, filler_rate: float, total_fillers: int, quality_score: float
    ) -> str:
        """Generate human-readable feedback"""
        if quality_score >= 90:
            return "Excellent - very clear and articulate speech"
        elif quality_score >= 75:
            return "Good - minimal filler words, clear communication"
        elif quality_score >= 60:
            return f"Fair - {total_fillers} filler words detected, try to speak more deliberately"
        else:
            return f"Needs improvement - excessive filler words ({filler_rate:.1f}% of speech)"
    
    def _get_default_response(self) -> Dict:
        """Return default response for empty transcript"""
        return {
            'filler_words': {
                'count': 0,
                'unique_fillers': [],
                'breakdown': {},
                'rate_percent': 0.0,
                'per_minute': 0.0
            },
            'repetitions': {
                'count': 0,
                'words': []
            },
            'word_metrics': {
                'total_words': 0,
                'estimated_duration': 0.0
            },
            'quality_score': 100.0,
            'feedback': 'No transcript provided'
        }


# Singleton instance
_filler_detector = None

def get_filler_detector():
    """Get singleton FillerWordDetector instance"""
    global _filler_detector
    if _filler_detector is None:
        _filler_detector = FillerWordDetector()
    return _filler_detector
