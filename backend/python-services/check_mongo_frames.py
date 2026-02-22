#!/usr/bin/env python3
"""Quick script to check all frames in MongoDB"""

from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGODB_URI')
TEST_INTERVIEW_ID = "507f1f77bcf86cd799439011"
TEST_CANDIDATE_ID = "507f1f77bcf86cd799439012"

client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
db = client['hireprep']
collection = db['videoanalysisframes']

print("\n🔍 All frames in MongoDB:")
print("="*80)

# Get all frames sorted by timestamp
frames = collection.find({}).sort('timestamp', -1).limit(10)

for idx, frame in enumerate(frames, 1):
    print(f"\n Frame #{idx}:")
    print(f"   _id: {frame.get('_id')}")
    print(f"   Interview ID: {frame.get('interviewId')}")
    print(f"   Candidate ID: {frame.get('candidateId')}")
    print(f"   Question ID: {frame.get('questionId')}")
    print(f"   Timestamp: {frame.get('timestamp')}")
    print(f"   Video Confidence: {frame.get('scores', {}).get('videoConfidence', 0):.1f}/100")
    print(f"   Face Detected: {frame.get('faceDetection', {}).get('detected', False)}")

print("\n" + "="*80)
print(f"📊 Total frames for test interview: {collection.count_documents({'interviewId': ObjectId(TEST_INTERVIEW_ID)})}")
print(f"📊 Total frames overall: {collection.count_documents({})}")

client.close()
