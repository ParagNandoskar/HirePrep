#!/usr/bin/env python3
"""
Zero-Storage Voice Analyzer
Analyzes audio features without ML models using signal processing.
Uses: numpy, librosa, scipy (already installed)
"""

import numpy as np
import librosa
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


class VoiceAnalyzer:
    """
    Lightweight voice analysis using signal processing (no ML models required)
    
    Features:
    - Pitch analysis (confidence/nervousness)
    - Volume consistency (speaking confidence)
    - Speaking rate estimation
    - Pause detection
    - Voice stability (tremor detection)
    """
    
    def __init__(self):
        self.sample_rate = 16000
        logger.info("✅ VoiceAnalyzer initialized (0 MB - no models)")
    
    def analyze(self, audio_data: np.ndarray, sr: int = None) -> Dict:
        """
        Analyze audio and return voice metrics
        
        Args:
            audio_data: numpy array of audio samples
            sr: sample rate (default: 16000)
        
        Returns:
            Dictionary with voice metrics
        """
        if sr is None:
            sr = self.sample_rate
        
        try:
            # Extract all features
            pitch_metrics = self._analyze_pitch(audio_data, sr)
            volume_metrics = self._analyze_volume(audio_data, sr)
            pace_metrics = self._analyze_pace(audio_data, sr)
            stability_metrics = self._analyze_stability(audio_data, sr)
            
            # Calculate composite scores
            voice_confidence = self._calculate_confidence(
                pitch_metrics, volume_metrics, stability_metrics
            )
            nervousness_score = self._calculate_nervousness(
                pitch_metrics, stability_metrics
            )
            
            overall_score = (
                voice_confidence * 0.4 +
                volume_metrics['consistency'] * 0.3 +
                pace_metrics['quality_score'] * 0.2 +
                (100 - nervousness_score) * 0.1
            )
            
            return {
                'voice_confidence': round(voice_confidence, 1),
                'speaking_rate': pace_metrics['speaking_rate'],
                'volume_consistency': round(volume_metrics['consistency'], 1),
                'pause_count': pace_metrics['pause_count'],
                'total_pause_seconds': round(pace_metrics['total_pause_seconds'], 1),
                'nervousness_score': round(nervousness_score, 1),
                'pitch_analysis': {
                    'average_hz': round(pitch_metrics['average'], 1),
                    'variance': round(pitch_metrics['variance'], 1),
                    'stability': round(pitch_metrics['stability'], 1)
                },
                'volume_analysis': {
                    'average_db': round(volume_metrics['average'], 1),
                    'consistency': round(volume_metrics['consistency'], 1)
                },
                'voice_quality': {
                    'stability': round(stability_metrics['stability'], 1),
                    'clarity': round(stability_metrics['clarity'], 1)
                },
                'overall_score': round(overall_score, 1)
            }
        
        except Exception as e:
            logger.error(f"Error in voice analysis: {e}")
            return self._get_default_response()
    
    def _analyze_pitch(self, audio: np.ndarray, sr: int) -> Dict:
        """Analyze pitch characteristics"""
        try:
            # Extract pitch using librosa
            pitches, magnitudes = librosa.piptrack(
                y=audio, sr=sr, fmin=50, fmax=500
            )
            
            # Get pitch values where magnitude is highest
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if len(pitch_values) < 5:
                return {'average': 150.0, 'variance': 20.0, 'stability': 70.0}
            
            pitch_array = np.array(pitch_values)
            average = np.mean(pitch_array)
            variance = np.std(pitch_array)
            
            # Stability: lower variance = more stable
            stability = max(0, min(100, 100 - (variance / average * 200)))
            
            return {
                'average': average,
                'variance': variance,
                'stability': stability
            }
        
        except Exception as e:
            logger.warning(f"Pitch analysis failed: {e}")
            return {'average': 150.0, 'variance': 20.0, 'stability': 70.0}
    
    def _analyze_volume(self, audio: np.ndarray, sr: int) -> Dict:
        """Analyze volume consistency"""
        try:
            # Calculate RMS energy in frames
            frame_length = int(sr * 0.05)  # 50ms frames
            hop_length = int(sr * 0.025)   # 25ms hop
            
            rms = librosa.feature.rms(
                y=audio, frame_length=frame_length, hop_length=hop_length
            )[0]
            
            # Convert to dB
            rms_db = librosa.amplitude_to_db(rms, ref=np.max)
            
            # Remove silent frames
            rms_db_filtered = rms_db[rms_db > -40]
            
            if len(rms_db_filtered) < 5:
                return {'average': -10.0, 'consistency': 70.0}
            
            average = np.mean(rms_db_filtered)
            std = np.std(rms_db_filtered)
            
            # Consistency: lower std = more consistent
            consistency = max(0, min(100, 100 - (std * 5)))
            
            return {
                'average': average,
                'consistency': consistency
            }
        
        except Exception as e:
            logger.warning(f"Volume analysis failed: {e}")
            return {'average': -10.0, 'consistency': 70.0}
    
    def _analyze_pace(self, audio: np.ndarray, sr: int) -> Dict:
        """Analyze speaking pace and pauses"""
        try:
            # Calculate RMS energy
            frame_length = int(sr * 0.05)
            hop_length = int(sr * 0.025)
            
            rms = librosa.feature.rms(
                y=audio, frame_length=frame_length, hop_length=hop_length
            )[0]
            
            # Detect speech/silence using threshold
            threshold = np.max(rms) * 0.2
            speech_frames = rms > threshold
            
            # Count pauses (silence periods > 200ms)
            min_pause_frames = int(0.2 / 0.025)  # 200ms in frames
            pause_count = 0
            total_pause_frames = 0
            current_pause = 0
            
            for is_speech in speech_frames:
                if not is_speech:
                    current_pause += 1
                else:
                    if current_pause >= min_pause_frames:
                        pause_count += 1
                        total_pause_frames += current_pause
                    current_pause = 0
            
            total_pause_seconds = total_pause_frames * 0.025
            
            # Estimate speaking rate (rough approximation)
            # Assume average syllable is ~150ms of speech
            speech_duration = np.sum(speech_frames) * 0.025
            estimated_syllables = int(speech_duration / 0.15)
            
            # Rough conversion: 1.5 syllables per word
            estimated_words = int(estimated_syllables / 1.5)
            total_duration = len(audio) / sr
            speaking_rate = int((estimated_words / total_duration) * 60)  # words/min
            
            # Quality score: ideal is 140-160 wpm, not too many pauses
            rate_quality = 100 - abs(speaking_rate - 150) * 2
            pause_penalty = min(30, pause_count * 3)
            quality_score = max(0, rate_quality - pause_penalty)
            
            return {
                'speaking_rate': speaking_rate,
                'pause_count': pause_count,
                'total_pause_seconds': total_pause_seconds,
                'quality_score': quality_score
            }
        
        except Exception as e:
            logger.warning(f"Pace analysis failed: {e}")
            return {
                'speaking_rate': 140,
                'pause_count': 2,
                'total_pause_seconds': 1.0,
                'quality_score': 75.0
            }
    
    def _analyze_stability(self, audio: np.ndarray, sr: int) -> Dict:
        """Analyze voice stability (tremor, clarity)"""
        try:
            # Spectral centroid (brightness/clarity)
            centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
            centroid_mean = np.mean(centroid)
            centroid_std = np.std(centroid)
            
            # Clarity: higher centroid = clearer speech
            clarity = min(100, (centroid_mean / 3000) * 100)
            
            # Zero crossing rate (smoothness)
            zcr = librosa.feature.zero_crossing_rate(audio)[0]
            zcr_std = np.std(zcr)
            
            # Stability: lower variation = more stable
            stability = max(0, min(100, 100 - (zcr_std * 100)))
            
            return {
                'stability': stability,
                'clarity': clarity
            }
        
        except Exception as e:
            logger.warning(f"Stability analysis failed: {e}")
            return {'stability': 75.0, 'clarity': 75.0}
    
    def _calculate_confidence(
        self, pitch: Dict, volume: Dict, stability: Dict
    ) -> float:
        """Calculate overall voice confidence score (more lenient)"""
        # Confident voice: stable pitch, consistent volume, clear
        confidence = (
            pitch['stability'] * 0.4 +
            volume['consistency'] * 0.35 +
            stability['clarity'] * 0.25
        )
        # Add base bonus to make scoring more lenient
        confidence = confidence + 15
        return max(0, min(100, confidence))
    
    def _calculate_nervousness(self, pitch: Dict, stability: Dict) -> float:
        """Calculate nervousness score (more lenient)"""
        # Nervous indicators: high pitch variance, low stability
        nervousness = (
            (pitch['variance'] / pitch['average'] * 300) * 0.6 +
            (100 - stability['stability']) * 0.4
        )
        # Reduce nervousness by 25% to be more lenient
        nervousness = nervousness * 0.75
        return max(0, min(100, nervousness))
    
    def _get_default_response(self) -> Dict:
        """Return default response on error"""
        return {
            'voice_confidence': 70.0,
            'speaking_rate': 140,
            'volume_consistency': 75.0,
            'pause_count': 2,
            'total_pause_seconds': 1.0,
            'nervousness_score': 25.0,
            'pitch_analysis': {
                'average_hz': 150.0,
                'variance': 20.0,
                'stability': 70.0
            },
            'volume_analysis': {
                'average_db': -10.0,
                'consistency': 75.0
            },
            'voice_quality': {
                'stability': 75.0,
                'clarity': 75.0
            },
            'overall_score': 75.0,
            'error': 'Analysis failed, returning defaults'
        }


# Singleton instance
_voice_analyzer = None

def get_voice_analyzer():
    """Get singleton VoiceAnalyzer instance"""
    global _voice_analyzer
    if _voice_analyzer is None:
        _voice_analyzer = VoiceAnalyzer()
    return _voice_analyzer
