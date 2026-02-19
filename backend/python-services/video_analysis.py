#!/usr/bin/env python3
"""
Video Analysis Microservice
Uses MediaPipe for geometric analysis (Eye Contact) and DeepFace for emotion recognition.
"""

import os
import cv2
import numpy as np
import base64
import json
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
import logging
from deepface import DeepFace

# Configure logging with detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

logger.info("="*60)
logger.info("🚀 Initializing Video Analysis Service")
logger.info("="*60)

# Initialize face detection using OpenCV (no model download needed)
logger.info("📊 Loading face detection models...")
mp_start = time.time()

# Use OpenCV's Haar Cascade for face detection (built-in, no download needed)
import cv2
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

if face_cascade.empty():
    logger.error("❌ Failed to load face cascade!")
if eye_cascade.empty():
    logger.error("❌ Failed to load eye cascade!")

mp_time = time.time() - mp_start

logger.info(f"✅ Face Detection Models Loaded (took {mp_time:.2f}s)")
logger.info("   - OpenCV Haar Cascade: Fast face & eye detection")
logger.info("⏳ DeepFace Model will load on first inference...")
logger.info("="*60 + "\n")

class VideoAnalyzer:
    def __init__(self):
        logger.info("🎥 VideoAnalyzer initialized and ready")
        self.frame_count = 0

    def analyze_frame(self, frame_data) -> dict | None:
        """
        Analyze a single frame for:
        1. Physics (Eye Contact, Head Pose) -> MediaPipe
        2. Emotion (Happy/Fear/Neutral) -> DeepFace
        """
        self.frame_count += 1
        frame_start = time.time()
        logger.debug(f"\n{'─'*50}")
        logger.debug(f"🖼️  Analyzing Frame #{self.frame_count}")
        
        try:
            # Decode frame
            logger.debug("   📥 Decoding frame...")
            decode_start = time.time()
            img_data = base64.b64decode(frame_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            logger.debug(f"      Decode time: {time.time() - decode_start:.3f}s")
            
            if frame is None:
                logger.warning("   ⚠️  Frame decode failed, skipping")
                return None
            
            logger.debug(f"      Frame shape: {frame.shape}")
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # 1. MediaPipe Analysis (Fast)
            logger.debug("   🔍 Running MediaPipe analysis...")
            mp_start = time.time()
            mp_analysis = self._analyze_mediapipe(rgb_frame, frame)
            logger.debug(f"      MediaPipe time: {time.time() - mp_start:.3f}s")
            logger.debug(f"      Face detected: {mp_analysis['face_detected']}")
            
            # 2. DeepFace Analysis (Deep Learning)
            # Only run if a face is detected by MediaPipe to save resources
            emotion_analysis = {}
            if mp_analysis['face_detected']:
                logger.debug("   🎭 Running DeepFace emotion analysis...")
                df_start = time.time()
                emotion_analysis = self._analyze_deepface(frame)
                logger.debug(f"      DeepFace time: {time.time() - df_start:.3f}s")
            else:
                logger.debug("   ⏭️  Skipping DeepFace (no face detected)")
                
            # 3. Calculate Video Confidence
            # Confidence = Eye Contact (40%) + Positive/Neutral Emotion (60%)
            logger.debug("   🧠 Calculating video confidence...")
            video_confidence = self._calculate_video_confidence(mp_analysis, emotion_analysis)
            logger.debug(f"      Video confidence: {video_confidence:.1f}/100")

            frame_time = time.time() - frame_start
            logger.debug(f"   ✅ Frame #{self.frame_count} complete (total: {frame_time:.3f}s)")
            logger.debug(f"{'─'*50}")
            
            result_dict = {
                'face_detection': mp_analysis,
                'emotions': emotion_analysis,
                'video_confidence': video_confidence,
                'timestamp': datetime.now().isoformat()
            }
            return result_dict
            
        except Exception as e:
            logger.error(f"❌ Frame #{self.frame_count} Analysis Error: {e}", exc_info=True)
            return None

    def _analyze_mediapipe(self, rgb_frame, frame) -> dict:
        """Extract geometric features using OpenCV"""
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        if face_cascade.empty():
            logger.error("      ❌ Face cascade not loaded")
            return analysis

        # Resize for faster detection if frame is large
        height, width = frame.shape[:2]
        detect_gray = gray
        scale = 1.0
        
        if width > 640:
            scale = 640 / width
            new_height = int(height * scale)
            detect_gray = cv2.resize(gray, (640, new_height))
            logger.debug(f"      Resized for detection: {width}x{height} -> 640x{new_height}")

        # Detect faces with balanced parameters
        # scaleFactor=1.2 (standard), minNeighbors=3 (more sensitive)
        faces_rects = face_cascade.detectMultiScale(detect_gray, 1.2, 3)
        
        # Scale back to original coordinates
        faces = []
        for (x, y, w, h) in faces_rects:
            if scale != 1.0:
                x = int(x / scale)
                y = int(y / scale)
                w = int(w / scale)
                h = int(h / scale)
            faces.append((x, y, w, h))
        
        # Log frame stats to help debugging
        avg_brightness = np.mean(gray)
        logger.debug(f"      Frame analysis: brightness={avg_brightness:.1f}, faces_found={len(faces)}")
        
        analysis = {
            'face_detected': False,
            'face_confidence': 0.0,
            'eye_contact_score': 0.0,
            'head_pose': {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0}
        }
        
        if len(faces) > 0:
            analysis['face_detected'] = True
            analysis['face_confidence'] = 0.95  # OpenCV doesn't provide confidence, use high value
            
            # Get the first (largest) face
            x, y, w, h = faces[0]
            face_roi_gray = gray[y:y+h, x:x+w]
            face_roi_color = frame[y:y+h, x:x+w]
            
            # Detect eyes within the face
            eyes = eye_cascade.detectMultiScale(face_roi_gray)
            
            # Calculate eye contact based on eye positions
            if len(eyes) >= 2:
                analysis['eye_contact_score'] = self._calculate_eye_contact_opencv(eyes, w, h)
                logger.debug(f"      Eye contact: {analysis['eye_contact_score']:.1f}/100")
            else:
                layout = "frontal" if len(eyes) > 0 else "profile/closed"
                logger.debug(f"      Eyes not fully detected ({len(eyes)} found), assuming 50% score")
                analysis['eye_contact_score'] = 50.0 # Fallback
                
            # Estimate head pose from face position
            analysis['head_pose'] = self._estimate_head_pose_opencv(x, y, w, h, frame.shape)
            logger.debug(f"      Head pose: yaw={analysis['head_pose']['yaw']:.1f}°, pitch={analysis['head_pose']['pitch']:.1f}°")
        else:
            logger.debug("      No face detected")
                
        return analysis

    def _analyze_deepface(self, frame) -> dict:
        """Run DeepFace for emotion recognition"""
        try:
            # Run analysis (disable enforce_detection because we already checked with MP)
            # actions=['emotion'] makes it faster
            objs = DeepFace.analyze(
                img_path=frame, 
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv', # Fast backend
                silent=True
            )
            
            if not objs:
                return {}
                
            result = objs[0]
            dominant_emotion = result['dominant_emotion']
            emotions = result['emotion']
            
            logger.info(f"🎭 DeepFace Emotion: {dominant_emotion} (Happy: {emotions['happy']:.1f}%, Neutral: {emotions['neutral']:.1f}%)")
            
            return {
                'dominant': dominant_emotion,
                'scores': emotions
            }
            
        except Exception as e:
            logger.error(f"DeepFace Error: {e}")
            return {}

    def _calculate_video_confidence(self, mp_data, emotion_data):
        """Combine geometric and deep features into a confidence score"""
        if not mp_data['face_detected']:
            return 0
            
        # 1. Eye Contact (0-100)
        eye_score = mp_data.get('eye_contact_score', 50)
        
        # 2. Emotion Score (0-100)
        # Happy/Neutral = Confident
        # Fear/Sad/Angry = Not Confident
        emotion_score = 50
        if emotion_data and 'scores' in emotion_data:
            scores = emotion_data['scores']
            
            # Group emotions
            # Positive/Constructive: happy, neutral, surprise
            positive_sum = scores.get('happy', 0) + scores.get('neutral', 0) + scores.get('surprise', 0)
            
            # Negative/Stress: fear, sad, angry, disgust
            negative_sum = scores.get('fear', 0) + scores.get('sad', 0) + scores.get('angry', 0) + scores.get('disgust', 0)
            
            # Total score sum (should be close to 100, but safer to calculate)
            total = positive_sum + negative_sum
            
            if total > 0:
                # Calculate ratio of positive vibes (0-100)
                emotion_score = (positive_sum / total) * 100
                
                # Slight penalty for distinct negative signals
                if negative_sum > 20:
                     emotion_score *= 0.8
            else:
                emotion_score = 50.0

        # Weighted Average: 40% Eye Contact, 60% Emotion
        # Use min/max to keep in 0-100 range
        final_conf = (eye_score * 0.4) + (min(100, emotion_score) * 0.6)
        
        return float(final_conf)

    def _calculate_eye_contact_opencv(self, eyes, face_width, face_height):
        """Calculate eye contact score using eye positions from OpenCV"""
        try:
            if len(eyes) < 2:
                return 50.0
            
            # Get the two largest eye detections (left and right eyes)
            eyes_sorted = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
            eye1, eye2 = eyes_sorted[0], eyes_sorted[1]
            
            # Calculate eye centers
            eye1_center_x = eye1[0] + eye1[2] / 2
            eye2_center_x = eye2[0] + eye2[2] / 2
            
            # Calculate face center
            face_center_x = face_width / 2
            
            # Calculate average eye position relative to face center
            avg_eye_x = (eye1_center_x + eye2_center_x) / 2
            
            # Calculate offset from face center (normalized by face width)
            # 0.0 = perfectly centered
            offset = abs(avg_eye_x - face_center_x) / face_width
            
            # Convert to score (0-100)
            # Relaxed formula: penalized less for small deviations
            # Multiplier 1.5 allows for normal gaze shifting without tanking the score
            eye_contact_score = max(0.0, min(100.0, (1 - offset * 1.5) * 100))
            
            return float(eye_contact_score)
            
        except Exception as e:
            logger.debug(f"      Eye contact calculation error: {e}")
            return 50.0

    def _estimate_head_pose_opencv(self, x, y, w, h, frame_shape):
        """Estimate head pose from face position in frame"""
        try:
            frame_height, frame_width = frame_shape[:2]
            
            # Calculate face center
            face_center_x = x + w / 2
            face_center_y = y + h / 2
            
            # Calculate frame center
            frame_center_x = frame_width / 2
            frame_center_y = frame_height / 2
            
            # Estimate yaw (left-right) from horizontal position
            yaw = ((face_center_x - frame_center_x) / frame_width) * 60
            
            # Estimate pitch (up-down) from vertical position
            pitch = ((face_center_y - frame_center_y) / frame_height) * 60
            
            # Roll is harder to estimate without landmarks, default to 0
            roll = 0.0
            
            return {
                'pitch': float(max(-90, min(90, pitch))),
                'yaw': float(max(-90, min(90, yaw))),
                'roll': float(roll)
            }
            
        except Exception as e:
            logger.debug(f"      Head pose estimation error: {e}")
            return {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0}

analyzer = VideoAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'video-analysis-ml'})

@app.route('/analyze-video', methods=['POST'])
def analyze_video_endpoint():
    request_start = time.time()
    logger.info("\n" + "#"*60)
    logger.info("📨 Received POST /analyze-video request")
    
    try:
        data = request.json
        video_frames = data.get('videoData', [])
        
        logger.info(f"   Total frames received: {len(video_frames)}")
        
        if not video_frames:
            logger.warning("⚠️  No video data provided")
            return jsonify({'error': 'No video data'}), 400
        
        # Reset frame counter for this request
        analyzer.frame_count = 0
        
        # Analyze valid frames
        logger.info("🎬 Starting frame-by-frame analysis...")
        frame_analyses = []
        for idx, frame in enumerate(video_frames, 1):
            res = analyzer.analyze_frame(frame)
            if res:
                frame_analyses.append(res)
            else:
                logger.debug(f"   ⚠️  Frame {idx} analysis returned None")
        
        logger.info(f"   Successfully analyzed: {len(frame_analyses)}/{len(video_frames)} frames")
        
        if not frame_analyses:
            logger.error("❌ All frame analyses failed")
            return jsonify({'error': 'Analysis failed'}), 500
        
        # Aggregate Results
        logger.info("📊 Aggregating results...")
        avg_confidence = np.mean([f['video_confidence'] for f in frame_analyses])
        avg_eye_contact = np.mean([f['face_detection'].get('eye_contact_score', 0) for f in frame_analyses])
        
        # Get dominant emotion across all frames
        all_emotions = [f['emotions'].get('dominant') for f in frame_analyses if f.get('emotions')]
        dominant_emotion = max(set(all_emotions), key=all_emotions.count) if all_emotions else 'neutral'
        
        logger.info(f"   Average confidence: {avg_confidence:.1f}/100")
        logger.info(f"   Average eye contact: {avg_eye_contact:.1f}/100")
        logger.info(f"   Dominant emotion: {dominant_emotion}")
        
        result = {
            'overallVideoScore': float(avg_confidence),
            'eyeContactScore': float(avg_eye_contact),
            'engagementScore': float(avg_confidence), # Synonymous in this model
            'confidenceScore': float(avg_confidence),
            'analysisMetadata': {
                'framesAnalyzed': len(frame_analyses),
                'dominantEmotion': dominant_emotion
            }
        }
        
        request_time = time.time() - request_start
        logger.info(f"✅ Request completed successfully (total: {request_time:.3f}s)")
        logger.info(f"📤 Response: score={result['overallVideoScore']:.1f}, emotion={dominant_emotion}")
        logger.info("#"*60 + "\n")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Endpoint Error: {e}", exc_info=True)
        logger.info("#"*60 + "\n")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    app.run(host='0.0.0.0', port=port)
