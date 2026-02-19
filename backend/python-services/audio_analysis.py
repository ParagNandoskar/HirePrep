#!/usr/bin/env python3
"""
Audio Analysis Microservice
Analyzes audio for tone, stress, clarity, sentiment, and communication effectiveness.
Uses speech processing libraries for comprehensive audio analysis.
"""

import os
import json
import base64
import numpy as np
import librosa
import logging
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import wave

# Configure logging with detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

from transformers import pipeline

app = Flask(__name__)
CORS(app)

logger.info("="*60)
logger.info("🚀 Initializing Audio Analysis Service")
logger.info("="*60)

class AudioAnalyzer:
    """A class to handle the analysis of audio chunks."""
    def __init__(self):
        self.sample_rate = 16000  # Standard sample rate for speech
        logger.info("📊 Initializing AudioAnalyzer...")
        logger.info(f"   Sample Rate: {self.sample_rate} Hz")
        
        try:
            logger.info("⏳ Loading DistilBERT sentiment model...")
            start_time = time.time()
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis", 
                model="distilbert-base-uncased-finetuned-sst-2-english"
            )
            load_time = time.time() - start_time
            logger.info(f"✅ Sentiment Analyzer Loaded (took {load_time:.2f}s)")
            logger.info(f"   Model: distilbert-base-uncased-finetuned-sst-2-english")
        except Exception as e:
            logger.error(f"❌ Failed to load sentiment analyzer: {e}")
            self.sentiment_analyzer = None
        
    def analyze_audio_chunk(self, audio_data):
        """Analyze a chunk of audio data and return a dictionary of results."""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            # Convert bytes to numpy array
            audio_array = self.bytes_to_audio_array(audio_bytes)
            
            if audio_array is None or len(audio_array) == 0:
                logger.warning("Audio array is empty or None.")
                return None
            
            # Perform various audio analyses
            tone_analysis = self.analyze_tone(audio_array)
            speech_features = self.extract_speech_features(audio_array)
            sentiment_score = self.analyze_sentiment_simple(audio_array)
            stress_level = self.calculate_stress_level(audio_array, speech_features)
            
            return {
                'toneAnalysis': tone_analysis,
                'speechFeatures': speech_features,
                'sentimentScore': sentiment_score,
                'stressLevel': stress_level,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Audio chunk analysis error: {e}")
            return None
    
    def bytes_to_audio_array(self, audio_bytes):
        """
        Convert audio bytes to a numpy array.
        NOTE: This is a simplified approach that assumes raw PCM float32 data.
        A production system would need to handle various audio formats (e.g., WAV).
        """
        try:
            # Assume raw PCM data for simplicity
            audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
            
            # Normalize audio to prevent clipping
            if len(audio_array) > 0:
                audio_array = audio_array / np.max(np.abs(audio_array))
            
            return audio_array
            
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            return None  # Return None instead of fake data
    
    def analyze_tone(self, audio_array):
        """Analyze tone characteristics using REAL audio signal processing."""
        try:
            # Extract REAL audio features
            rms_energy = np.sqrt(np.mean(audio_array**2))
            zero_crossing_rate = np.sum(np.diff(np.signbit(audio_array))) / len(audio_array)
            
            # REAL confidence from vocal energy (loud = confident)
            # RMS range typically 0.01-0.5 for speech
            confidence_score = min(100, max(0, (rms_energy / 0.3) * 100))
            
            # REAL enthusiasm from speech dynamics (high ZCR = animated)
            # ZCR range typically 0.01-0.15 for speech
            enthusiasm_score = min(100, max(0, (zero_crossing_rate / 0.12) * 100))
            
            # REAL clarity from signal stability (low noise = clear)
            # Inverse of ZCR variation
            clarity_score = min(100, max(0, 100 - (zero_crossing_rate * 500)))
            
            # REAL pace from zero crossing rate
            pace_score = zero_crossing_rate * 1000
            if pace_score < 50:
                pace = 'slow'
            elif pace_score > 150:
                pace = 'fast'
            else:
                pace = 'moderate'
            
            return {
                'confidence': float(confidence_score),
                'enthusiasm': float(enthusiasm_score),
                'clarity': float(clarity_score),
                'pace': pace,
                'volume': float(rms_energy * 100)
            }
            
        except Exception as e:
            logger.error(f"Tone analysis error: {e}")
            return {
                'confidence': 50,
                'enthusiasm': 50,
                'clarity': 50,
                'pace': 'moderate',
                'volume': 50
            }
    
    def extract_speech_features(self, audio_array):
        """Extract speech-specific features using the librosa library."""
        try:
            if len(audio_array) > 0:
                # Pitch analysis
                pitches, magnitudes = librosa.piptrack(y=audio_array, sr=self.sample_rate)
                avg_pitch = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
                
                # Spectral features
                spectral_centroids = librosa.feature.spectral_centroid(y=audio_array, sr=self.sample_rate)[0]
                avg_spectral_centroid = np.mean(spectral_centroids)
                
                # MFCC features (commonly used in speech recognition)
                mfccs = librosa.feature.mfcc(y=audio_array, sr=self.sample_rate, n_mfcc=13)
                avg_mfccs = np.mean(mfccs, axis=1)
                
                return {
                    'averagePitch': float(avg_pitch) if not np.isnan(avg_pitch) else 0,
                    'spectralCentroid': float(avg_spectral_centroid) if not np.isnan(avg_spectral_centroid) else 0,
                    'mfccFeatures': avg_mfccs.tolist(),
                    'speechRate': self.estimate_speech_rate(audio_array),
                    'pausePattern': self.analyze_pause_pattern(audio_array)
                }
            else:
                return self.get_default_speech_features()
                
        except Exception as e:
            logger.error(f"Speech feature extraction error: {e}")
            return self.get_default_speech_features()
    
    def estimate_speech_rate(self, audio_array):
        """Estimate words per minute using a simplified energy-based method."""
        try:
            # Simple energy-based speech rate estimation
            frame_size = int(0.1 * self.sample_rate)  # 100ms frames
            frames = [audio_array[i:i+frame_size] for i in range(0, len(audio_array), frame_size)]
            
            # Count energy peaks as potential syllables/words
            energy_threshold = np.mean([np.sqrt(np.mean(frame**2)) for frame in frames if len(frame) == frame_size]) * 0.5
            speech_frames = sum(1 for frame in frames if len(frame) == frame_size and np.sqrt(np.mean(frame**2)) > energy_threshold)
            
            # Rough conversion to words per minute
            duration_minutes = len(audio_array) / self.sample_rate / 60
            words_per_minute = (speech_frames * 2) / max(duration_minutes, 0.01)  # Rough estimate
            
            return int(min(200.0, max(50.0, float(words_per_minute))))
            
        except Exception as e:
            logger.error(f"Speech rate estimation error: {e}")
            return 120  # Average speaking rate
    
    def analyze_pause_pattern(self, audio_array):
        """Analyze pause patterns in speech using simple silence detection."""
        try:
            # Simple silence detection
            frame_size = int(0.05 * self.sample_rate)  # 50ms frames
            silence_threshold = np.std(audio_array) * 0.1
            
            frames = [audio_array[i:i+frame_size] for i in range(0, len(audio_array), frame_size)]
            silence_frames = [i for i, frame in enumerate(frames) if len(frame) == frame_size and np.max(np.abs(frame)) < silence_threshold]
            
            if len(silence_frames) > 0:
                # Calculate pause statistics
                total_frames = len(frames)
                silence_ratio = len(silence_frames) / total_frames
                
                return {
                    'silenceRatio': silence_ratio,
                    'pauseCount': len(silence_frames),
                    'averagePauseLength': silence_ratio * len(audio_array) / self.sample_rate / max(1, len(silence_frames))
                }
            else:
                return {'silenceRatio': 0, 'pauseCount': 0, 'averagePauseLength': 0}
                
        except Exception as e:
            logger.error(f"Pause pattern analysis error: {e}")
            return {'silenceRatio': 0.1, 'pauseCount': 5, 'averagePauseLength': 0.5}

    def calculate_stress_level(self, audio_array, speech_features):
        """
        Calculate stress level based on pitch variation, speech rate, and energy.
        Higher pitch variation, faster speech, and higher energy can indicate stress.
        """
        try:
            # Pitch variation (standard deviation of pitch)
            pitches, magnitudes = librosa.piptrack(y=audio_array, sr=self.sample_rate)
            pitch_values = pitches[magnitudes > 0]
            pitch_std = np.std(pitch_values) if len(pitch_values) > 0 else 0

            # Speech rate (words per minute)
            speech_rate = speech_features.get('speechRate', 120)

            # Energy (RMS)
            rms_energy = np.sqrt(np.mean(audio_array**2))

            # Normalize and combine
            # Pitch std: typical range 10-50 Hz for speech, higher = more stress
            pitch_stress = min(100.0, max(0.0, (pitch_std / 20) * 100))

            # Speech rate: typical 120-150 wpm, >150 can be stress
            speech_rate_stress = min(100, max(0, (speech_rate - 150) * 2))

            # Energy: higher energy can be stress
            energy_stress = min(100, max(0, (rms_energy / 0.3) * 100))

            # Weighted average for overall stress
            overall_stress = (pitch_stress * 0.4) + (speech_rate_stress * 0.3) + (energy_stress * 0.3)
            return min(100.0, max(0.0, overall_stress))

        except Exception as e:
            logger.error(f"Stress level calculation error: {e}")
            return 30 # Default low stress

    def get_default_speech_features(self):
        """Return default speech features when extraction fails."""
        return {
            'averagePitch': 0,
            'spectralCentroid': 0,
            'mfccFeatures': [0] * 13,
            'speechRate': 120,
            'pausePattern': {'silenceRatio': 0.1, 'pauseCount': 5, 'averagePauseLength': 0.5}
        }

    def analyze_audio(self, audio_data, transcript=None):
        """
        Analyze audio chunks and transcript for behavioral insights.
        """
        logger.info("\n" + "="*60)
        logger.info("🎵 Starting Audio Analysis")
        overall_start = time.time()
        
        try:
            # 1. Decode Audio
            logger.debug("📥 Step 1: Decoding audio data...")
            decode_start = time.time()
            audio_bytes = base64.b64decode(audio_data)
            logger.debug(f"   Audio size: {len(audio_bytes)} bytes")
            logger.debug(f"   Decode time: {time.time() - decode_start:.3f}s")
            
            # Save to temporary file for librosa (it handles formats better)
            temp_filename = f"temp_{datetime.now().timestamp()}.webm"
            with open(temp_filename, "wb") as f:
                f.write(audio_bytes)
            logger.debug(f"   Saved to temp file: {temp_filename}")
            
            # Load audio (resample to 22050Hz for consistency)
            logger.debug("🔊 Step 2: Loading audio with librosa...")
            load_start = time.time()
            y, sr = librosa.load(temp_filename, sr=22050)
            logger.debug(f"   Duration: {len(y)/sr:.2f}s")
            logger.debug(f"   Sample rate: {sr} Hz")
            logger.debug(f"   Load time: {time.time() - load_start:.3f}s")
            
            # Cleanup temp file
            os.remove(temp_filename)
            
            # 2. Extract Acoustic Features (Prosody)
            logger.debug("🎤 Step 3: Extracting prosody features...")
            prosody_start = time.time()
            prosody_metrics = self._extract_prosody(y, sr)
            logger.debug(f"   Prosody extraction time: {time.time() - prosody_start:.3f}s")
            
            # 3. Extract Text Features (Sentiment) if transcript provided
            text_metrics = None
            if transcript:
                logger.debug(f"📝 Step 4: Analyzing transcript sentiment...")
                logger.debug(f"   Transcript: '{transcript[:100]}{'...' if len(transcript) > 100 else ''}'")
                sentiment_start = time.time()
                text_metrics = self._analyze_text_sentiment(transcript)
                logger.debug(f"   Sentiment analysis time: {time.time() - sentiment_start:.3f}s")
            else:
                logger.debug("📝 Step 4: No transcript provided, skipping text analysis")
            
            # 4. Calculate Hybrid Confidence Score
            logger.debug("🧠 Step 5: Calculating hybrid confidence...")
            confidence_score = self._calculate_hybrid_confidence(prosody_metrics, text_metrics)
            
            total_time = time.time() - overall_start
            logger.info(f"✅ Audio Analysis Complete (total time: {total_time:.3f}s)")
            logger.info(f"   Confidence Score: {confidence_score:.1f}/100")
            logger.info("="*60 + "\n")
            
            return {
                "prosody": prosody_metrics,
                "text_analysis": text_metrics,
                "confidence_score": confidence_score,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Audio Analysis Error: {e}", exc_info=True)
            return None

    def _extract_prosody(self, y, sr):
        """Analyze vocal characteristics (Pitch, Energy, Stability)"""
        try:
            logger.debug("   🎵 Extracting pitch features...")
            # Pitch (Fundamental Frequency - F0)
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            
            # Extract distinct pitches
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            pitch_values = np.array(pitch_values)
            logger.debug(f"      Found {len(pitch_values)} pitch values")
            
            # 1. Pitch Stability (Variance) - Lower variance = Higher Stability
            if len(pitch_values) > 0:
                avg_pitch = np.mean(pitch_values)
                pitch_std = np.std(pitch_values)
                # Normalize stability: 0 (shaky) to 100 (steady)
                # Typical human speech varies, so extreme monotonic is also bad, but high variance = nervous
                stability_score = max(0, min(100, 100 - (pitch_std / 5)))
                logger.debug(f"      Avg Pitch: {avg_pitch:.1f}Hz, Std: {pitch_std:.1f}, Stability: {stability_score:.1f}")
            else:
                avg_pitch = 0
                stability_score = 50
                logger.debug("      No pitch detected, using defaults")

            # 2. Energy (Loudness/Confidence)
            logger.debug("   🔊 Calculating energy...")
            rms = librosa.feature.rms(y=y)[0]
            avg_energy = np.mean(rms)
            # Normalize energy: arbitrary scale based on typical mic input
            energy_score = max(0, min(100, avg_energy * 1000))
            logger.debug(f"      RMS Energy: {avg_energy:.4f}, Score: {energy_score:.1f}")
            
            # 3. Clarity (Spectral Flatness) - High flatness = Noise/Whisper, Low = Tonal/Clear
            logger.debug("   🎯 Calculating clarity...")
            flatness = librosa.feature.spectral_flatness(y=y)[0]
            avg_flatness = np.mean(flatness)
            clarity_score = max(0, min(100, (1 - avg_flatness) * 100))
            logger.debug(f"      Spectral Flatness: {avg_flatness:.4f}, Clarity: {clarity_score:.1f}")
            
            logger.info(f"   🎤 Prosody Results - Pitch: {int(avg_pitch)}Hz, Stability: {int(stability_score)}, Energy: {int(energy_score)}, Clarity: {int(clarity_score)}")
            
            return {
                "pitch_avg": float(avg_pitch),
                "stability": float(stability_score),
                "energy": float(energy_score),
                "clarity": float(clarity_score)
            }
            
        except Exception as e:
            logger.error(f"❌ Prosody Extraction Error: {e}", exc_info=True)
            return {"stability": 50, "energy": 50, "clarity": 50}

    def _analyze_text_sentiment(self, text):
        """Analyze text using DistilBERT"""
        if not text or not self.sentiment_analyzer:
            return None
            
        try:
            # Model returns [{'label': 'POSITIVE', 'score': 0.99}]
            result = self.sentiment_analyzer(text)[0]
            label = result['label']
            score = result['score']
            
            # Convert to 0-100 scale
            # If POSITIVE, score is 50 + (score * 50) -> 50-100
            # If NEGATIVE, score is 50 - (score * 50) -> 0-50
            if label == 'POSITIVE':
                final_score = 50 + (score * 50)
            else:
                final_score = 50 - (score * 50)
                
            logger.info(f"📝 Text Analysis - Label: {label}, Confidence: {score:.2f}, Final: {final_score:.1f}")
            
            return {
                "label": label,
                "model_confidence": float(score),
                "sentiment_score": float(final_score)
            }
            
        except Exception as e:
            logger.error(f"Text Analysis Error: {e}")
            return None

    def _calculate_hybrid_confidence(self, prosody, text):
        """
        Combine Vocal Stability + Text Confidence = Hybrid Confidence
        """
        # Base confidence from voice (How you say it)
        voice_conf = (prosody['stability'] * 0.6) + (prosody['energy'] * 0.4)
        
        if text:
            # Text confidence (What you say)
            # High sentiment (very positive OR very negative) implies conviction/confidence
            # We map 0-100 sentiment to 0-100 confidence intensity
            text_conf = abs(text['sentiment_score'] - 50) * 2 
            
            # Weighted Average: 60% Voice, 40% Text
            hybrid_score = (voice_conf * 0.6) + (text_conf * 0.4)
            logger.info(f"🧠 Hybrid Confidence: {hybrid_score:.1f} (Voice: {voice_conf:.1f}, Text: {text_conf:.1f})")
        else:
            hybrid_score = voice_conf
            
        return min(100, max(0, hybrid_score))


analyzer = AudioAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'audio-analysis-ml'})

@app.route('/analyze-audio', methods=['POST'])
def analyze_audio_endpoint():
    request_start = time.time()
    logger.info("\n" + "#"*60)
    logger.info("📨 Received POST /analyze-audio request")
    
    try:
        data = request.json
        audio_chunks = data.get('audioData', [])
        transcript = data.get('transcript', "")
        
        logger.info(f"   Audio chunks: {len(audio_chunks)}")
        logger.info(f"   Transcript length: {len(transcript)} chars")
        logger.info(f"   Has transcript: {bool(transcript)}")
        
        if not audio_chunks:
            logger.warning("⚠️  No audio data provided")
            return jsonify({'error': 'No audio data'}), 400
            
        # Combine chunks if needed, for now analyze the first/main chunk
        # In a real stream, we might process them sequentially
        # For this implementation, we take the largest chunk as the "sample"
        logger.debug(f"   Processing chunk 1 of {len(audio_chunks)}")
        main_chunk = audio_chunks[0] 
        
        result = analyzer.analyze_audio(main_chunk, transcript)
        
        if not result:
            logger.error("❌ Analysis returned None")
            return jsonify({'error': 'Analysis failed'}), 500
        
        request_time = time.time() - request_start
        logger.info(f"✅ Request completed successfully (total: {request_time:.3f}s)")
        logger.info(f"📤 Response: confidence={result.get('confidence_score', 'N/A'):.1f}")
        logger.info("#"*60 + "\n")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Endpoint Error: {e}", exc_info=True)
        logger.info("#"*60 + "\n")
        return get_default_audio_analysis()

def calculate_overall_audio_score(tone_analysis, stress_level, sentiment_score):
    """Calculate overall audio analysis score based on a weighted sum."""
    try:
        # Weight different components
        weights = {
            'clarity': 0.25,
            'confidence': 0.25,
            'enthusiasm': 0.15,
            'stress': 0.20,  # Lower stress is better
            'sentiment': 0.15
        }
        
        # Calculate weighted score
        clarity_score = tone_analysis.get('clarity', 50)
        confidence_score = tone_analysis.get('confidence', 50)
        enthusiasm_score = tone_analysis.get('enthusiasm', 50)
        stress_score = 100 - stress_level  # Invert stress (lower stress = higher score)
        
        overall_score = (
            clarity_score * weights['clarity'] +
            confidence_score * weights['confidence'] +
            enthusiasm_score * weights['enthusiasm'] +
            stress_score * weights['stress'] +
            sentiment_score * weights['sentiment']
        )
        
        return min(100, max(0, overall_score))
        
    except Exception as e:
        logger.error(f"Overall score calculation error: {e}")
        return 65

def get_default_audio_analysis():
    """Return default analysis when processing fails."""
    return {
        'toneAnalysis': {
            'confidence': 65,
            'enthusiasm': 60,
            'clarity': 70,
            'pace': 'moderate',
            'volume': 50
        },
        'sentimentScores': [{
            'sentiment': 'neutral',
            'score': 50,
            'timestamp': datetime.utcnow().isoformat()
        }],
        'overallSentiment': {
            'sentiment': 'neutral',
            'score': 50
        },
        'stressLevel': 35,
        'overallAudioScore': 65,
        'analysisMetadata': {
            'chunksAnalyzed': 0,
            'averageSpeechRate': 120,
            'dominantSentiment': 'neutral',
            'note': 'Default analysis due to processing error'
        }
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8002))
    logger.info(f"Starting Audio Analysis Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
