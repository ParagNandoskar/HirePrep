#!/usr/bin/env python3
"""Audio Analysis Service (signal processing + rule-based text analysis).

Runtime architecture:
- STT is handled externally by frontend Groq Whisper API
- Audio service performs signal processing and transcript pattern analysis

Optional future support:
- ENABLE_LOCAL_MODELS=true can be used to re-enable local model paths
    in future iterations. Current default is false.
"""

import os
import sys
import logging
from flask import Flask
from flask_cors import CORS

# Ensure local package imports work no matter where the process is launched from.
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)


def _is_local_models_enabled() -> bool:
    """Feature flag for optional future local model support."""
    return os.getenv('ENABLE_LOCAL_MODELS', 'false').strip().lower() in {'1', 'true', 'yes', 'on'}

# Import route creation function
from routes.audio_routes import create_audio_routes

# Initialize Flask app
app = Flask(__name__)
CORS(app)

logger.info("="*70)
logger.info("🚀 Audio Analysis Service v3.0 - SIGNAL PROCESSING")
logger.info("="*70)
logger.info("   ✅ STT handled externally via Groq Whisper API")
logger.info("   ✅ Audio analysis: ML-free (signal processing + rule-based)")
logger.info(f"   ✅ ENABLE_LOCAL_MODELS: {_is_local_models_enabled()}")
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
        'service': 'audio-analysis-signal-processing',
        'version': '3.0.0',
        'architecture': 'signal-processing + rule-based',
        'stt': {
            'source': 'external',
            'provider': 'frontend-groq-whisper-api'
        },
        'local_models_enabled': _is_local_models_enabled()
    })


# Main entry point
if __name__ == '__main__':
    # Use AUDIO_SERVICE_PORT env var if set, otherwise default to 8001
    # (Ignore generic PORT variable which is meant for Node.js backend)
    port = int(os.environ.get('AUDIO_SERVICE_PORT', 8001))
    
    logger.info("\n" + "="*70)
    logger.info(f"🎵 Starting Audio Analysis Service v3.0")
    logger.info("="*70)
    logger.info(f"   Port: {port}")
    logger.info(f"   STT: External (Groq Whisper API via frontend)")
    logger.info(f"   Architecture: ML-free (signal processing + rule-based)")
    logger.info(f"   ENABLE_LOCAL_MODELS: {_is_local_models_enabled()}")
    logger.info(f"\n📡 Available Endpoints:")
    logger.info(f"   GET  /health               - Health check")
    logger.info(f"   POST /analyze-audio        - Single audio analysis")
    logger.info(f"   GET  /models/info          - Analyzer metadata")
    logger.info("="*70)

    logger.info(f"\n⏳ Analyzers are lazy-loaded on first request")
    logger.info(f"   No local STT/LLM model loading in current runtime")
    logger.info(f"\n💡 For production deployment:")
    logger.info(f"   gunicorn app:app\n")
    
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
