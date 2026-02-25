#!/usr/bin/env python3
"""
API Route Handlers for Audio Analysis Service
ZERO-STORAGE VERSION - No ML models, pure signal processing
"""

import logging
import base64
import numpy as np
import librosa
from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Dict

from services.audio_service.analyzers.voice_analyzer import get_voice_analyzer
from services.audio_service.analyzers.filler_detector import get_filler_detector

logger = logging.getLogger(__name__)


def create_audio_routes() -> Blueprint:
    """Create and configure audio analysis routes"""
    
    audio_bp = Blueprint('audio', __name__)
    
    # Lazy-load analyzers (initialized on first request)
    voice_analyzer = None
    filler_detector = None
    
    def _initialize_analyzers():
        """Initialize all analyzers (singleton pattern)"""
        nonlocal voice_analyzer, filler_detector
        
        if voice_analyzer is None:
            voice_analyzer = get_voice_analyzer()
        
        if filler_detector is None:
            filler_detector = get_filler_detector()
        
        return voice_analyzer, filler_detector
    
    @audio_bp.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'service': 'audio-analysis-zero-storage',
            'version': '3.0.0',
            'architecture': 'signal-processing',
            'storage_required': '0 MB',
            'models': 'None - ML-free'
        })
    
    @audio_bp.route('/analyze-audio', methods=['POST'])
    def analyze_audio():
        """
        Main audio analysis endpoint - ZERO STORAGE VERSION
        
        Request:
        {
            "audio_base64": "<base64 encoded audio>",
            "transcript": "<optional transcript from browser>"
        }
        
        Response:
        {
            "voice_confidence": 78,
            "speaking_rate": 145,
            "volume_consistency": 85,
            "pause_count": 4,
            "total_pause_seconds": 2.3,
            "nervousness_score": 22,
            "filler_words": {...},
            "overall_score": 82,
            "timestamp": "..."
        }
        
        Note: For emotion detection, use video analysis service (DeepFace)
        """
        request_start = datetime.now()
        logger.info("\n" + "#"*60)
        logger.info("📨 POST /analyze-audio request received (Zero-Storage V3)")
        logger.info("#"*60)
        
        try:
            # Initialize analyzers (lazy loading)
            v_analyzer, f_detector = _initialize_analyzers()
            
            # Parse request
            data = request.json
            if not data:
                logger.error("❌ No JSON data provided")
                return jsonify({'error': 'No JSON data provided'}), 400
            
            audio_base64 = data.get('audio_base64')
            transcript = data.get('transcript', '')  # Optional from browser
            
            if not audio_base64:
                logger.error("❌ No audio_base64 field in request")
                return jsonify({'error': 'audio_base64 field required'}), 400
            
            logger.info(f"   Audio data size: {len(audio_base64)} characters")
            logger.info(f"   Transcript provided: {bool(transcript)}")
            
            # Decode audio
            logger.info("\n📥 Step 1: Decoding audio...")
            audio_array, sample_rate = _decode_audio(audio_base64)
            
            if audio_array is None:
                return jsonify({'error': 'Failed to decode audio'}), 400
            
            duration = len(audio_array) / sample_rate
            logger.info(f"   Duration: {duration:.2f}s, Sample rate: {sample_rate}Hz")
            
            # Step 2: Voice Analysis (Signal Processing)
            logger.info("\n🎵 Step 2: Voice Analysis (Pitch, Volume, Pace)...")
            voice_result = v_analyzer.analyze(audio_array, sample_rate)
            logger.info(f"   Confidence: {voice_result['voice_confidence']:.1f}/100")
            logger.info(f"   Speaking Rate: {voice_result['speaking_rate']} WPM")
            logger.info(f"   Nervousness: {voice_result['nervousness_score']:.1f}/100")
            
            # Step 3: Filler Word Detection (if transcript provided)
            logger.info("\n💬 Step 3: Filler Word Analysis...")
            if transcript and transcript.strip():
                filler_result = f_detector.analyze(transcript)
                logger.info(f"   Filler words: {filler_result['filler_words']['count']}")
                logger.info(f"   Quality score: {filler_result['quality_score']:.1f}/100")
            else:
                filler_result = f_detector.analyze('')
                logger.info("   No transcript provided, skipping filler analysis")
            
            # Build response
            response = {
                # Voice metrics
                'voice_confidence': voice_result['voice_confidence'],
                'speaking_rate': voice_result['speaking_rate'],
                'volume_consistency': voice_result['volume_consistency'],
                'pause_count': voice_result['pause_count'],
                'total_pause_seconds': voice_result['total_pause_seconds'],
                'nervousness_score': voice_result['nervousness_score'],
                
                # Detailed breakdowns
                'pitch_analysis': voice_result['pitch_analysis'],
                'volume_analysis': voice_result['volume_analysis'],
                'voice_quality': voice_result['voice_quality'],
                
                # Filler words (from transcript)
                'filler_words': filler_result['filler_words'],
                'repetitions': filler_result['repetitions'],
                'speech_quality_score': filler_result['quality_score'],
                'speech_feedback': filler_result['feedback'],
                
                # Overall
                'overall_score': voice_result['overall_score'],
                
                # Metadata
                'timestamp': datetime.now().isoformat(),
                'duration_seconds': duration,
                'processing_time_seconds': (datetime.now() - request_start).total_seconds(),
                
                # Info
                'note': 'For emotion detection, aggregate with video analysis service'
            }
            
            # Log summary
            request_time = (datetime.now() - request_start).total_seconds()
            logger.info("\n✅ Analysis Complete!")
            logger.info(f"   Overall Score: {response['overall_score']:.1f}/100")
            logger.info(f"   Voice Confidence: {response['voice_confidence']:.1f}/100")
            logger.info(f"   Nervousness: {response['nervousness_score']:.1f}/100")
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
    
    @audio_bp.route('/models/info', methods=['GET'])
    def models_info():
        """Get information about loaded analyzers"""
        analyzers_loaded = {
            'voice_analyzer': voice_analyzer is not None,
            'filler_detector': filler_detector is not None
        }
        
        analyzer_details = {
            'voice_analyzer': {
                'name': 'Signal Processing',  
                'type': 'pitch/volume/pace analysis',
                'storage': '0 MB',
                'loaded': analyzers_loaded['voice_analyzer']
            },
            'filler_detector': {
                'name': 'Pattern Matching',
                'type': 'filler word detection',
                'storage': '0 MB',
                'loaded': analyzers_loaded['filler_detector']
            }
        }
        
        return jsonify({
            'analyzers': analyzer_details,
            'all_loaded': all(analyzers_loaded.values()),
            'total_storage': '0 MB',
            'architecture': 'ML-free signal processing'
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
            
            # Detect format from magic bytes and use correct extension
            # WebM starts with \x1a\x45\xdf\xa3 (EBML tag)
            is_webm = audio_bytes[:4] == b'\x1a\x45\xdf\xa3'
            suffix = '.webm' if is_webm else '.wav'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_path = temp_file.name
                temp_file.write(audio_bytes)
            
            # Load with librosa (uses ffmpeg backend for webm/opus)
            audio_array, sample_rate = librosa.load(temp_path, sr=16000)
            
            # Cleanup
            os.remove(temp_path)
            
            return audio_array, sample_rate
            
        except Exception as e:
            logger.error(f"❌ Audio decode error: {e}")
            return None, None
    
    return audio_bp
