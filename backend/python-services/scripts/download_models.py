#!/usr/bin/env python3
"""
HuggingFace Model Downloader for Audio Analysis Service
Downloads all required models locally for offline/production use

Usage:
    python download_models.py

Models downloaded:
    - Wav2Vec2 (emotion recognition)
    - Whisper (transcription)
    - DistilBERT (sentiment analysis)

Author: HirePrep Development Team
Date: February 22, 2026
"""

import os
import sys
import logging
from pathlib import Path
from transformers import (
    AutoModelForAudioClassification,
    AutoProcessor,
    WhisperForConditionalGeneration,
    WhisperProcessor,
    AutoModelForSequenceClassification,
    AutoTokenizer
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base paths
SCRIPT_DIR = Path(__file__).parent
LOCAL_MODELS_DIR = SCRIPT_DIR.parent / "services" / "audio_service" / "local_models"

# Model configurations - DEPLOYMENT-OPTIMIZED VERSIONS (~430MB total)
MODELS_CONFIG = {
    "wav2vec2-emotion": {
        "hub_name": "superb/wav2vec2-base-superb-er",
        "local_path": LOCAL_MODELS_DIR / "wav2vec2-emotion",
        "type": "audio_classification",
        "description": "Wav2Vec2 BASE model for emotion recognition (deployment-friendly)",
        "size": "~95MB"
    },
    "whisper-base": {
        "hub_name": "openai/whisper-tiny",
        "local_path": LOCAL_MODELS_DIR / "whisper-base",
        "type": "speech_recognition",
        "description": "Whisper TINY model for speech-to-text (fast & small)",
        "size": "~75MB"
    },
    "distilbert-sentiment": {
        "hub_name": "distilbert-base-uncased-finetuned-sst-2-english",
        "local_path": LOCAL_MODELS_DIR / "distilbert-sentiment",
        "type": "text_classification",
        "description": "DistilBERT model for sentiment analysis (already optimized)",
        "size": "~260MB"
    }
}


def create_local_models_directory():
    """Create local_models directory structure"""
    logger.info("Creating local models directory structure...")
    LOCAL_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    for model_name, config in MODELS_CONFIG.items():
        config["local_path"].mkdir(parents=True, exist_ok=True)
        logger.info(f"  ✅ Created: {config['local_path']}")
    
    logger.info("")


def download_wav2vec2_emotion():
    """Download Wav2Vec2 emotion recognition model"""
    config = MODELS_CONFIG["wav2vec2-emotion"]
    
    logger.info("="*70)
    logger.info("📥 Downloading Wav2Vec2 Emotion Model")
    logger.info("="*70)
    logger.info(f"Model: {config['hub_name']}")
    logger.info(f"Type: {config['type']}")
    logger.info(f"Size: {config['size']}")
    logger.info(f"Destination: {config['local_path']}")
    logger.info("")
    
    try:
        # Download model
        logger.info("Downloading model weights...")
        model = AutoModelForAudioClassification.from_pretrained(
            config["hub_name"],
            cache_dir=None  # Use default cache first
        )
        
        # For Wav2Vec2, use Wav2Vec2FeatureExtractor instead of AutoProcessor
        logger.info("Downloading feature extractor...")
        from transformers import Wav2Vec2FeatureExtractor
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            config["hub_name"],
            cache_dir=None
        )
        
        # Save locally
        logger.info(f"Saving to {config['local_path']}...")
        model.save_pretrained(config["local_path"])
        feature_extractor.save_pretrained(config["local_path"])
        
        logger.info("✅ Wav2Vec2 emotion model downloaded successfully!\n")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to download Wav2Vec2 model: {e}\n")
        return False


def download_whisper_base():
    """Download Whisper transcription model"""
    config = MODELS_CONFIG["whisper-base"]
    
    logger.info("="*70)
    logger.info("📥 Downloading Whisper Transcription Model")
    logger.info("="*70)
    logger.info(f"Model: {config['hub_name']}")
    logger.info(f"Type: {config['type']}")
    logger.info(f"Size: {config['size']}")
    logger.info(f"Destination: {config['local_path']}")
    logger.info("")
    
    try:
        # Download model
        logger.info("Downloading model weights...")
        model = WhisperForConditionalGeneration.from_pretrained(
            config["hub_name"],
            cache_dir=None
        )
        
        # Download processor
        logger.info("Downloading processor/tokenizer...")
        processor = WhisperProcessor.from_pretrained(
            config["hub_name"],
            cache_dir=None
        )
        
        # Save locally
        logger.info(f"Saving to {config['local_path']}...")
        model.save_pretrained(config["local_path"])
        processor.save_pretrained(config["local_path"])
        
        logger.info("✅ Whisper model downloaded successfully!\n")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to download Whisper model: {e}\n")
        return False


def download_distilbert_sentiment():
    """Download DistilBERT sentiment analysis model"""
    config = MODELS_CONFIG["distilbert-sentiment"]
    
    logger.info("="*70)
    logger.info("📥 Downloading DistilBERT Sentiment Model")
    logger.info("="*70)
    logger.info(f"Model: {config['hub_name']}")
    logger.info(f"Type: {config['type']}")
    logger.info(f"Size: {config['size']}")
    logger.info(f"Destination: {config['local_path']}")
    logger.info("")
    
    try:
        # Download model
        logger.info("Downloading model weights...")
        model = AutoModelForSequenceClassification.from_pretrained(
            config["hub_name"],
            cache_dir=None
        )
        
        # Download tokenizer
        logger.info("Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            config["hub_name"],
            cache_dir=None
        )
        
        # Save locally
        logger.info(f"Saving to {config['local_path']}...")
        model.save_pretrained(config["local_path"])
        tokenizer.save_pretrained(config["local_path"])
        
        logger.info("✅ DistilBERT sentiment model downloaded successfully!\n")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to download DistilBERT model: {e}\n")
        return False


def verify_downloads():
    """Verify all models were downloaded successfully"""
    logger.info("="*70)
    logger.info("🔍 Verifying Downloads")
    logger.info("="*70)
    
    all_valid = True
    
    for model_name, config in MODELS_CONFIG.items():
        local_path = config["local_path"]
        
        # Check for essential files
        config_file = local_path / "config.json"
        
        if config_file.exists():
            # Count files to estimate size
            file_count = len(list(local_path.rglob("*")))
            logger.info(f"✅ {model_name:.<30} {file_count} files")
        else:
            logger.error(f"❌ {model_name:.<30} MISSING")
            all_valid = False
    
    logger.info("")
    return all_valid


def print_summary(results):
    """Print download summary"""
    logger.info("="*70)
    logger.info("📊 Download Summary")
    logger.info("="*70)
    
    for model_name, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(f"{model_name:.<40} {status}")
    
    total = len(results)
    successful = sum(results.values())
    
    logger.info("="*70)
    logger.info(f"Total: {successful}/{total} models downloaded successfully")
    
    if successful == total:
        logger.info("")
        logger.info("🎉 All models downloaded successfully!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("  1. Models are saved in: audio_service/local_models/")
        logger.info("  2. Service will now load models from local directory")
        logger.info("  3. No internet required at runtime")
        logger.info("  4. For Docker: Models will be copied into image")
        logger.info("")
        logger.info("⚠️  Note: Add audio_service/local_models/ to .gitignore")
        logger.info("         (Models are ~485MB total - optimized for deployment)")
    else:
        logger.error("")
        logger.error("⚠️  Some downloads failed. Check logs above.")
        logger.error("    You may need to:")
        logger.error("    - Check internet connection")
        logger.error("    - Verify HuggingFace hub is accessible")
        logger.error("    - Ensure sufficient disk space (~1GB)")
    
    logger.info("="*70 + "\n")
    
    return successful == total


def main():
    """Main download orchestration"""
    logger.info("\n" + "="*70)
    logger.info("🚀 HuggingFace Model Downloader for Audio Analysis")
    logger.info("="*70)
    logger.info("This will download ~485MB of TINY models (optimized for deployment)")
    logger.info("Estimated time: 1-5 minutes (depends on internet speed)")
    logger.info("="*70 + "\n")
    
    # Create directory structure
    create_local_models_directory()
    
    # Download models
    results = {
        "Wav2Vec2 Emotion": download_wav2vec2_emotion(),
        "Whisper Transcription": download_whisper_base(),
        "DistilBERT Sentiment": download_distilbert_sentiment()
    }
    
    # Verify downloads
    if all(results.values()):
        verify_downloads()
    
    # Print summary
    success = print_summary(results)
    
    return 0 if success else 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Download interrupted by user")
        logger.info("Run script again to resume/retry\n")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}\n")
        sys.exit(1)
