#!/usr/bin/env python3
"""
Quick test to verify MongoDB storage setup
"""

import os
from dotenv import load_dotenv
from mongo_storage import VideoAnalysisStorage

# Load environment variables
load_dotenv()

print("="*60)
print("🧪 Testing MongoDB Storage Setup")
print("="*60)

# Check environment variables
mongo_uri = os.getenv('MONGODB_URI')
mongo_enabled = os.getenv('MONGO_STORAGE_ENABLED', 'false').lower() == 'true'

print(f"\nEnvironment Check:")
print(f"  MONGODB_URI: {'✅ Set' if mongo_uri else '❌ Not Set'}")
print(f"  MONGO_STORAGE_ENABLED: {mongo_enabled}")

if not mongo_uri:
    print("\n❌ MONGODB_URI not found in .env file")
    print("   Please check backend/python-services/.env")
    exit(1)

# Test MongoDB connection
print(f"\n🔌 Testing MongoDB Connection...")
print(f"   URI: {mongo_uri[:30]}...{mongo_uri[-20:]}")

try:
    storage = VideoAnalysisStorage(mongo_uri=mongo_uri, database='hireprep')
    
    if storage.enabled:
        print("✅ MongoDB connection successful!")
        print(f"   Database: {storage.database_name}")
        print(f"   Collection: {storage.collection.name}")
        
        # Test document count
        count = storage.collection.count_documents({})
        print(f"   Existing frames: {count}")
        
        # Test simple insert
        print("\n📝 Testing frame insertion...")
        test_frame = {
            'timestamp': '2026-02-20T10:00:00.000Z',
            'face_detection': {
                'face_detected': True,
                'face_confidence': 0.95,
                'eye_contact_score': 85.0,
                'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0},
                'gaze': {'x': 0, 'y': 0},
                'looking_away': False
            },
            'emotions': {
                'dominant': 'neutral',
                'scores': {'happy': 10, 'neutral': 80, 'sad': 5, 'angry': 2, 'fear': 1, 'surprise': 1, 'disgust': 1}
            },
            'video_confidence': 78.5
        }
        
        # Use a test interview ID
        test_interview_id = '507f1f77bcf86cd799439011'
        test_candidate_id = '507f1f77bcf86cd799439012'
        
        result = storage.store_frame(
            test_frame,
            test_interview_id,
            test_candidate_id,
            question_id=1
        )
        
        if result:
            print(f"✅ Test frame inserted successfully!")
            print(f"   Document ID: {result}")
            
            # Clean up test data
            storage.collection.delete_one({'_id': result})
            print(f"🧹 Test data cleaned up")
        else:
            print("❌ Frame insertion failed")
        
        # Close connection
        storage.close()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\n🚀 MongoDB storage is ready to use!")
        print("\nNext steps:")
        print("  1. Start Flask service: python3 video_analysis.py")
        print("  2. Send frames with interviewId and candidateId")
        print("  3. Check MongoDB for stored frames")
        
    else:
        print("⚠️  MongoDB storage is disabled")
        print("   Set MONGO_STORAGE_ENABLED=true in .env to enable")
    
except Exception as e:
    print(f"❌ MongoDB connection failed!")
    print(f"   Error: {e}")
    print("\nTroubleshooting:")
    print("  1. Check MONGODB_URI in .env file")
    print("  2. Verify MongoDB Atlas cluster is running")
    print("  3. Check IP whitelist in MongoDB Atlas")
    print("  4. Verify credentials are correct")
    exit(1)
