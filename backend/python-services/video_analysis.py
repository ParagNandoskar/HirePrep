#!/usr/bin/env python3
"""
Video Analysis Microservice

Analyzes video frames for emotion detection, eye contact, engagement, and confidence scoring.
Uses OpenCV, DeepFace, and MediaPipe for computer vision tasks.
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
        # A dictionary might be more useful for emotion mapping if you were using it
        # self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        pass

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
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.warning("Failed to decode frame image.")
                return None
            
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Analyze different aspects
            face_analysis = self._analyze_face(rgb_frame, frame)
            emotion_analysis = self._analyze_emotions_simple()
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
                    analysis['head_pose'] = self._estimate_head_pose()
            
            return analysis
            
        except Exception as e:
            logger.error(f"Face analysis error: {e}", exc_info=True)
            return {'face_detected': False, 'face_confidence': 0, 'eye_contact_score': 0, 'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0}}
    
    def _calculate_eye_contact(self, landmarks, frame) -> float:
        """
        Calculates a simulated eye contact score.
        (Placeholder for a more sophisticated implementation.)
        
        Args:
            landmarks: MediaPipe face landmarks.
            frame: The video frame.
            
        Returns:
            float: A simulated eye contact score between 0 and 100.
        """
        try:
            # NOTE: This is a placeholder. A real implementation would use 
            # gaze vector estimation from landmarks.
            return float(min(85, max(30, np.random.normal(65, 15))))
            
        except Exception as e:
            logger.error(f"Eye contact calculation error: {e}", exc_info=True)
            return 50.0
    
    def _estimate_head_pose(self) -> dict:
        """
        Estimates a simulated head pose.
        (Placeholder for a more sophisticated implementation.)
        
        Returns:
            dict: A dictionary of simulated pitch, yaw, and roll.
        """
        try:
            # NOTE: This is a placeholder. A real implementation would use
            # solvePnP with 3D and 2D landmark coordinates.
            return {
                'pitch': float(np.random.normal(0, 10)),
                'yaw': float(np.random.normal(0, 15)),
                'roll': float(np.random.normal(0, 5))
            }
        except Exception as e:
            logger.error(f"Head pose estimation error: {e}", exc_info=True)
            return {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0}
    
    def _analyze_emotions_simple(self) -> dict:
        """
        Simple emotion analysis.
        (Placeholder for DeepFace or other model integration.)
        
        Returns:
            dict: A dictionary of simulated emotion scores.
        """
        try:
            emotions = {
                'happy': max(0, np.random.normal(60, 20)),
                'neutral': max(0, np.random.normal(70, 15)),
                'confident': max(0, np.random.normal(65, 18)),
                'nervous': max(0, np.random.normal(25, 10)),
                'engaged': max(0, np.random.normal(75, 12))
            }
            
            # Normalize scores to sum to 100
            total = sum(emotions.values())
            if total > 0:
                return {k: (v / total) * 100 for k, v in emotions.items()}
            
            return {'neutral': 100.0}
            
        except Exception as e:
            logger.error(f"Emotion analysis error: {e}", exc_info=True)
            return {'neutral': 100.0}
    
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
    app.run(host='0.0.0.0', port=port, debug=False)