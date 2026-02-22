#!/usr/bin/env python3
"""
API Route Handlers for Audio Analysis Service
"""

import logging
import base64
import numpy as np
import librosa
from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Dict

from services.audio_service.models.wav2vec_emotion import get_emotion_model
from services.audio_service.models.whisper_transcriber import get_whisper_model
from services.audio_service.models.sentiment_model import get_sentiment_model
from services.audio_service.scoring.confidence_engine import get_confidence_engine

logger = logging.getLogger(__name__)


def create_audio_routes() -> Blueprint:
    """Create and configure audio analysis routes"""
    
    audio_bp = Blueprint('audio', __name__)
    
    # Lazy-load models (initialized on first request)
    emotion_model = None
    whisper_model = None
    sentiment_model = None
    confidence_engine = None
    
    def _initialize_models():
        """Initialize all models (singleton pattern)"""
        nonlocal emotion_model, whisper_model, sentiment_model, confidence_engine
        
        if emotion_model is None:
            emotion_model = get_emotion_model()
        
        if whisper_model is None:
            whisper_model = get_whisper_model()
        
        if sentiment_model is None:
            sentiment_model = get_sentiment_model()
        
        if confidence_engine is None:
            confidence_engine = get_confidence_engine()
        
        return emotion_model, whisper_model, sentiment_model, confidence_engine
    
    @audio_bp.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'service': 'audio-analysis-ml-v2',
            'version': '2.0.0',
            'architecture': 'model-based'
        })
    
    @audio_bp.route('/analyze-audio', methods=['POST'])
    def analyze_audio():
        """
        Main audio analysis endpoint
        
        Request:
        {
            "audio_base64": "<base64 encoded audio>",
            "transcript_optional": true/false (default: false)
        }
        
        Response:
        {
            "emotion": "...",
            "emotion_score": 0.0-1.0,
            "transcript": "...",
            "speech_rate_wpm": ...,
            "pause_count": ...,
            "sentiment": "...",
            "sentiment_score": 0-100,
            "confidence_score": 0-100,
            "grade": "A+",
            "breakdown": {...},
            "timestamp": "..."
        }
        """
        request_start = datetime.now()
        logger.info("\n" + "#"*60)
        logger.info("📨 POST /analyze-audio request received")
        logger.info("#"*60)
        
        try:
            # Initialize models (lazy loading)
            emo_model, whis_model, sent_model, conf_engine = _initialize_models()
            
            # Parse request
            data = request.json
            if not data:
                logger.error("❌ No JSON data provided")
                return jsonify({'error': 'No JSON data provided'}), 400
            
            audio_base64 = data.get('audio_base64')
            transcript_optional = data.get('transcript_optional', False)
            
            if not audio_base64:
                logger.error("❌ No audio_base64 field in request")
                return jsonify({'error': 'audio_base64 field required'}), 400
            
            logger.info(f"   Audio data size: {len(audio_base64)} characters")
            logger.info(f"   Transcript optional: {transcript_optional}")
            
            # Decode audio
            logger.info("\n📥 Step 1: Decoding audio...")
            audio_array, sample_rate = _decode_audio(audio_base64)
            
            if audio_array is None:
                return jsonify({'error': 'Failed to decode audio'}), 400
            
            duration = len(audio_array) / sample_rate
            logger.info(f"   Duration: {duration:.2f}s, Sample rate: {sample_rate}Hz")
            
            # Step 2: Emotion Recognition
            logger.info("\n🎭 Step 2: Emotion Recognition (Wav2Vec2)...")
            emotion_result = emo_model.predict(audio_array, sample_rate)
            
            # Step 3: Transcription (Optional or Always)
            logger.info("\n🎙️  Step 3: Speech Transcription (Whisper)...")
            transcription_result = whis_model.transcribe(audio_array, sample_rate)
            transcript = transcription_result.get('transcript', '')
            
            # Step 4: Sentiment Analysis
            logger.info("\n💬 Step 4: Sentiment Analysis (DistilBERT)...")
            if transcript and not transcript_optional:
                sentiment_result = sent_model.analyze(transcript)
            elif transcript_optional and transcript:
                # Use provided transcript
                sentiment_result = sent_model.analyze(transcript)
            else:
                # No transcript available
                sentiment_result = {
                    'label': 'NEUTRAL',
                    'score': 0.5,
                    'sentiment_score': 50.0,
                    'polarity': 0.0
                }
                logger.info("   No transcript available, using neutral sentiment")
            
            # Step 5: Confidence Scoring
            logger.info("\n🧠 Step 5: Confidence Scoring...")
            confidence_result = conf_engine.calculate_confidence(
                emotion_result,
                transcription_result,
                sentiment_result
            )
            
            # Build response
            response = {
                # Emotion
                'emotion': emotion_result.get('emotion'),
                'emotion_score': emotion_result.get('confidence'),
                'emotion_all_scores': emotion_result.get('all_scores', {}),
                
                # Transcription
                'transcript': transcript,
                'word_count': transcription_result.get('word_count', 0),
                'speech_rate_wpm': transcription_result.get('speech_rate_wpm', 0),
                'pause_count': transcription_result.get('pause_count', 0),
                'avg_pause_duration': transcription_result.get('avg_pause_duration', 0),
                'hesitation_count': transcription_result.get('hesitation_count', 0),
                'fluency_score': transcription_result.get('fluency_score', 0),
                
                # Sentiment
                'sentiment': sentiment_result.get('label'),
                'sentiment_score': sentiment_result.get('sentiment_score'),
                'sentiment_polarity': sentiment_result.get('polarity'),
                
                # Confidence
                'confidence_score': confidence_result.get('confidence_score'),
                'confidence_grade': confidence_result.get('grade'),
                'confidence_breakdown': confidence_result.get('breakdown', {}),
                'interpretation': confidence_result.get('interpretation', ''),
                
                # Metadata
                'timestamp': datetime.now().isoformat(),
                'duration_seconds': duration,
                'processing_time_seconds': (datetime.now() - request_start).total_seconds()
            }
            
            # Log summary
            request_time = (datetime.now() - request_start).total_seconds()
            logger.info("\n✅ Analysis Complete!")
            logger.info(f"   Confidence: {response['confidence_score']:.1f}/100 ({response['confidence_grade']})")
            logger.info(f"   Emotion: {response['emotion']} ({response['emotion_score']:.2%})")
            logger.info(f"   Speech Rate: {response['speech_rate_wpm']:.0f} WPM")
            logger.info(f"   Sentiment: {response['sentiment']} ({response['sentiment_score']:.1f}/100)")
            logger.info(f"   Processing Time: {request_time:.2f}s")
            logger.info("#"*60 + "\n")
            
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"❌ Error in analyze_audio: {e}", exc_info=True)
            logger.info("#"*60 + "\n")
            return jsonify({
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500
    
    @audio_bp.route('/analyze-batch', methods=['POST'])
    def analyze_batch():
        """
        Batch analysis endpoint for multiple audio chunks
        
        Request:
        {
            "audio_chunks": ["<base64>", "<base64>", ...],
            "merge_results": true/false
        }
        """
        logger.info("\n📨 POST /analyze-batch request received")
        
        try:
            emo_model, whis_model, sent_model, conf_engine = _initialize_models()
            
            data = request.json
            audio_chunks = data.get('audio_chunks', [])
            merge_results = data.get('merge_results', True)
            
            if not audio_chunks:
                return jsonify({'error': 'No audio_chunks provided'}), 400
            
            logger.info(f"   Processing {len(audio_chunks)} audio chunks")
            
            results = []
            
            for idx, audio_base64 in enumerate(audio_chunks, 1):
                logger.info(f"\n📊 Processing chunk {idx}/{len(audio_chunks)}...")
                
                # Decode audio
                audio_array, sample_rate = _decode_audio(audio_base64)
                if audio_array is None:
                    continue
                
                # Analyze
                emotion_result = emo_model.predict(audio_array, sample_rate)
                transcription_result = whis_model.transcribe(audio_array, sample_rate)
                
                transcript = transcription_result.get('transcript', '')
                sentiment_result = sent_model.analyze(transcript) if transcript else {}
                
                confidence_result = conf_engine.calculate_confidence(
                    emotion_result,
                    transcription_result,
                    sentiment_result
                )
                
                results.append({
                    'chunk_id': idx,
                    'emotion': emotion_result.get('emotion'),
                    'transcript': transcript,
                    'confidence_score': confidence_result.get('confidence_score')
                })
            
            if merge_results:
                # Aggregate results
                avg_confidence = np.mean([r['confidence_score'] for r in results])
                combined_transcript = ' '.join([r['transcript'] for r in results])
                emotions = [r['emotion'] for r in results]
                dominant_emotion = max(set(emotions), key=emotions.count)
                
                response = {
                    'chunks_analyzed': len(results),
                    'avg_confidence_score': float(avg_confidence),
                    'dominant_emotion': dominant_emotion,
                    'combined_transcript': combined_transcript,
                    'individual_results': results
                }
            else:
                response = {'results': results}
            
            logger.info(f"✅ Batch analysis complete: {len(results)} chunks processed\n")
            
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"❌ Error in analyze_batch: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500
    
    @audio_bp.route('/models/info', methods=['GET'])
    def models_info():
        """Get information about loaded models"""
        models_loaded = {
            'emotion_model': emotion_model is not None,
            'whisper_model': whisper_model is not None,
            'sentiment_model': sentiment_model is not None,
            'confidence_engine': confidence_engine is not None
        }
        
        model_details = {
            'emotion': {
                'name': 'superb/wav2vec2-base-superb-er',
                'type': 'audio_classification',
                'loaded': models_loaded['emotion_model']
            },
            'transcription': {
                'name': 'openai/whisper-base',
                'type': 'speech_recognition',
                'loaded': models_loaded['whisper_model']
            },
            'sentiment': {
                'name': 'distilbert-base-uncased-finetuned-sst-2-english',
                'type': 'text_classification',
                'loaded': models_loaded['sentiment_model']
            }
        }
        
        return jsonify({
            'models': model_details,
            'all_loaded': all(models_loaded.values())
        })
    
    def _decode_audio(audio_base64: str) -> tuple:
        """
        Decode base64 audio to numpy array
        
        Returns:
            (audio_array, sample_rate) or (None, None) on error
        """
        try:
            # Decode base64
            audio_bytes = base64.b64decode(audio_base64)
            
            # Save to temp file for librosa
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(audio_bytes)
            
            # Load with librosa
            audio_array, sample_rate = librosa.load(temp_path, sr=16000)
            
            # Cleanup
            os.remove(temp_path)
            
            return audio_array, sample_rate
            
        except Exception as e:
            logger.error(f"❌ Audio decode error: {e}")
            return None, None
    
    return audio_bp
