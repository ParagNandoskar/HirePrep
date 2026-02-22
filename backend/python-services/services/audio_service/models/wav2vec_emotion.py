#!/usr/bin/env python3
"""
Wav2Vec2 Emotion Recognition Model
Uses pretrained model loaded from local directory (no runtime download)
"""

import os
import logging
import torch
import numpy as np
from pathlib import Path
from transformers import pipeline, Wav2Vec2Processor, Wav2Vec2ForSequenceClassification
from typing import Dict, Tuple
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

logger = logging.getLogger(__name__)


class Wav2VecEmotionModel:
    """
    Singleton class for Wav2Vec2-based emotion recognition
    
    Model: superb/wav2vec2-base-superb-er
    Input: Raw audio waveform (16kHz)
    Output: Emotion label + confidence score
    
    Emotions: neutral, happy, sad, angry, fearful, disgusted, surprised
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern - only one instance exists"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model (only once)"""
        if self._initialized:
            return
            
        logger.info("=" * 60)
        logger.info("🎵 Initializing Wav2Vec2 Emotion Model")
        logger.info("=" * 60)
        
        try:
            import time
            start = time.time()
            
            # Model configuration
            self.model_name = "superb/wav2vec2-base-superb-er"
            self.sample_rate = 16000
            
            # Local model path
            script_dir = Path(__file__).parent.parent
            self.local_model_path = script_dir / "local_models" / "wav2vec2-emotion"
            
            # Check if local model exists
            if not self.local_model_path.exists():
                error_msg = (
                    f"❌ Local model not found at: {self.local_model_path}\n"
                    "   Run 'python download_models.py' first to download models.\n"
                    "   This is required for offline/production deployment."
                )
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)
            
            logger.info(f"   ✅ Using LOCAL model (no internet required)")
            logger.info(f"   Path: {self.local_model_path}")
            
            # Determine device
            self.device = 0 if torch.cuda.is_available() else -1
            device_name = "GPU" if self.device == 0 else "CPU"
            logger.info(f"   Device: {device_name}")
            
            # Load pipeline from local directory
            logger.info(f"   Loading model: {self.model_name}")
            
            self.pipeline = pipeline(
                "audio-classification",
                model=str(self.local_model_path),
                device=self.device
            )
            
            elapsed = time.time() - start
            logger.info(f"   ✅ Model loaded in {elapsed:.2f}s")
            
            # Emotion mapping (model outputs)
            self.emotion_labels = {
                'neu': 'neutral',
                'hap': 'happy',
                'sad': 'sad',
                'ang': 'angry',
                'fea': 'fear',
                'dis': 'disgust',
                'sur': 'surprise'
            }
            
            logger.info(f"   Emotions: {list(self.emotion_labels.values())}")
            logger.info("=" * 60 + "\n")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to load Wav2Vec2 model: {e}")
            raise
    
    def predict(self, audio_array: np.ndarray, sample_rate: int = 16000) -> Dict:
        """
        Predict emotion from audio waveform
        
        Args:
            audio_array: Audio waveform as numpy array
            sample_rate: Sample rate (will resample to 16kHz if different)
        
        Returns:
            {
                'emotion': str,           # Emotion label
                'confidence': float,      # 0.0-1.0
                'all_scores': dict,       # All emotion probabilities
                'top_3': list            # Top 3 predictions
            }
        """
        try:
            # Resample if needed
            if sample_rate != self.sample_rate:
                import librosa
                audio_array = librosa.resample(
                    audio_array,
                    orig_sr=sample_rate,
                    target_sr=self.sample_rate
                )
            
            # Normalize audio
            if np.max(np.abs(audio_array)) > 0:
                audio_array = audio_array / np.max(np.abs(audio_array))
            
            # Run inference
            results = self.pipeline(audio_array.astype(np.float32))
            
            # Parse results
            top_result = results[0]
            emotion_raw = top_result['label']
            confidence = top_result['score']
            
            # Map emotion label
            emotion = self.emotion_labels.get(emotion_raw, emotion_raw)
            
            # Create score dictionary
            all_scores = {}
            for result in results:
                mapped_emotion = self.emotion_labels.get(result['label'], result['label'])
                all_scores[mapped_emotion] = result['score']
            
            # Get top 3
            top_3 = [
                {
                    'emotion': self.emotion_labels.get(r['label'], r['label']),
                    'score': r['score']
                }
                for r in results[:3]
            ]
            
            logger.info(f"🎭 Emotion: {emotion} (confidence: {confidence:.2%})")
            
            return {
                'emotion': emotion,
                'confidence': float(confidence),
                'all_scores': all_scores,
                'top_3': top_3
            }
            
        except Exception as e:
            logger.error(f"❌ Emotion prediction error: {e}")
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'all_scores': {'neutral': 1.0},
                'top_3': [{'emotion': 'neutral', 'score': 1.0}],
                'error': str(e)
            }
    
    def calculate_emotion_stability(self, emotions: list) -> float:
        """
        Calculate emotion stability across multiple predictions
        Used for confidence scoring
        
        Args:
            emotions: List of emotion predictions from consecutive chunks
        
        Returns:
            Stability score 0-100 (higher = more consistent)
        """
        if not emotions:
            return 50.0
        
        # Count dominant emotion occurrences
        emotion_counts = {}
        for e in emotions:
            emotion_counts[e] = emotion_counts.get(e, 0) + 1
        
        # Calculate consistency
        dominant_count = max(emotion_counts.values())
        consistency = dominant_count / len(emotions)
        
        # Normalize to 0-100
        stability_score = consistency * 100
        
        return float(stability_score)
    
    def is_positive_emotion(self, emotion: str) -> bool:
        """Check if emotion is positive"""
        positive_emotions = {'neutral', 'happy', 'surprise'}
        return emotion in positive_emotions
    
    def get_emotion_valence(self, emotion: str) -> float:
        """
        Get emotion valence score
        
        Returns:
            1.0 for positive emotions
            0.5 for neutral
            0.0 for negative emotions
        """
        valence_map = {
            'happy': 1.0,
            'surprise': 0.8,
            'neutral': 0.5,
            'sad': 0.2,
            'fear': 0.1,
            'angry': 0.0,
            'disgust': 0.0
        }
        return valence_map.get(emotion, 0.5)


# Global instance (lazy-loaded)
_emotion_model = None

def get_emotion_model() -> Wav2VecEmotionModel:
    """Get or create global emotion model instance"""
    global _emotion_model
    if _emotion_model is None:
        _emotion_model = Wav2VecEmotionModel()
    return _emotion_model
