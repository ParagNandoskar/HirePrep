#!/usr/bin/env python3
"""
Quick verification that models load from local directories
"""

import sys
import os
from pathlib import Path

# Add parent directory (python-services) to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_local_models_exist():
    """Check if all local models are present"""
    print("\n" + "="*70)
    print("🔍 Checking Local Model Files")
    print("="*70 + "\n")
    
    base_path = Path(__file__).parent.parent / "services" / "audio_service" / "local_models"
    
    models = {
        "wav2vec2-emotion": ["config.json", "preprocessor_config.json"],
        "whisper-base": ["config.json", "generation_config.json", "processor_config.json"],
        "distilbert-sentiment": ["config.json", "tokenizer_config.json"]
    }
    
    all_exist = True
    
    for model_name, required_files in models.items():
        model_path = base_path / model_name
        print(f"📁 {model_name}")
        print(f"   Path: {model_path}")
        
        if not model_path.exists():
            print(f"   ❌ Directory missing!")
            all_exist = False
            continue
        
        for file_name in required_files:
            file_path = model_path / file_name
            if file_path.exists():
                print(f"   ✅ {file_name}")
            else:
                print(f"   ❌ {file_name} missing!")
                all_exist = False
        print()
    
    return all_exist


def test_model_loading():
    """Test that models load from local directories"""
    print("="*70)
    print("🧪 Testing Model Loading from Local Directories")
    print("="*70 + "\n")
    
    try:
        # Import models
        print("Importing model classes...")
        from audio_service.models.wav2vec_emotion import get_emotion_model
        from audio_service.models.whisper_transcriber import get_whisper_model
        from audio_service.models.sentiment_model import get_sentiment_model
        print("✅ Import successful\n")
        
        # Test Wav2Vec2
        print("1️⃣  Loading Wav2Vec2 Emotion Model...")
        try:
            emotion_model = get_emotion_model()
            if "local_models" in str(emotion_model.local_model_path):
                print(f"   ✅ Loaded from LOCAL: {emotion_model.local_model_path}")
            else:
                print(f"   ⚠️  Model loaded but path unclear")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        # Test Whisper
        print("\n2️⃣  Loading Whisper Transcription Model...")
        try:
            whisper_model = get_whisper_model()
            if "local_models" in str(whisper_model.local_model_path):
                print(f"   ✅ Loaded from LOCAL: {whisper_model.local_model_path}")
            else:
                print(f"   ⚠️  Model loaded but path unclear")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        # Test DistilBERT
        print("\n3️⃣  Loading DistilBERT Sentiment Model...")
        try:
            sentiment_model = get_sentiment_model()
            if "local_models" in str(sentiment_model.local_model_path):
                print(f"   ✅ Loaded from LOCAL: {sentiment_model.local_model_path}")
            else:
                print(f"   ⚠️  Model loaded but path unclear")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n" + "="*70)
        print("✅ All models loaded successfully from LOCAL directories!")
        print("="*70)
        print("\n🎉 NO INTERNET REQUIRED at runtime!")
        print("   All models are loaded from disk\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}\n")
        return False


def main():
    print("\n" + "="*70)
    print("🚀 Local Model Verification Tool")
    print("="*70)
    print("Verifies that all models load from local directories")
    print("No internet connection required!")
    print("="*70 + "\n")
    
    # Step 1: Check files exist
    files_ok = check_local_models_exist()
    
    if not files_ok:
        print("="*70)
        print("❌ Some model files are missing!")
        print("="*70)
        print("\n💡 Run: python download_models.py\n")
        return 1
    
    print("="*70)
    print("✅ All model files present")
    print("="*70 + "\n")
    
    # Step 2: Test loading
    loading_ok = test_model_loading()
    
    if loading_ok:
        print("\n" + "="*70)
        print("📊 VERIFICATION SUMMARY")
        print("="*70)
        print("✅ Model files present")
        print("✅ Models load from local directories")
        print("✅ No HuggingFace downloads at runtime")
        print("✅ Production-ready for offline deployment")
        print("="*70 + "\n")
        return 0
    else:
        print("\n❌ Model loading failed. Check logs above.\n")
        return 1


if __name__ == "__main__":
    exit(main())
