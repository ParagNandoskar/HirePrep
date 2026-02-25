#!/usr/bin/env python3
"""
Audio Analysis Microservice - VERSION 2.0 (MODEL-BASED ARCHITECTURE)

🎯 UPGRADED SYSTEM - FULLY MODEL-BASED:
═══════════════════════════════════════
├── Emotion Recognition: Wav2Vec2-XLSR-EN (tiny, optimized)
├── Transcription & Speech Metrics: Whisper-Tiny (fast & small)
├── Sentiment Analysis: DistilBERT (distilbert-sst-2)
└── Unified Confidence Scoring: Multi-factor analysis

REMOVED HEURISTICS:
✅ No energy-based speech rate estimation
✅ No manual pause detection algorithms
✅ No stress level formulas
✅ All analysis now uses pretrained deep learning models

Architecture: Modular, singleton pattern, production-ready
Author: HirePrep Development Team
Date: February 22, 2026
"""

import os
import sys
import logging
from pathlib import Path
from flask import Flask
from flask_cors import CORS

# Add python-services root to path for imports
python_services_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(python_services_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Import route creation function
from services.audio_service.routes.audio_routes import create_audio_routes

# Initialize Flask app
app = Flask(__name__)
CORS(app)

logger.info("="*70)
logger.info("🚀 Audio Analysis Service v2.0 - MODEL-BASED ARCHITECTURE")
logger.info("="*70)
logger.info("   ✅ Emotion: Wav2Vec2-XLSR-EN (tiny, 150MB)")
logger.info("   ✅ Transcription: Whisper-Tiny (75MB)")
logger.info("   ✅ Sentiment: DistilBERT (distilbert-sst-2)")
logger.info("   ✅ Architecture: Modular with singleton pattern")
logger.info("   ✅ All heuristics replaced with ML models")
logger.info("="*70 + "\n")

# Register routes
audio_routes = create_audio_routes()
app.register_blueprint(audio_routes)

# Root health check for backward compatibility
@app.route('/health', methods=['GET'])
def health_check_root():
    """Root health check endpoint"""
    from flask import jsonify
    return jsonify({
        'status': 'healthy',
        'service': 'audio-analysis-ml-v2',
        'version': '2.0.0',
        'architecture': 'model-based',
        'models': {
            'emotion': 'Wav2Vec2',
            'transcription': 'Whisper',
            'sentiment': 'DistilBERT'
        }
    })


# Main entry point
if __name__ == '__main__':
    # Use AUDIO_SERVICE_PORT env var if set, otherwise default to 8001
    # (Ignore generic PORT variable which is meant for Node.js backend)
    port = int(os.environ.get('AUDIO_SERVICE_PORT', 8001))
    
    logger.info("\n" + "="*70)
    logger.info(f"🎵 Starting Audio Analysis Service v2.0")
    logger.info("="*70)
    logger.info(f"   Port: {port}")
    logger.info(f"   Architecture: Model-Based (NO HEURISTICS)")
    logger.info(f"\n📡 Available Endpoints:")
    logger.info(f"   GET  /health               - Health check")
    logger.info(f"   POST /analyze-audio        - Single audio analysis")
    logger.info(f"   POST /analyze-batch        - Batch audio analysis")
    logger.info(f"   GET  /models/info          - Model information")
    logger.info("="*70)
    
    logger.info(f"\n⏳ Models will load on first request (lazy loading)")
    logger.info(f"   Expected first-request latency: 10-30s")
    logger.info(f"   (Models download automatically if not cached)")
    logger.info(f"   Subsequent requests: <5s per audio file")
    logger.info(f"\n💡 For production deployment:")
    logger.info(f"   gunicorn -c gunicorn_config.py audio_analysis:app\n")
    
    # Run Flask development server
    try:
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False  # Set to True for development
        )
    except KeyboardInterrupt:
        logger.info("\n\n🛑 Shutting down Audio Analysis Service...")
        logger.info("Goodbye! 👋\n")
