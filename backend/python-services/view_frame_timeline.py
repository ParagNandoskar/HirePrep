#!/usr/bin/env python3
"""
View Frame-by-Frame Timeline
Shows detailed tracking data for each frame in a test interview
"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

load_dotenv()

MONGO_URI = os.getenv('MONGODB_URI')
TEST_INTERVIEW_ID = "507f1f77bcf86cd799439011"
TEST_CANDIDATE_ID = "507f1f77bcf86cd799439012"

def format_gaze_direction(gaze_x, gaze_y):
    """Convert gaze coordinates to human-readable direction"""
    if gaze_x is None or gaze_y is None:
        return "unknown"
    
    horizontal = ""
    vertical = ""
    
    if abs(gaze_x) > 0.3:
        horizontal = "RIGHT" if gaze_x > 0 else "LEFT"
    else:
        horizontal = "CENTER"
    
    if abs(gaze_y) > 0.3:
        vertical = "DOWN" if gaze_y > 0 else "UP"
    else:
        vertical = "CENTER"
    
    if horizontal == "CENTER" and vertical == "CENTER":
        return "📹 DIRECTLY AT CAMERA"
    else:
        return f"{vertical}-{horizontal}"

def format_head_pose(pitch, yaw, roll):
    """Convert head pose angles to human-readable direction"""
    if pitch is None or yaw is None:
        return "unknown"
    
    direction = []
    
    # Yaw (left/right)
    if abs(yaw) > 20:
        direction.append("👈 LEFT" if yaw < 0 else "👉 RIGHT")
    
    # Pitch (up/down)
    if abs(pitch) > 15:
        direction.append("👇 DOWN" if pitch > 0 else "👆 UP")
    
    if not direction:
        direction.append("📹 STRAIGHT")
    
    return " + ".join(direction)

def view_timeline():
    """Display frame-by-frame timeline of where user was looking"""
    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tlsAllowInvalidCertificates=True
        )
        
        db = client['hireprep']
        collection = db['videoanalysisframes']
        
        # Get all frames from test interview
        frames = list(collection.find(
            {
                'interviewId': ObjectId(TEST_INTERVIEW_ID),
                'candidateId': ObjectId(TEST_CANDIDATE_ID)
            },
            sort=[('timestamp', 1)]  # Chronological order
        ))
        
        if not frames:
            print("❌ No frames found for test interview")
            return
        
        print("="*80)
        print(f"🎬 Frame-by-Frame Timeline ({len(frames)} frames)")
        print("="*80)
        print(f"Interview ID: {TEST_INTERVIEW_ID}")
        print(f"Candidate ID: {TEST_CANDIDATE_ID}")
        print(f"Duration: {len(frames) * 0.033:.1f} seconds")
        print("="*80)
        
        # Show first frame time for relative timing
        start_time = frames[0].get('timestamp')
        
        for idx, frame in enumerate(frames, 1):
            timestamp = frame.get('timestamp')
            elapsed = (timestamp - start_time).total_seconds()
            
            # Extract data
            face_det = frame.get('faceDetection', {})
            head_pose = face_det.get('headPose', {})
            gaze = face_det.get('gaze', {})
            looking_away = face_det.get('lookingAway', False)
            looking_away_dir = face_det.get('lookingAwayDirection', 'none')
            
            emotion = frame.get('emotion', {})
            dominant_emotion = emotion.get('dominant', 'unknown')
            
            scores = frame.get('scores', {})
            eye_contact = scores.get('eyeContact', 0)
            video_conf = scores.get('videoConfidence', 0)
            
            # Format directions
            head_dir = format_head_pose(
                head_pose.get('pitch'),
                head_pose.get('yaw'),
                head_pose.get('roll')
            )
            
            gaze_dir = format_gaze_direction(
                gaze.get('x'),
                gaze.get('y')
            )
            
            # Visual indicator for looking away
            status = "⚠️  LOOKING AWAY" if looking_away else "✅ FOCUSED"
            
            print(f"\n[Frame {idx:3d}] +{elapsed:5.1f}s | {status}")
            print(f"  👤 Head:  {head_dir}")
            print(f"  👁️  Gaze:  {gaze_dir}")
            if looking_away:
                print(f"  🔴 Looking: {looking_away_dir.upper()}")
            print(f"  😊 Emotion: {dominant_emotion}")
            print(f"  📊 Eye Contact: {eye_contact:.0f}/100  |  Confidence: {video_conf:.0f}/100")
            
            if head_pose.get('yaw') is not None:
                print(f"  📐 Angles: Yaw={head_pose.get('yaw', 0):.1f}° Pitch={head_pose.get('pitch', 0):.1f}°")
        
        print("\n" + "="*80)
        print("📊 Summary Statistics")
        print("="*80)
        
        # Calculate summary stats
        total_looking_away = sum(1 for f in frames if f.get('faceDetection', {}).get('lookingAway', False))
        avg_eye_contact = sum(f.get('scores', {}).get('eyeContact', 0) for f in frames) / len(frames)
        avg_confidence = sum(f.get('scores', {}).get('videoConfidence', 0) for f in frames) / len(frames)
        
        print(f"Total Frames: {len(frames)}")
        print(f"Looking Away: {total_looking_away} frames ({100*total_looking_away/len(frames):.1f}%)")
        print(f"Average Eye Contact: {avg_eye_contact:.1f}/100")
        print(f"Average Confidence: {avg_confidence:.1f}/100")
        
        # Direction breakdown
        print(f"\n📍 Looking Away Directions:")
        directions = {}
        for f in frames:
            direction = f.get('faceDetection', {}).get('lookingAwayDirection', 'none')
            if direction != 'none':
                directions[direction] = directions.get(direction, 0) + 1
        
        for direction, count in sorted(directions.items(), key=lambda x: x[1], reverse=True):
            print(f"   {direction.upper()}: {count} frames ({100*count/len(frames):.1f}%)")
        
        print("="*80)
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    view_timeline()
