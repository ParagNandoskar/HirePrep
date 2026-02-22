#!/usr/bin/env python3
"""
Whisper Speech Transcription Model
Uses OpenAI Whisper loaded from local directory (no runtime download)
"""

import os
import logging
import torch
import numpy as np
from pathlib import Path
from transformers import WhisperProcessor, WhisperForConditionalGeneration, pipeline
from typing import Dict, List, Tuple
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

logger = logging.getLogger(__name__)


class WhisperTranscriber:
    """
    Singleton class for Whisper-based speech transcription
    
    Model: openai/whisper-base
    Input: Raw audio waveform (16kHz)
    Output: Transcript + word timestamps + speech metrics
    
    Features:
    - Accurate transcription
    - Word-level timestamps
    - Speech rate calculation (WPM)
    - Pause detection
    - Hesitation markers (um, uh, etc.)
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model (only once)"""
        if self._initialized:
            return
            
        logger.info("=" * 60)
        logger.info("🎤 Initializing Whisper Transcription Model")
        logger.info("=" * 60)
        
        try:
            import time
            start = time.time()
            
            # Model configuration
            self.model_name = "openai/whisper-base"
            self.sample_rate = 16000
            
            # Local model path
            script_dir = Path(__file__).parent.parent
            self.local_model_path = script_dir / "local_models" / "whisper-base"
            
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
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"   Device: {self.device.upper()}")
            
            # Load pipeline from local directory
            logger.info(f"   Loading model: {self.model_name}")
            
            self.pipeline = pipeline(
                "automatic-speech-recognition",
                model=str(self.local_model_path),
                device=self.device,
                return_timestamps="word"  # Word-level timestamps
            )
            
            elapsed = time.time() - start
            logger.info(f"   ✅ Model loaded in {elapsed:.2f}s")
            
            # Hesitation markers
            self.hesitation_words = {
                'um', 'uh', 'er', 'ah', 'hmm', 'eh', 'like',
                'you know', 'I mean', 'sort of', 'kind of'
            }
            
            logger.info(f"   Features: transcript, timestamps, speech rate, pauses")
            logger.info("=" * 60 + "\n")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise
    
    def transcribe(self, audio_array: np.ndarray, sample_rate: int = 16000) -> Dict:
        """
        Transcribe audio with detailed speech metrics
        
        Args:
            audio_array: Audio waveform as numpy array
            sample_rate: Sample rate (will resample to 16kHz if different)
        
        Returns:
            {
                'transcript': str,
                'word_count': int,
                'duration_seconds': float,
                'speech_rate_wpm': float,
                'words_with_timestamps': list,
                'pause_count': int,
                'avg_pause_duration': float,
                'hesitation_count': int,
                'fluency_score': float (0-100)
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
            
            # Calculate audio duration
            duration_seconds = len(audio_array) / self.sample_rate
            
            # Run transcription with timestamps
            logger.info(f"🎙️  Transcribing {duration_seconds:.1f}s of audio...")
            result = self.pipeline(audio_array.astype(np.float32))
            
            # Extract transcript
            transcript = result['text'].strip()
            
            # Get word-level timestamps (if available)
            words_with_timestamps = []
            if 'chunks' in result:
                for chunk in result['chunks']:
                    words_with_timestamps.append({
                        'word': chunk['text'].strip(),
                        'start': chunk['timestamp'][0] if chunk['timestamp'][0] is not None else 0,
                        'end': chunk['timestamp'][1] if chunk['timestamp'][1] is not None else duration_seconds
                    })
            
            # Calculate metrics
            metrics = self._calculate_speech_metrics(
                transcript,
                words_with_timestamps,
                duration_seconds
            )
            
            logger.info(f"📝 Transcript: '{transcript[:100]}{'...' if len(transcript) > 100 else ''}'")
            logger.info(f"   Words: {metrics['word_count']}, Rate: {metrics['speech_rate_wpm']:.1f} WPM, Pauses: {metrics['pause_count']}")
            
            return {
                'transcript': transcript,
                'word_count': metrics['word_count'],
                'duration_seconds': duration_seconds,
                'speech_rate_wpm': metrics['speech_rate_wpm'],
                'words_with_timestamps': words_with_timestamps,
                'pause_count': metrics['pause_count'],
                'avg_pause_duration': metrics['avg_pause_duration'],
                'hesitation_count': metrics['hesitation_count'],
                'fluency_score': metrics['fluency_score']
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription error: {e}")
            return {
                'transcript': '',
                'word_count': 0,
                'duration_seconds': 0,
                'speech_rate_wpm': 0,
                'words_with_timestamps': [],
                'pause_count': 0,
                'avg_pause_duration': 0,
                'hesitation_count': 0,
                'fluency_score': 50.0,
                'error': str(e)
            }
    
    def _calculate_speech_metrics(
        self,
        transcript: str,
        words_with_timestamps: List[Dict],
        duration_seconds: float
    ) -> Dict:
        """Calculate detailed speech metrics"""
        
        # Word count
        words = transcript.split()
        word_count = len(words)
        
        # Speech rate (words per minute)
        if duration_seconds > 0:
            speech_rate_wpm = (word_count / duration_seconds) * 60
        else:
            speech_rate_wpm = 0
        
        # Pause detection (gaps between words)
        pause_count = 0
        pause_durations = []
        pause_threshold = 0.5  # seconds
        
        if len(words_with_timestamps) > 1:
            for i in range(len(words_with_timestamps) - 1):
                current_end = words_with_timestamps[i]['end']
                next_start = words_with_timestamps[i + 1]['start']
                
                if next_start is not None and current_end is not None:
                    gap = next_start - current_end
                    if gap > pause_threshold:
                        pause_count += 1
                        pause_durations.append(gap)
        
        avg_pause_duration = np.mean(pause_durations) if pause_durations else 0
        
        # Hesitation detection
        hesitation_count = sum(
            1 for word in words
            if word.lower() in self.hesitation_words
        )
        
        # Fluency score (0-100)
        fluency_score = self._calculate_fluency(
            speech_rate_wpm,
            pause_count,
            duration_seconds,
            hesitation_count,
            word_count
        )
        
        return {
            'word_count': word_count,
            'speech_rate_wpm': float(speech_rate_wpm),
            'pause_count': pause_count,
            'avg_pause_duration': float(avg_pause_duration),
            'hesitation_count': hesitation_count,
            'fluency_score': float(fluency_score)
        }
    
    def _calculate_fluency(
        self,
        speech_rate: float,
        pause_count: int,
        duration: float,
        hesitation_count: int,
        word_count: int
    ) -> float:
        """
        Calculate fluency score (0-100)
        
        Factors:
        - Optimal speech rate: 120-150 WPM (higher score)
        - Fewer pauses: better score
        - Fewer hesitations: better score
        - Consistent pacing: better score
        """
        if duration == 0 or word_count == 0:
            return 50.0
        
        # Speech rate score (optimal: 120-150 WPM)
        if 120 <= speech_rate <= 150:
            rate_score = 100
        elif 100 <= speech_rate < 120:
            rate_score = 80 + (speech_rate - 100) * 1  # 80-100
        elif 150 < speech_rate <= 170:
            rate_score = 100 - (speech_rate - 150) * 2  # 100-60
        elif speech_rate < 100:
            rate_score = max(0, speech_rate * 0.8)  # 0-80
        else:
            rate_score = max(0, 100 - (speech_rate - 150) * 2)  # Decreases for very fast
        
        # Pause score (fewer pauses = better)
        pause_ratio = pause_count / (duration / 10)  # Pauses per 10 seconds
        pause_score = max(0, 100 - pause_ratio * 20)
        
        # Hesitation score (fewer = better)
        hesitation_ratio = hesitation_count / max(1, word_count)
        hesitation_score = max(0, 100 - hesitation_ratio * 200)
        
        # Weighted fluency score
        fluency = (
            rate_score * 0.4 +
            pause_score * 0.35 +
            hesitation_score * 0.25
        )
        
        return min(100, max(0, fluency))
    
    def detect_speech_patterns(self, transcript: str) -> Dict:
        """
        Detect speech patterns for behavioral analysis
        
        Returns:
            {
                'has_filler_words': bool,
                'has_incomplete_sentences': bool,
                'has_repetition': bool,
                'confidence_markers': list
            }
        """
        words = transcript.lower().split()
        
        # Filler words
        has_filler = any(word in self.hesitation_words for word in words)
        
        # Incomplete sentences (ends with comma or dash)
        has_incomplete = transcript.strip().endswith((',', '-', '...'))
        
        # Repetition detection (repeated words)
        word_counts = {}
        for word in words:
            if len(word) > 3:  # Skip short words
                word_counts[word] = word_counts.get(word, 0) + 1
        
        has_repetition = any(count > 3 for count in word_counts.values())
        
        # Confidence markers
        confidence_markers = []
        confident_phrases = ['i believe', 'i am confident', 'certainly', 'definitely', 'absolutely']
        uncertain_phrases = ['maybe', 'i think', 'perhaps', 'possibly', 'not sure']
        
        transcript_lower = transcript.lower()
        for phrase in confident_phrases:
            if phrase in transcript_lower:
                confidence_markers.append(('confident', phrase))
        
        for phrase in uncertain_phrases:
            if phrase in transcript_lower:
                confidence_markers.append(('uncertain', phrase))
        
        return {
            'has_filler_words': has_filler,
            'has_incomplete_sentences': has_incomplete,
            'has_repetition': has_repetition,
            'confidence_markers': confidence_markers
        }


# Global instance (lazy-loaded)
_whisper_model = None

def get_whisper_model() -> WhisperTranscriber:
    """Get or create global Whisper model instance"""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperTranscriber()
    return _whisper_model
