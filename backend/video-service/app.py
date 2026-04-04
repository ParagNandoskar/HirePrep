#!/usr/bin/env python3
"""
Video Analysis Microservice - UPGRADED WITH DUAL MODAL APPROACH
Uses MediaPipe Tasks API for precision face tracking and DeepFace for emotion recognition.

🎯 DUAL MODAL EVALUATION:
1. MediaPipe (Face Landmarks & Head Pose) - Primary orientation tracking
   - 478 facial landmarks (468 face + 10 iris)
   - 3D head pose estimation (yaw, pitch, roll)
   - Gaze direction tracking (iris position)
   - Baseline calibration support
   
2. DeepFace (Emotion Recognition) - Secondary emotion analysis
   - 7 emotions: happy, sad, angry, fear, surprise, disgust, neutral
   - Pre-trained CNN for facial expression analysis
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
from dotenv import load_dotenv

from mongo_storage import init_storage
import mongo_storage  # Import module to access storage object

# Load environment variables from .env file (for MongoDB URI, etc.)
# Note: Uses VIDEO_SERVICE_PORT (not generic PORT which is for Node.js backend)
load_dotenv()

# Configure logging with detailed format
logging.basicConfig(
    level=logging.INFO,  # Changed to INFO for production (less verbose)
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

logger.info("="*60)
logger.info("🚀 Initializing Video Analysis Service (UPGRADED)")
logger.info("="*60)

# Initialize MediaPipe FaceLandmarker (New Tasks API)
logger.info("📊 Loading MediaPipe FaceLandmarker...")
mp_start = time.time()

# Check for model file (updated path for new microservice structure)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'face_landmarker.task')
if not os.path.exists(MODEL_PATH):
    logger.error(f"❌ Model file not found: {MODEL_PATH}")
    logger.error("   Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
    raise FileNotFoundError(f"Required model file missing: {MODEL_PATH}")

# Setup MediaPipe options
base_options = mp.tasks.BaseOptions(model_asset_path=MODEL_PATH)
landmarker_options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5
)

mp_time = time.time() - mp_start

logger.info(f"✅ MediaPipe FaceLandmarker Loaded (took {mp_time:.2f}s)")
logger.info("   - 478 facial landmarks (468 face + 10 iris)")
logger.info("   - 3D head pose + gaze tracking")
logger.info("⏳ DeepFace Model will load on first inference...")

# Initialize MongoDB storage (optional)
try:
    init_storage()
    logger.info("📊 MongoDB storage initialized")
except Exception as e:
    logger.warning(f"⚠️  MongoDB storage not available: {e}")
    logger.warning("   Service will continue without frame storage")

logger.info("="*60 + "\n")

class VideoAnalyzer:
    def __init__(self):
        logger.info("🎥 VideoAnalyzer initialized with MediaPipe + DeepFace")
        self.frame_count = 0
        
        # Thresholds (from face_center_guide.py - proven to work)
        self.YAW_THRESHOLD = 15  # degrees - looking left/right
        self.PITCH_UP_THRESHOLD = 12  # degrees - looking UP
        self.PITCH_DOWN_THRESHOLD = 8  # degrees - looking DOWN (stricter)
        
        # Baseline calibration (optional - can be enabled per session)
        self.baseline_pitch = None
        self.baseline_pitch_ratio = None  # For ratio-based calibration
        self.baseline_samples = []
        self.baseline_calibrated = False
        
    def calculate_simple_head_pose(self, landmarks, width, height):
        """Simple 2D head pose estimation (more reliable and sensitive for pitch)"""
        # Key points
        nose_tip = landmarks[1]
        chin = landmarks[152]
        forehead = landmarks[10]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        left_eye_top = landmarks[159]
        left_eye_bottom = landmarks[145]
        
        # Convert to pixel coordinates
        nose_y = nose_tip.y * height
        chin_y = chin.y * height
        forehead_y = forehead.y * height
        eye_y = ((left_eye_top.y + left_eye_bottom.y) / 2) * height
        
        left_eye_x = left_eye.x * width
        right_eye_x = right_eye.x * width
        nose_x = nose_tip.x * width
        
        # Calculate yaw from eye-to-eye vs nose position
        eye_center_x = (left_eye_x + right_eye_x) / 2
        eye_distance = abs(right_eye_x - left_eye_x)
        
        if eye_distance > 0:
            nose_offset_ratio = (nose_x - eye_center_x) / (eye_distance / 2)
            yaw = nose_offset_ratio * 30  # Scale to degrees
        else:
            yaw = 0
        
        # Improved pitch calculation using multiple reference points
        # Use eye-to-nose distance as the primary indicator
        nose_eye_distance = nose_y - eye_y
        eye_chin_distance = chin_y - eye_y
        
        # When looking straight, nose is typically at ~0.6 of the way from eye to chin
        # When looking up, nose appears higher (ratio < 0.5)
        # When looking down, nose appears lower (ratio > 0.7)
        if eye_chin_distance > 0:
            nose_position_ratio = nose_eye_distance / eye_chin_distance
            
            # Calibrate baseline from first few frames
            if not self.baseline_calibrated:
                self.baseline_samples.append(nose_position_ratio)
                if len(self.baseline_samples) >= 10:
                    # Use median of first 10 frames as baseline
                    self.baseline_pitch_ratio = np.median(self.baseline_samples)
                    self.baseline_calibrated = True
                    logger.info(f"[CALIBRATION] Baseline pitch ratio: {self.baseline_pitch_ratio:.3f}")
                # During calibration, return 0
                return 0, yaw, 0
            
            # Calculate pitch deviation from baseline
            pitch_deviation = nose_position_ratio - self.baseline_pitch_ratio
            
            # More sensitive pitch calculation (adjusted for baseline)
            if pitch_deviation < -0.05:  # Looking UP (nose higher than baseline)
                pitch = pitch_deviation * 100  # Negative pitch
            elif pitch_deviation > 0.03:  # Looking DOWN (nose lower than baseline) - more sensitive
                pitch = pitch_deviation * 120  # Positive pitch, scaled higher for sensitivity
            else:  # Looking straight
                pitch = pitch_deviation * 50  # Small movements
        else:
            pitch = 0
        
        return pitch, yaw, 0  # (pitch, yaw, roll)
    
    def calculate_gaze(self, landmarks):
        """Calculate gaze direction from iris position"""
        # Left eye
        left_eye_left = landmarks[33]
        left_eye_right = landmarks[133]
        left_iris = landmarks[468]
        
        eye_width = abs(left_eye_right.x - left_eye_left.x)
        if eye_width > 0:
            iris_ratio = (left_iris.x - left_eye_left.x) / eye_width
            gaze_x = (iris_ratio - 0.5) * 2  # Normalize to -1 to 1
        else:
            gaze_x = 0
        
        # Vertical gaze
        left_eye_top = landmarks[159]
        left_eye_bottom = landmarks[145]
        eye_height = abs(left_eye_bottom.y - left_eye_top.y)
        
        if eye_height > 0:
            iris_y_ratio = (left_iris.y - left_eye_top.y) / eye_height
            gaze_y = (iris_y_ratio - 0.5) * 2
        else:
            gaze_y = 0
        
        return gaze_x, gaze_y

    def analyze_frame(self, frame_data) -> dict | None:
        """
        Analyze a single frame for:
        1. Face Geometry (Head Pose, Gaze) -> MediaPipe
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
            height, width = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # 1. MediaPipe Analysis (Fast & Accurate)
            logger.debug("   🔍 Running MediaPipe analysis...")
            mp_start = time.time()
            mp_analysis = self._analyze_mediapipe(rgb_frame, width, height)
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
                
            # 3. Calculate Video Confidence (Improved Algorithm)
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

    def _analyze_mediapipe(self, rgb_frame, width, height) -> dict:
        """Extract geometric features using MediaPipe FaceLandmarker"""
        
        analysis = {
            'face_detected': False,
            'face_confidence': 0.0,
            'eye_contact_score': 0.0,
            'head_pose': {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0},
            'gaze': {'x': 0.0, 'y': 0.0},
            'looking_away': False
        }
        
        try:
            # Create MediaPipe landmarker
            landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(landmarker_options)
            
            # Convert to MediaPipe Image format
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # Detect face landmarks
            results = landmarker.detect(mp_image)
            
            # Close landmarker
            landmarker.close()
            
            if not results.face_landmarks:
                logger.debug("      No face detected by MediaPipe")
                return analysis
            
            # Face detected!
            analysis['face_detected'] = True
            analysis['face_confidence'] = 0.95  # High confidence when landmarks detected
            
            # Get landmarks
            landmarks = results.face_landmarks[0]
            logger.debug(f"      Detected {len(landmarks)} landmarks")
            
            # Calculate head pose (improved 2D method)
            pitch, yaw, roll = self.calculate_simple_head_pose(landmarks, width, height)
            analysis['head_pose'] = {
                'pitch': float(pitch),
                'yaw': float(yaw),
                'roll': float(roll)
            }
            logger.debug(f"      Head pose: yaw={yaw:.1f}°, pitch={pitch:.1f}°")
            
            # Calculate gaze direction
            gaze_x, gaze_y = self.calculate_gaze(landmarks)
            analysis['gaze'] = {
                'x': float(gaze_x),
                'y': float(gaze_y)
            }
            logger.debug(f"      Gaze: x={gaze_x:.2f}, y={gaze_y:.2f}")
            
            # Calculate eye contact score from head pose + gaze
            # Head pose score
            yaw_score = max(0, 100 - abs(yaw) * 3)
            pitch_score = max(0, 100 - abs(pitch) * 2)
            head_pose_score = (yaw_score + pitch_score) / 2
            
            # Gaze score
            gaze_score = max(0, 100 - (abs(gaze_x) * 50 + abs(gaze_y) * 50))
            
            # Combined eye contact score (head pose 60%, gaze 40%)
            analysis['eye_contact_score'] = (head_pose_score * 0.6 + gaze_score * 0.4)
            logger.debug(f"      Eye contact: {analysis['eye_contact_score']:.1f}/100")
            
            # Detect looking away (copying behavior)
            looking_away_yaw = abs(yaw) > self.YAW_THRESHOLD
            looking_away_pitch_up = pitch < -self.PITCH_UP_THRESHOLD
            looking_away_pitch_down = pitch > self.PITCH_DOWN_THRESHOLD
            analysis['looking_away'] = looking_away_yaw or looking_away_pitch_up or looking_away_pitch_down
            
            if analysis['looking_away']:
                if looking_away_yaw:
                    direction = "RIGHT" if yaw > 0 else "LEFT"
                    logger.debug(f"      ⚠️  Looking away: {direction}")
                elif looking_away_pitch_down:
                    logger.debug(f"      ⚠️  Looking away: DOWN (possibly reading)")
                elif looking_away_pitch_up:
                    logger.debug(f"      ⚠️  Looking away: UP")
                
        except Exception as e:
            logger.error(f"      ❌ MediaPipe error: {e}")
                
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
        """
        Combine geometric and emotion features into a confidence score
        Improved algorithm from face_center_guide.py
        """
        if not mp_data['face_detected']:
            return 0.0
            
        # 1. Eye Contact Score (already calculated in MediaPipe analysis)
        eye_contact_score = mp_data.get('eye_contact_score', 50.0)
        
        # Apply penalty for looking away (copying behavior detection)
        if mp_data.get('looking_away', False):
            head_pose = mp_data['head_pose']
            yaw = head_pose['yaw']
            pitch = head_pose['pitch']
            
            # Calculate penalty based on severity
            yaw_penalty = min(40, abs(yaw) * 2)  # Max 40 point penalty
            
            # Looking down is worse (reading notes) - 6x penalty per degree
            if pitch > self.PITCH_DOWN_THRESHOLD:
                pitch_penalty = min(40, (pitch - self.PITCH_DOWN_THRESHOLD) * 6)
            # Looking up - 5x penalty per degree
            elif pitch < -self.PITCH_UP_THRESHOLD:
                pitch_penalty = min(40, abs(pitch + self.PITCH_UP_THRESHOLD) * 5)
            else:
                pitch_penalty = 0
            
            total_penalty = max(yaw_penalty, pitch_penalty)
            eye_contact_score = max(0, eye_contact_score - total_penalty)
            logger.debug(f"      Applied looking away penalty: -{total_penalty:.1f} points")
        
        # 2. Emotion Score (0-100)
        emotion_score = 50.0  # Default neutral
        if emotion_data and 'scores' in emotion_data:
            scores = emotion_data['scores']
            
            # Positive emotions (happy + neutral)
            positive = scores.get('happy', 0) + scores.get('neutral', 0)
            
            # Negative emotions (sad + angry + fear)
            negative = scores.get('sad', 0) + scores.get('angry', 0) + scores.get('fear', 0)
            
            # Calculate emotion score: positive emotions minus 50% of negative
            emotion_score = min(100, positive - negative * 0.5)
            emotion_score = max(0, emotion_score)  # Ensure non-negative
            
            logger.debug(f"      Emotion score: {emotion_score:.1f} (positive: {positive:.1f}, negative: {negative:.1f})")
        
        # 3. Overall Confidence (Weighted Average)
        # Eye Contact: 60% (behavior more important)
        # Emotion: 40% (secondary indicator)
        final_confidence = (eye_contact_score * 0.6) + (emotion_score * 0.4)
        final_confidence = max(0, min(100, final_confidence))  # Clamp to 0-100
        
        return float(final_confidence)

    # ===== DEPRECATED OPENCV METHODS REMOVED =====
    # The following methods have been removed in favor of MediaPipe Tasks API:
    # - _calculate_eye_contact_opencv(): Replaced by calculate_gaze() and landmarks-based tracking
    # - _estimate_head_pose_opencv(): Replaced by calculate_simple_head_pose() with improved accuracy
    # MediaPipe provides 478 facial landmarks (468 face + 10 iris) for more accurate analysis
    # compared to OpenCV Haar Cascades which only provided bounding boxes.

analyzer = VideoAnalyzer()
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Video Service Running ✅',
        'service': 'video-analysis-ml',
        'status': 'active',
        'available_endpoints': [
            '/health',
            '/analyze-video'
        ]
    })
    
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
        
        # Optional: Interview metadata for MongoDB storage
        interview_id = data.get('interviewId')  # MongoDB ObjectId string
        candidate_id = data.get('candidateId')  # MongoDB ObjectId string
        question_id = data.get('questionId')    # Question number (int)
        
        logger.info(f"   Total frames received: {len(video_frames)}")
        logger.info(f"   Interview ID: {interview_id}, Candidate ID: {candidate_id}, Question ID: {question_id}")
        
        if not video_frames:
            logger.warning("⚠️  No video data provided")
            return jsonify({'error': 'No video data'}), 400
        
        # Reset frame counter for this request
        analyzer.frame_count = 0
        
        # Analyze valid frames
        logger.info("🎬 Starting frame-by-frame analysis...")
        frame_analyses = []
        total_frames = len(video_frames)
        for idx, frame in enumerate(video_frames, 1):
            if idx == 1 or idx == total_frames or idx % 5 == 0:
                logger.info(f"   Processing frame {idx}/{total_frames}")
            res = analyzer.analyze_frame(frame)
            if res:
                frame_analyses.append(res)
            else:
                logger.debug(f"   ⚠️  Frame {idx} analysis returned None")
        
        logger.info(f"   Successfully analyzed: {len(frame_analyses)}/{len(video_frames)} frames")
        
        # Store frames in MongoDB (if enabled and metadata provided)
        logger.info(f"📊 Storage check: storage={mongo_storage.storage is not None}, enabled={mongo_storage.storage.enabled if mongo_storage.storage else False}, interview_id={interview_id}, candidate_id={candidate_id}")
        if mongo_storage.storage and mongo_storage.storage.enabled and interview_id and candidate_id:
            try:
                stored_ids = mongo_storage.storage.store_frames_batch(
                    frame_analyses, 
                    interview_id, 
                    candidate_id, 
                    question_id
                )
                logger.info(f"📊 Stored {len(stored_ids)} frames in MongoDB")
            except Exception as e:
                logger.warning(f"⚠️  MongoDB storage failed: {e}")
                # Continue even if storage fails
        
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
    # Use VIDEO_SERVICE_PORT env var if set, otherwise default to 8002
    # (Ignore generic PORT variable which is meant for Node.js backend)
    port = int(os.environ.get('VIDEO_SERVICE_PORT', 8002))
    logger.info(f"🚀 Starting Video Analysis Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
