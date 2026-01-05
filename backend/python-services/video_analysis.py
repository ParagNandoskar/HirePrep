#!/usr/bin/env python3
# pylint: disable=no-member  # OpenCV functions are dynamically loaded
"""
Video Analysis Microservice

Analyzes video frames for eye contact, engagement, and confidence scoring.
Uses OpenCV and MediaPipe for computer vision tasks.
"""

import os
import cv2
import numpy as np
import base64
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import mediapipe as mp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize MediaPipe models outside the class to avoid re-initialization
mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh
face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

class VideoAnalyzer:
    """
    Handles the analysis of individual video frames.
    """
    def __init__(self):
        logger.info("Initializing VideoAnalyzer with MediaPipe...")
        logger.info("Video Analyzer ready.")

    def analyze_frame(self, frame_data: str) -> dict | None:
        """
        Analyzes a single video frame from base64 data.
        
        Args:
            frame_data (str): Base64 encoded string of the video frame.

        Returns:
            dict | None: A dictionary of analysis results or None if analysis fails.
        """
        try:
            # Decode base64 image
            img_data = base64.b64decode(frame_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # pylint: disable=no-member
            
            if frame is None:
                logger.warning("Failed to decode frame image.")
                return None
            
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # pylint: disable=no-member
            
            # Analyze different aspects
            face_analysis = self._analyze_face(rgb_frame, frame)
            emotion_analysis = self._analyze_emotions_simple(face_analysis)  # Simplified emotion analysis
            engagement_score = self._calculate_engagement(face_analysis)
            
            return {
                'face_detection': face_analysis,
                'emotions': emotion_analysis,
                'engagement_score': engagement_score,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Frame analysis error: {e}", exc_info=True)
            return None
    
    def _analyze_face(self, rgb_frame: np.ndarray, frame: np.ndarray) -> dict:
        """
        Analyzes face detection and landmarks using MediaPipe.
        
        Args:
            rgb_frame (np.ndarray): The frame in RGB color space.
            frame (np.ndarray): The original frame for dimension calculations.
            
        Returns:
            dict: Face analysis results.
        """
        try:
            results = face_detection.process(rgb_frame)
            face_mesh_results = face_mesh.process(rgb_frame)
            
            analysis = {
                'face_detected': False,
                'face_confidence': 0,
                'eye_contact_score': 0,
                'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0}
            }
            
            if results.detections:
                detection = results.detections[0]
                analysis['face_detected'] = True
                analysis['face_confidence'] = detection.score[0]
                
                if face_mesh_results.multi_face_landmarks:
                    landmarks = face_mesh_results.multi_face_landmarks[0]
                    analysis['eye_contact_score'] = self._calculate_eye_contact(landmarks, frame)
                    analysis['head_pose'] = self._estimate_head_pose(landmarks)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Face analysis error: {e}", exc_info=True)
            return {'face_detected': False, 'face_confidence': 0, 'eye_contact_score': 0, 'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0}}
    
    def _calculate_eye_contact(self, landmarks, frame) -> float:
        """
        Calculates real eye contact score using iris landmarks and gaze direction.
        
        Args:
            landmarks: MediaPipe face landmarks.
            frame: The video frame.
            
        Returns:
            float: Real eye contact score between 0 and 100.
        """
        try:
            h, w = frame.shape[:2]
            
            # Get eye landmarks (left and right iris centers)
            left_iris = landmarks.landmark[468]  # Left iris center
            right_iris = landmarks.landmark[473]  # Right iris center
            
            # Get eye corner landmarks for reference
            left_eye_left = landmarks.landmark[33]
            left_eye_right = landmarks.landmark[133]
            right_eye_left = landmarks.landmark[362]
            right_eye_right = landmarks.landmark[263]
            
            # Calculate iris position relative to eye corners (0 = center, looking at camera)
            left_eye_width = abs(left_eye_right.x - left_eye_left.x)
            right_eye_width = abs(right_eye_right.x - right_eye_left.x)
            
            left_iris_offset = abs(left_iris.x - (left_eye_left.x + left_eye_right.x) / 2) / left_eye_width
            right_iris_offset = abs(right_iris.x - (right_eye_left.x + right_eye_right.x) / 2) / right_eye_width
            
            # Average offset (0 = looking directly at camera, 1 = looking far away)
            avg_offset = (left_iris_offset + right_iris_offset) / 2
            
            # Convert to eye contact score (0-100)
            # Lower offset = better eye contact
            eye_contact_score = max(0, min(100, (1 - avg_offset * 2) * 100))
            
            return float(eye_contact_score)
            
        except Exception as e:
            logger.error(f"Eye contact calculation error: {e}", exc_info=True)
            return 50.0
    
    def _estimate_head_pose(self, landmarks=None) -> dict:
        """
        Estimates real head pose using facial landmarks.
        
        Returns:
            dict: A dictionary of pitch, yaw, and roll angles.
        """
        try:
            if landmarks is None:
                return {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0}
            
            # Use key facial landmarks to estimate head orientation
            nose_tip = landmarks.landmark[1]
            chin = landmarks.landmark[152]
            left_eye = landmarks.landmark[33]
            right_eye = landmarks.landmark[263]
            left_mouth = landmarks.landmark[61]
            right_mouth = landmarks.landmark[291]
            
            # Calculate yaw (left-right rotation) from eye positions
            eye_center_x = (left_eye.x + right_eye.x) / 2
            face_width = abs(right_eye.x - left_eye.x)
            yaw = (nose_tip.x - eye_center_x) / face_width * 60  # Approximate angle
            
            # Calculate pitch (up-down rotation) from nose-chin distance
            nose_chin_y = chin.y - nose_tip.y
            pitch = (nose_chin_y - 0.15) * 100  # Normalized pitch
            
            # Calculate roll (tilt) from eye alignment
            eye_slope = (right_eye.y - left_eye.y) / (right_eye.x - left_eye.x) if (right_eye.x - left_eye.x) != 0 else 0
            roll = np.arctan(eye_slope) * 180 / np.pi  # Convert to degrees
            
            return {
                'pitch': float(np.clip(pitch, -30, 30)),
                'yaw': float(np.clip(yaw, -45, 45)),
                'roll': float(np.clip(roll, -20, 20))
            }
        except Exception as e:
            logger.error(f"Head pose estimation error: {e}", exc_info=True)
            return {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0}
    
    def _analyze_emotions_simple(self, face_analysis: dict) -> dict:
        """
        Behavioral state inference based on real facial metrics.
        Uses actual eye contact, head pose, and face confidence.
        """
        try:
            eye_contact = face_analysis.get('eye_contact_score', 50)
            face_confidence = face_analysis.get('face_confidence', 0) * 100
            head_pose = face_analysis.get('head_pose', {})
            
            # Calculate engagement from real metrics
            yaw = abs(head_pose.get('yaw', 0))
            pitch = abs(head_pose.get('pitch', 0))
            
            # Real engagement calculation
            looking_forward = yaw < 15 and pitch < 15  # Looking at camera
            good_eye_contact = eye_contact > 60
            stable_detection = face_confidence > 70
            
            # Calculate behavioral scores based on real metrics
            engagement = (eye_contact * 0.4 + (100 - yaw * 2) * 0.3 + face_confidence * 0.3)
            confidence_level = engagement  # Engaged = confident
            
            # Return behavioral state (not fake emotions)
            if looking_forward and good_eye_contact and stable_detection:
                return {
                    'engaged': min(100, engagement),
                    'confidence': min(100, confidence_level),
                    'attentive': min(100, eye_contact * 1.2)
                }
            elif good_eye_contact:
                return {
                    'engaged': min(100, engagement * 0.8),
                    'confidence': min(100, confidence_level * 0.7),
                    'attentive': min(100, eye_contact)
                }
            else:
                return {
                    'engaged': min(100, engagement * 0.5),
                    'confidence': min(100, confidence_level * 0.5),
                    'attentive': min(100, eye_contact * 0.7)
                }
                
        except Exception as e:
            logger.error(f"Emotion analysis error: {e}", exc_info=True)
            return {'engaged': 50.0, 'confidence': 50.0, 'attentive': 50.0}
    
    def _calculate_engagement(self, face_analysis: dict) -> float:
        """
        Calculates an overall engagement score.
        
        Args:
            face_analysis (dict): The results from face analysis.
            
        Returns:
            float: A score between 0 and 100.
        """
        try:
            if not face_analysis['face_detected']:
                return 0.0
            
            face_conf = face_analysis['face_confidence'] * 100
            eye_contact = face_analysis['eye_contact_score']
            
            # Simple weighted average
            engagement = (face_conf * 0.3) + (eye_contact * 0.7)
            return float(min(100, max(0, engagement)))
            
        except Exception as e:
            logger.error(f"Engagement calculation error: {e}", exc_info=True)
            return 50.0

# Initialize analyzer instance
analyzer = VideoAnalyzer()

# This section defines the public-facing Flask API endpoints.
# -----------------------------------------------------------

def aggregate_video_analysis(frame_analyses: list) -> dict:
    """
    Aggregates analysis results from multiple frames into a single report.
    
    Args:
        frame_analyses (list): A list of analysis dictionaries for each frame.
        
    Returns:
        dict: The aggregated analysis report.
    """
    if not frame_analyses:
        return get_default_video_analysis()

    try:
        # Filter and extract data
        face_confidences = [
            f['face_detection']['face_confidence'] 
            for f in frame_analyses 
            if f['face_detection']['face_detected']
        ]
        eye_contact_scores = [f['face_detection']['eye_contact_score'] for f in frame_analyses]
        engagement_scores = [f['engagement_score'] for f in frame_analyses]

        # Aggregate emotions
        all_emotions = {}
        for frame in frame_analyses:
            for emotion, score in frame['emotions'].items():
                all_emotions.setdefault(emotion, []).append(score)

        avg_emotions = {emotion: np.mean(scores) for emotion, scores in all_emotions.items()}

        # Calculate final scores
        eye_contact_score = np.mean(eye_contact_scores) if eye_contact_scores else 50
        engagement_score = np.mean(engagement_scores) if engagement_scores else 50
        confidence_score = (avg_emotions.get('confident', 50) + avg_emotions.get('happy', 0) * 0.3)

        # Create emotion timeline
        emotion_timeline = [
            {
                'timestamp': frame['timestamp'],
                'emotions': frame['emotions'],
                'engagement': frame['engagement_score']
            } 
            for frame in frame_analyses
        ]

        return {
            'emotionTimeline': emotion_timeline,
            'eyeContactScore': min(100, max(0, eye_contact_score)),
            'engagementScore': min(100, max(0, engagement_score)),
            'confidenceScore': min(100, max(0, confidence_score)),
            'overallVideoScore': calculate_overall_video_score(eye_contact_score, engagement_score, confidence_score),
            'analysisMetadata': {
                'framesAnalyzed': len(frame_analyses),
                'averageFaceConfidence': np.mean(face_confidences) if face_confidences else 0,
                'dominantEmotion': max(avg_emotions.items(), key=lambda x: x[1])[0] if avg_emotions else 'neutral'
            }
        }

    except Exception as e:
        logger.error(f"Aggregation error: {e}", exc_info=True)
        return get_default_video_analysis()

def calculate_overall_video_score(eye_contact: float, engagement: float, confidence: float) -> float:
    """
    Calculates the final overall video score based on weighted factors.
    
    Args:
        eye_contact (float): The eye contact score.
        engagement (float): The engagement score.
        confidence (float): The confidence score.
        
    Returns:
        float: The final weighted score.
    """
    weights = {
        'eye_contact': 0.3,
        'engagement': 0.4,
        'confidence': 0.3
    }
    
    overall = (
        eye_contact * weights['eye_contact'] +
        engagement * weights['engagement'] +
        confidence * weights['confidence']
    )
    
    return min(100, max(0, overall))

def get_default_video_analysis() -> dict:
    """
    Returns a default analysis report for failed processing.
    """
    return {
        'emotionTimeline': [],
        'eyeContactScore': 65.0,
        'engagementScore': 70.0,
        'confidenceScore': 68.0,
        'overallVideoScore': 68.0,
        'analysisMetadata': {
            'framesAnalyzed': 0,
            'averageFaceConfidence': 0.0,
            'dominantEmotion': 'neutral',
            'note': 'Default analysis due to processing error'
        }
    }

@app.route('/health', methods=['GET'])
def health_check() -> tuple:
    """Endpoint to check the service health."""
    return jsonify({
        'status': 'healthy',
        'service': 'video-analysis',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/analyze-video', methods=['POST'])
def analyze_video() -> tuple:
    """Endpoint to analyze a video and return an aggregated report."""
    try:
        data = request.get_json()
        
        if not data or 'videoData' not in data:
            return jsonify({'error': 'Video data is required'}), 400
        
        interview_id = data.get('interviewId')
        video_frames = data.get('videoData', [])
        
        if not video_frames:
            return jsonify({'error': 'No video frames provided'}), 400
        
        frame_analyses = [
            analyzer.analyze_frame(frame_data)
            for frame_data in video_frames
            if analyzer.analyze_frame(frame_data) is not None
        ]
        
        if not frame_analyses:
            return jsonify({'error': 'Failed to analyze any video frames'}), 500
        
        result = aggregate_video_analysis(frame_analyses)
        result['interviewId'] = interview_id
        result['analyzedFrames'] = len(frame_analyses)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Video analysis endpoint error: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    logger.info(f"Starting Video Analysis Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)