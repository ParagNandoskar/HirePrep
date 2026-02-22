#!/usr/bin/env python3
"""
Unified Video Analysis Testing Script
All-in-one script for comprehensive video analysis testing:
- Captures frames from webcam
- Sends to video analysis service (optional)
- Performs detailed frame-by-frame analysis
- Generates comparison tables and reports
- Provides feedback messages in CSV format
"""

import os
import cv2
import numpy as np
import base64
import json
import time
import requests
import pandas as pd
from datetime import datetime
from deepface import DeepFace
import mediapipe as mp

# ============================================================================
# CONFIGURATION
# ============================================================================
OUTPUT_DIR = "captured_frames"
CAPTURE_DURATION = 5  # seconds (10 frames over 5 seconds)
CAPTURE_INTERVAL = 0.5  # seconds between frames
SERVICE_URL = 'http://localhost:8001/analyze-video'

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Initialize OpenCV face detection (fallback)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# ============================================================================
# VIDEO ANALYSIS TESTING CLASS
# ============================================================================
class VideoAnalysisTester:
    def __init__(self):
        self.captured_frames = []
        self.frame_paths = []
        self.service_results = None
        self.detailed_results = []
        self.baseline_yaw = None
        self.baseline_pitch = None
        
    # ========================================================================
    # STEP 1: CAPTURE FRAMES
    # ========================================================================
    def capture_frames(self):
        """Capture frames from webcam"""
        print("\n" + "=" * 70)
        print("🎥 STEP 1: CAPTURING FRAMES FROM WEBCAM")
        print("=" * 70)
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Could not open webcam")
            return False
        
        # Create output directory
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
        else:
            # Clean old frames
            for f in os.listdir(OUTPUT_DIR):
                if f.endswith('.jpg'):
                    os.remove(os.path.join(OUTPUT_DIR, f))
        
        total_frames = int(CAPTURE_DURATION / CAPTURE_INTERVAL)
        
        print(f"📸 Capturing {total_frames} frames over {CAPTURE_DURATION} seconds (every {CAPTURE_INTERVAL}s)...")
        print(f"📂 Saving frames to '{OUTPUT_DIR}/'...\n")

        for i in range(total_frames):
            loop_start = time.time()
            
            ret, frame = cap.read()
            if ret:
                # Save frame
                filename = f"{OUTPUT_DIR}/frame_{i+1}.jpg"
                cv2.imwrite(filename, frame)
                self.frame_paths.append(filename)
                
                # Encode frame to base64 for service
                _, buffer = cv2.imencode('.jpg', frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                self.captured_frames.append(frame_b64)
                
                print(f"   [{i+1}/{total_frames}] Saved {filename} ({frame.shape})")
            else:
                print(f"   ⚠️ Failed to capture frame {i+1}")

            # Sleep to match interval
            elapsed = time.time() - loop_start
            if elapsed < CAPTURE_INTERVAL:
                time.sleep(CAPTURE_INTERVAL - elapsed)
        
        cap.release()
        
        if len(self.captured_frames) == 0:
            print("❌ No frames captured")
            return False
        
        print(f"\n✅ Successfully captured {len(self.captured_frames)} frames")
        return True
    
    # ========================================================================
    # STEP 2: SEND TO SERVICE (OPTIONAL)
    # ========================================================================
    def send_to_service(self):
        """Send frames to video analysis service"""
        print("\n" + "=" * 70)
        print("🚀 STEP 2: SENDING TO VIDEO ANALYSIS SERVICE")
        print("=" * 70)
        
        try:
            print(f"📤 Sending {len(self.captured_frames)} frames to {SERVICE_URL}...")
            
            response = requests.post(
                SERVICE_URL,
                json={'videoData': self.captured_frames},
                timeout=30
            )
            
            print(f"✅ Status Code: {response.status_code}")
            
            if response.status_code == 200:
                self.service_results = response.json()
                print("\n📊 Service Results:")
                print(json.dumps(self.service_results, indent=2))
                
                print("\n📈 Key Metrics from Service:")
                print(f"   Overall Score: {self.service_results.get('overallVideoScore', 0):.1f}/100")
                print(f"   Eye Contact: {self.service_results.get('eyeContactScore', 0):.1f}/100")
                print(f"   Confidence: {self.service_results.get('confidenceScore', 0):.1f}/100")
                print(f"   Engagement: {self.service_results.get('engagementScore', 0):.1f}/100")
                print(f"   Dominant Emotion: {self.service_results.get('analysisMetadata', {}).get('dominantEmotion', 'unknown')}")
                
                return True
            else:
                print(f"❌ Error: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("⚠️  Could not connect to service. Skipping service test.")
            print("   (Service may not be running on port 8001)")
            return False
        except Exception as e:
            print(f"⚠️  Service error: {e}")
            return False
    
    # ========================================================================
    # STEP 3: DETAILED FRAME ANALYSIS WITH MEDIAPIPE
    # ========================================================================
    def analyze_frame_detailed(self, frame_path, frame_number):
        """Detailed analysis of a single frame using MediaPipe + DeepFace"""
        frame = cv2.imread(frame_path)
        if frame is None:
            return None
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width = frame.shape[:2]
        
        result = {
            'frame_number': frame_number,
            'frame_path': frame_path,
            'face_detected': False,
            'face_confidence': 0.0,
            'face_size_percent': 0.0,
            'face_centered': False,
            'eye_contact_score': 0.0,
            'eyes_detected': 0,
            'head_pose_yaw': 0.0,
            'head_pose_pitch': 0.0,
            'head_pose_roll': 0.0,
            'gaze_direction_x': 0.0,
            'gaze_direction_y': 0.0,
            'eye_blink_left': 0.0,
            'eye_blink_right': 0.0,
            'mouth_openness': 0.0,
            'face_landmarks_count': 0,
            'brightness': float(np.mean(gray)),
            'emotion_happy': 0.0,
            'emotion_neutral': 0.0,
            'emotion_sad': 0.0,
            'emotion_fear': 0.0,
            'emotion_angry': 0.0,
            'emotion_surprise': 0.0,
            'emotion_disgust': 0.0,
            'dominant_emotion': 'unknown',
            'emotion_confidence': 0.0,
            'positive_emotion_score': 0.0,
            'negative_emotion_score': 0.0,
            'video_confidence': 0.0,
            'looking_away_score': 0.0,
            'attention_score': 0.0,
            'assessment': '',
            'feedback_message': ''
        }
        
        # MediaPipe Face Mesh Analysis
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            
            results_mp = face_mesh.process(rgb_frame)
            
            if results_mp.multi_face_landmarks:
                result['face_detected'] = True
                face_landmarks = results_mp.multi_face_landmarks[0]
                result['face_landmarks_count'] = len(face_landmarks.landmark)
                
                # Extract key landmarks for analysis
                landmarks = face_landmarks.landmark
                
                # Calculate 3D head pose using facial landmarks
                head_pose = self._calculate_head_pose_mediapipe(landmarks, width, height)
                result['head_pose_yaw'] = head_pose['yaw']
                result['head_pose_pitch'] = head_pose['pitch']
                result['head_pose_roll'] = head_pose['roll']
                result['face_confidence'] = 98.0
                
                # Calculate gaze direction from iris landmarks
                gaze = self._calculate_gaze_direction(landmarks, width, height)
                result['gaze_direction_x'] = gaze['x']
                result['gaze_direction_y'] = gaze['y']
                
                # Eye openness / blink detection
                eye_metrics = self._calculate_eye_metrics(landmarks)
                result['eye_blink_left'] = eye_metrics['left_openness']
                result['eye_blink_right'] = eye_metrics['right_openness']
                result['eyes_detected'] = 2 if (eye_metrics['left_openness'] > 0.2 and eye_metrics['right_openness'] > 0.2) else 0
                
                # Mouth openness (speaking detection)
                result['mouth_openness'] = self._calculate_mouth_openness(landmarks)
                
                # Eye contact score (based on gaze direction)
                result['eye_contact_score'] = self._calculate_eye_contact_mediapipe(gaze, head_pose)
                
                # Face size and centering
                face_bbox = self._get_face_bbox(landmarks, width, height)
                if face_bbox:
                    x, y, w, h = face_bbox
                    face_area = w * h
                    frame_area = width * height
                    result['face_size_percent'] = float((face_area / frame_area) * 100)
                    
                    face_center_x = x + w / 2
                    face_center_y = y + h / 2
                    frame_center_x = width / 2
                    frame_center_y = height / 2
                    offset_x = abs(face_center_x - frame_center_x) / width
                    offset_y = abs(face_center_y - frame_center_y) / height
                    result['face_centered'] = offset_x < 0.15 and offset_y < 0.15
                
                # Emotion analysis with DeepFace
                try:
                    emotions = DeepFace.analyze(
                        img_path=frame,
                        actions=['emotion'],
                        enforce_detection=False,
                        detector_backend='opencv',
                        silent=True
                    )
                    
                    if emotions:
                        emotion_data = emotions[0]['emotion']
                        result['emotion_happy'] = emotion_data.get('happy', 0.0)
                        result['emotion_neutral'] = emotion_data.get('neutral', 0.0)
                        result['emotion_sad'] = emotion_data.get('sad', 0.0)
                        result['emotion_fear'] = emotion_data.get('fear', 0.0)
                        result['emotion_angry'] = emotion_data.get('angry', 0.0)
                        result['emotion_surprise'] = emotion_data.get('surprise', 0.0)
                        result['emotion_disgust'] = emotion_data.get('disgust', 0.0)
                        result['dominant_emotion'] = emotions[0]['dominant_emotion']
                        
                        positive = result['emotion_happy'] + result['emotion_neutral'] + result['emotion_surprise']
                        negative = result['emotion_sad'] + result['emotion_fear'] + result['emotion_angry'] + result['emotion_disgust']
                        total_emotion = positive + negative
                        
                        if total_emotion > 0:
                            result['positive_emotion_score'] = (positive / total_emotion) * 100
                            result['negative_emotion_score'] = (negative / total_emotion) * 100
                            result['emotion_confidence'] = max(emotion_data.values())
                        
                except Exception as e:
                    pass
                
                # Calculate looking away score (0-100, 0 = straight, 100 = completely away)
                result['looking_away_score'] = self._calculate_looking_away_score(head_pose, gaze)
                
                # Calculate attention score (0-100, 100 = perfect attention)
                result['attention_score'] = 100 - result['looking_away_score']
                
                # Calculate overall video confidence
                eye_score = result['eye_contact_score']
                emotion_score = result['positive_emotion_score']
                attention_score = result['attention_score']
                
                # Weighted scoring: 30% eye contact, 30% attention, 40% emotion
                result['video_confidence'] = (eye_score * 0.3) + (attention_score * 0.3) + (emotion_score * 0.4)
                
                # Assessment and feedback
                result['assessment'] = self._get_assessment(result)
                result['feedback_message'] = self._get_feedback_message(result)
            else:
                # No face detected by MediaPipe, try OpenCV fallback
                faces = face_cascade.detectMultiScale(gray, 1.2, 3)
                if len(faces) > 0:
                    result['face_detected'] = True
                    result['face_confidence'] = 70.0
                    result['assessment'] = '⚠️  Face detected but tracking failed'
                    result['feedback_message'] = 'Face not clear - improve lighting or angle'
                else:
                    result['assessment'] = '❌ No face detected'
                    result['feedback_message'] = 'No face detected in frame'
        
        return result
    
    def _calculate_head_pose_mediapipe(self, landmarks, width, height):
        """Calculate 3D head pose from MediaPipe facial landmarks"""
        try:
            # Key landmarks for head pose estimation
            # Nose tip: 1, Chin: 152, Left eye corner: 33, Right eye corner: 263
            # Left mouth corner: 61, Right mouth corner: 291
            
            nose_tip = landmarks[1]
            chin = landmarks[152]
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            left_mouth = landmarks[61]
            right_mouth = landmarks[291]
            
            # Convert to image coordinates
            nose_2d = (nose_tip.x * width, nose_tip.y * height)
            chin_2d = (chin.x * width, chin.y * height)
            left_eye_2d = (left_eye.x * width, left_eye.y * height)
            right_eye_2d = (right_eye.x * width, right_eye.y * height)
            
            # Calculate yaw (left-right rotation)
            # Left eye to right eye horizontal distance
            eye_distance_x = right_eye_2d[0] - left_eye_2d[0]
            expected_eye_distance = width * 0.3  # Expected distance when facing forward
            
            # Yaw calculation: positive = looking right, negative = looking left
            if eye_distance_x > 0:
                yaw = ((expected_eye_distance - eye_distance_x) / expected_eye_distance) * 45
            else:
                yaw = 0
            
            # More accurate yaw from nose position relative to eye midpoint
            eye_midpoint_x = (left_eye_2d[0] + right_eye_2d[0]) / 2
            nose_offset = (nose_2d[0] - eye_midpoint_x) / (expected_eye_distance / 2)
            yaw = -nose_offset * 30  # Scale to degrees
            
            # Calculate pitch (up-down rotation)
            # Nose to chin vertical distance
            nose_chin_distance = chin_2d[1] - nose_2d[1]
            expected_nose_chin = height * 0.15
            
            # Pitch calculation: positive = looking down, negative = looking up
            pitch = ((nose_chin_distance - expected_nose_chin) / expected_nose_chin) * 30
            
            # Calculate roll (head tilt)
            # Angle between eyes
            eye_angle = np.arctan2(right_eye_2d[1] - left_eye_2d[1], 
                                   right_eye_2d[0] - left_eye_2d[0])
            roll = np.degrees(eye_angle)
            
            return {
                'yaw': float(np.clip(yaw, -90, 90)),
                'pitch': float(np.clip(pitch, -90, 90)),
                'roll': float(np.clip(roll, -90, 90))
            }
        except Exception as e:
            return {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0}
    
    def _calculate_gaze_direction(self, landmarks, width, height):
        """Calculate gaze direction from iris tracking"""
        try:
            # MediaPipe Face Mesh provides iris landmarks (468-478)
            # Left iris: 468-472, Right iris: 473-477
            left_iris_center = landmarks[468]
            right_iris_center = landmarks[473]
            
            # Left eye outer corners
            left_eye_left = landmarks[33]
            left_eye_right = landmarks[133]
            right_eye_left = landmarks[362]
            right_eye_right = landmarks[263]
            
            # Calculate iris position relative to eye corners
            left_eye_width = abs((left_eye_right.x - left_eye_left.x) * width)
            right_eye_width = abs((right_eye_right.x - right_eye_left.x) * width)
            
            if left_eye_width > 0:
                # Gaze X: -1 (left) to +1 (right)
                left_gaze_x = ((left_iris_center.x * width) - (left_eye_left.x * width)) / left_eye_width
                left_gaze_x = (left_gaze_x - 0.5) * 2  # Normalize to -1 to 1
            else:
                left_gaze_x = 0
            
            if right_eye_width > 0:
                right_gaze_x = ((right_iris_center.x * width) - (right_eye_left.x * width)) / right_eye_width
                right_gaze_x = (right_gaze_x - 0.5) * 2
            else:
                right_gaze_x = 0
            
            # Average both eyes
            gaze_x = (left_gaze_x + right_gaze_x) / 2
            
            # Gaze Y (up-down)
            left_eye_top = landmarks[159]
            left_eye_bottom = landmarks[145]
            left_eye_height = abs((left_eye_bottom.y - left_eye_top.y) * height)
            
            if left_eye_height > 0:
                gaze_y = ((left_iris_center.y * height) - (left_eye_top.y * height)) / left_eye_height
                gaze_y = (gaze_y - 0.5) * 2
            else:
                gaze_y = 0
            
            return {
                'x': float(np.clip(gaze_x, -1, 1)),
                'y': float(np.clip(gaze_y, -1, 1))
            }
        except Exception as e:
            return {'x': 0.0, 'y': 0.0}
    
    def _calculate_eye_metrics(self, landmarks):
        """Calculate eye openness (blink detection)"""
        try:
            # Left eye landmarks: top: 159, bottom: 145
            # Right eye landmarks: top: 386, bottom: 374
            left_eye_top = landmarks[159]
            left_eye_bottom = landmarks[145]
            left_eye_left = landmarks[33]
            left_eye_right = landmarks[133]
            
            right_eye_top = landmarks[386]
            right_eye_bottom = landmarks[374]
            right_eye_left = landmarks[362]
            right_eye_right = landmarks[263]
            
            # Calculate eye aspect ratio (EAR)
            # Vertical distance / Horizontal distance
            left_vertical = abs(left_eye_top.y - left_eye_bottom.y)
            left_horizontal = abs(left_eye_right.x - left_eye_left.x)
            
            right_vertical = abs(right_eye_top.y - right_eye_bottom.y)
            right_horizontal = abs(right_eye_right.x - right_eye_left.x)
            
            left_ear = left_vertical / (left_horizontal + 1e-6)
            right_ear = right_vertical / (right_horizontal + 1e-6)
            
            # Normalize EAR to 0-1 scale (0 = closed, 1 = wide open)
            # Typical EAR is around 0.2-0.4 when open, <0.15 when closed
            left_openness = np.clip(left_ear / 0.3, 0, 1)
            right_openness = np.clip(right_ear / 0.3, 0, 1)
            
            return {
                'left_openness': float(left_openness),
                'right_openness': float(right_openness)
            }
        except Exception as e:
            return {'left_openness': 0.5, 'right_openness': 0.5}
    
    def _calculate_mouth_openness(self, landmarks):
        """Calculate mouth openness (speaking detection)"""
        try:
            # Mouth landmarks: top: 13, bottom: 14, left: 61, right: 291
            mouth_top = landmarks[13]
            mouth_bottom = landmarks[14]
            mouth_left = landmarks[61]
            mouth_right = landmarks[291]
            
            # Calculate mouth aspect ratio
            vertical = abs(mouth_bottom.y - mouth_top.y)
            horizontal = abs(mouth_right.x - mouth_left.x)
            
            mouth_ratio = vertical / (horizontal + 1e-6)
            
            # Normalize to 0-1 scale (0 = closed, 1 = wide open)
            # Typical mouth ratio: <0.3 closed, 0.3-0.7 talking, >0.7 wide open
            openness = np.clip(mouth_ratio / 0.7, 0, 1)
            
            return float(openness)
        except Exception as e:
            return 0.0
    
    def _calculate_eye_contact_mediapipe(self, gaze, head_pose):
        """Calculate eye contact score from gaze and head pose"""
        try:
            # Perfect eye contact: gaze at (0,0) and head straight (yaw=0, pitch=0)
            gaze_deviation = np.sqrt(gaze['x']**2 + gaze['y']**2)  # 0 to ~1.4
            head_deviation = np.sqrt(head_pose['yaw']**2 + head_pose['pitch']**2) / 90  # Normalize
            
            # Combined score: 70% gaze, 30% head position
            deviation_score = (gaze_deviation * 0.7) + (head_deviation * 0.3)
            
            # Convert to 0-100 scale (0 = poor, 100 = excellent)
            eye_contact_score = max(0, 100 - (deviation_score * 100))
            
            return float(eye_contact_score)
        except Exception as e:
            return 50.0
    
    def _calculate_looking_away_score(self, head_pose, gaze):
        """Calculate how much person is looking away (0 = straight, 100 = completely away)"""
        try:
            # Head pose contribution (40%)
            yaw_score = min(abs(head_pose['yaw']) / 45 * 100, 100)  # 0-45° = 0-100
            pitch_score = min(abs(head_pose['pitch']) / 30 * 100, 100)  # 0-30° = 0-100
            head_score = (yaw_score + pitch_score) / 2
            
            # Gaze contribution (60%)
            gaze_deviation = np.sqrt(gaze['x']**2 + gaze['y']**2)
            gaze_score = min(gaze_deviation / 1.0 * 100, 100)
            
            # Combined score
            looking_away = (head_score * 0.4) + (gaze_score * 0.6)
            
            return float(np.clip(looking_away, 0, 100))
        except Exception as e:
            return 0.0
    
    def _get_face_bbox(self, landmarks, width, height):
        """Get bounding box from landmarks"""
        try:
            x_coords = [lm.x * width for lm in landmarks]
            y_coords = [lm.y * height for lm in landmarks]
            
            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)
            
            w = x_max - x_min
            h = y_max - y_min
            
            return (int(x_min), int(y_min), int(w), int(h))
        except Exception as e:
            return None
    
    def _calculate_eye_contact(self, eyes, face_width, face_height):
        """Calculate eye contact score"""
        try:
            if len(eyes) < 2:
                return 50.0
            
            eyes_sorted = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
            eye1, eye2 = eyes_sorted[0], eyes_sorted[1]
            
            eye1_center_x = eye1[0] + eye1[2] / 2
            eye2_center_x = eye2[0] + eye2[2] / 2
            
            face_center_x = face_width / 2
            avg_eye_x = (eye1_center_x + eye2_center_x) / 2
            offset = abs(avg_eye_x - face_center_x) / face_width
            
            eye_contact_score = max(0.0, min(100.0, (1 - offset * 1.5) * 100))
            return float(eye_contact_score)
            
        except Exception as e:
            return 50.0
    
    def _estimate_head_pose(self, x, y, w, h, frame_width, frame_height):
        """Estimate head pose"""
        try:
            face_center_x = x + w / 2
            face_center_y = y + h / 2
            frame_center_x = frame_width / 2
            frame_center_y = frame_height / 2
            
            # When you look right, face moves left in frame (negative offset)
            # But yaw should be positive for "looking right" from user's perspective
            # So we invert the sign
            yaw = -((face_center_x - frame_center_x) / frame_width) * 60
            pitch = ((face_center_y - frame_center_y) / frame_height) * 60
            
            return {
                'yaw': float(max(-90, min(90, yaw))),
                'pitch': float(max(-90, min(90, pitch)))
            }
        except Exception as e:
            return {'yaw': 0.0, 'pitch': 0.0}
    
    def _get_assessment(self, result):
        """Provide assessment based on metrics"""
        conf = result['video_confidence']
        looking_away = result.get('looking_away_score', 0)
        attention = result.get('attention_score', 100)
        yaw = abs(result['head_pose_yaw'])
        pitch = abs(result['head_pose_pitch'])
        
        # Check if looking away (looking_away_score > 30 = distracted)
        if looking_away > 30:
            if yaw > 15:
                direction = "right" if result['head_pose_yaw'] > 0 else "left"
                return f"⚠️  Looking {direction} (yaw: {result['head_pose_yaw']:.1f}°, away: {looking_away:.0f}%)"
            elif pitch > 15:
                direction = "down" if result['head_pose_pitch'] > 0 else "up"
                return f"⚠️  Looking {direction} (pitch: {result['head_pose_pitch']:.1f}°, away: {looking_away:.0f}%)"
            else:
                return f"⚠️  Distracted (attention: {attention:.0f}%, away: {looking_away:.0f}%)"
        
        if conf >= 75:
            return f"✅ Excellent (conf: {conf:.0f}%, attention: {attention:.0f}%)"
        elif conf >= 60:
            return f"👍 Good (conf: {conf:.0f}%, attention: {attention:.0f}%)"
        elif conf >= 45:
            return f"⚠️  Fair (conf: {conf:.0f}%, attention: {attention:.0f}%)"
        else:
            return f"❌ Poor (conf: {conf:.0f}%, attention: {attention:.0f}%)"
    
    def _get_feedback_message(self, result):
        """Generate feedback message for the frame"""
        yaw = abs(result['head_pose_yaw'])
        pitch = abs(result['head_pose_pitch'])
        eye_contact = result['eye_contact_score']
        
        # Check if looking away
        if yaw > 5:
            direction = "right" if result['head_pose_yaw'] > 0 else "left"
            return f"Don't look away from the screen (looking {direction})"
        elif pitch > 15:
            direction = "up" if result['head_pose_pitch'] < 0 else "down"
            return f"Don't look away from the screen (looking {direction})"
        elif eye_contact < 45:
            return "Maintain eye contact with the camera"
        else:
            return "Good job! Keep it up"
    
    def analyze_all_frames(self):
        """Perform detailed analysis on all captured frames"""
        print("\n" + "=" * 70)
        print("🔍 STEP 3: DETAILED FRAME-BY-FRAME ANALYSIS")
        print("=" * 70)
        
        print(f"\n📂 Analyzing {len(self.frame_paths)} frames...\n")
        
        # First pass: analyze all frames
        first_pass_results = []
        for idx, frame_path in enumerate(self.frame_paths, 1):
            print(f"[{idx}/{len(self.frame_paths)}] Analyzing {frame_path}...", end=" ")
            result = self.analyze_frame_detailed(frame_path, idx)
            if result:
                first_pass_results.append(result)
                status = "✅" if result['face_detected'] else "❌"
                eyes = result['eyes_detected']
                eye_contact = result['eye_contact_score']
                print(f"{status} Raw Yaw: {result['head_pose_yaw']:.1f}° | Eyes: {eyes} | Contact: {eye_contact:.1f}")
            else:
                print("❌ Failed")
        
        # Calculate baseline from first few good frames
        self._calculate_baseline(first_pass_results)
        
        # Second pass: adjust with baseline and recalculate assessments
        print(f"\n🎯 Calibrating with baseline (Yaw: {self.baseline_yaw:.1f}°, Pitch: {self.baseline_pitch:.1f}°)...\n")
        
        for result in first_pass_results:
            if result['face_detected']:
                # Adjust yaw and pitch relative to baseline
                result['head_pose_yaw'] -= self.baseline_yaw
                result['head_pose_pitch'] -= self.baseline_pitch
                
                # Recalculate video confidence with adjusted pose
                eye_score = result['eye_contact_score']
                emotion_score = result['positive_emotion_score']
                yaw = abs(result['head_pose_yaw'])
                pitch = abs(result['head_pose_pitch'])
                
                if yaw > 5 or pitch > 15:
                    looking_away_penalty = min(yaw / 10 * 20, 40)
                    base_score = (eye_score * 0.6) + (emotion_score * 0.4)
                    result['video_confidence'] = max(0, base_score - looking_away_penalty)
                else:
                    result['video_confidence'] = (eye_score * 0.4) + (emotion_score * 0.6)
                
                # Recalculate assessment and feedback
                result['assessment'] = self._get_assessment(result)
                result['feedback_message'] = self._get_feedback_message(result)
            
            self.detailed_results.append(result)
        
        print(f"✅ Analyzed {len(self.detailed_results)}/{len(self.frame_paths)} frames")
        return True
    
    def _calculate_baseline(self, results):
        """Calculate baseline head pose from first few good frames"""
        # Get frames with detected faces from first half of video
        # CRITICAL: Only use frames with exactly 2 eyes detected (quality filter)
        good_frames = [r for r in results[:12] if 
                      r['face_detected'] and 
                      r['eyes_detected'] == 2 and 
                      r['eye_contact_score'] > 50]
        
        if len(good_frames) >= 3:
            # Use median instead of mean for robustness against outliers
            yaw_values = [r['head_pose_yaw'] for r in good_frames]
            pitch_values = [r['head_pose_pitch'] for r in good_frames]
            
            # Check variance to detect unstable detection
            import statistics
            if len(yaw_values) >= 3:
                yaw_std = statistics.stdev(yaw_values)
                if yaw_std > 15:
                    print(f"\n⚠️  WARNING: High variance in head pose detected (std: {yaw_std:.1f}°)")
                    print(f"   This may indicate unstable face detection or movement during baseline")
                    print(f"   Yaw values: {[f'{y:.1f}°' for y in yaw_values]}")
            
            yaw_values.sort()
            pitch_values.sort()
            
            # Get median value
            mid = len(yaw_values) // 2
            self.baseline_yaw = yaw_values[mid]
            self.baseline_pitch = pitch_values[mid]
            
            print(f"\n✅ Baseline calibrated from {len(good_frames)} quality frames (2 eyes, good contact)")
            print(f"   Median Yaw: {self.baseline_yaw:.1f}°, Median Pitch: {self.baseline_pitch:.1f}°")
            print(f"   Frames used: {', '.join(str(r['frame_number']) for r in good_frames)}")
        else:
            # No baseline available
            self.baseline_yaw = 0.0
            self.baseline_pitch = 0.0
            print(f"\n⚠️  Insufficient quality frames ({len(good_frames)} found), using 0° as reference")
            print(f"   Tip: Ensure good lighting and face the camera directly for first few frames")
    
    # ========================================================================
    # STEP 4: GENERATE REPORTS
    # ========================================================================
    def generate_comparison_tables(self):
        """Generate comprehensive comparison tables"""
        if not self.detailed_results:
            print("❌ No results to display")
            return
        
        df = pd.DataFrame(self.detailed_results)
        
        print("\n" + "=" * 70)
        print("📊 STEP 4: COMPREHENSIVE COMPARISON TABLES")
        print("=" * 70)
        
        # Core Metrics
        print("\n" + "─" * 70)
        print("🎯 CORE METRICS")
        print("─" * 70)
        core_cols = ['frame_number', 'face_detected', 'eye_contact_score', 
                     'video_confidence', 'dominant_emotion', 'assessment']
        print(df[core_cols].to_string(index=False))
        
        # Eye & Head Tracking
        print("\n" + "─" * 70)
        print("👁️  EYE & HEAD TRACKING")
        print("─" * 70)
        eye_cols = ['frame_number', 'eyes_detected', 'eye_contact_score', 
                    'head_pose_yaw', 'head_pose_pitch', 'face_centered']
        print(df[eye_cols].to_string(index=False))
        
        # Feedback Messages
        print("\n" + "─" * 70)
        print("💬 FEEDBACK MESSAGES")
        print("─" * 70)
        feedback_cols = ['frame_number', 'video_confidence', 'feedback_message']
        print(df[feedback_cols].to_string(index=False))
        
        # Statistical Summary
        print("\n" + "=" * 70)
        print("📈 STATISTICAL SUMMARY")
        print("=" * 70)
        
        summary_metrics = {
            'Metric': [
                'Video Confidence',
                'Eye Contact Score',
                'Positive Emotions',
                'Negative Emotions',
                'Head Yaw (degrees)',
                'Head Pitch (degrees)'
            ],
            'Mean': [
                f"{df['video_confidence'].mean():.2f}",
                f"{df['eye_contact_score'].mean():.2f}",
                f"{df['positive_emotion_score'].mean():.2f}",
                f"{df['negative_emotion_score'].mean():.2f}",
                f"{df['head_pose_yaw'].mean():.2f}",
                f"{df['head_pose_pitch'].mean():.2f}"
            ],
            'Min': [
                f"{df['video_confidence'].min():.2f}",
                f"{df['eye_contact_score'].min():.2f}",
                f"{df['positive_emotion_score'].min():.2f}",
                f"{df['negative_emotion_score'].min():.2f}",
                f"{df['head_pose_yaw'].min():.2f}",
                f"{df['head_pose_pitch'].min():.2f}"
            ],
            'Max': [
                f"{df['video_confidence'].max():.2f}",
                f"{df['eye_contact_score'].max():.2f}",
                f"{df['positive_emotion_score'].max():.2f}",
                f"{df['negative_emotion_score'].max():.2f}",
                f"{df['head_pose_yaw'].max():.2f}",
                f"{df['head_pose_pitch'].max():.2f}"
            ],
            'Std Dev': [
                f"{df['video_confidence'].std():.2f}",
                f"{df['eye_contact_score'].std():.2f}",
                f"{df['positive_emotion_score'].std():.2f}",
                f"{df['negative_emotion_score'].std():.2f}",
                f"{df['head_pose_yaw'].std():.2f}",
                f"{df['head_pose_pitch'].std():.2f}"
            ]
        }
        
        summary_df = pd.DataFrame(summary_metrics)
        print(summary_df.to_string(index=False))
        
        # Emotion Distribution
        print("\n" + "=" * 70)
        print("🎭 EMOTION DISTRIBUTION")
        print("=" * 70)
        emotion_counts = df['dominant_emotion'].value_counts()
        for emotion, count in emotion_counts.items():
            percentage = (count / len(df)) * 100
            print(f"   {emotion.capitalize()}: {count} frames ({percentage:.1f}%)")
        
        # Save CSVs
        df.to_csv('detailed_frame_analysis.csv', index=False)
        
        # Generate feedback report CSV
        feedback_cols = ['frame_number', 'eye_contact_score', 'head_pose_yaw', 'head_pose_pitch', 
                        'video_confidence', 'assessment', 'feedback_message']
        feedback_df = df[feedback_cols]
        feedback_df.to_csv('frame_feedback_report.csv', index=False)
        
        print(f"\n💾 Files saved:")
        print(f"   • detailed_frame_analysis.csv - Complete analysis (25+ metrics)")
        print(f"   • frame_feedback_report.csv - Simplified feedback report")
        
        return df
    
    def print_metric_guidelines(self):
        """Print interpretation guidelines"""
        print("\n" + "=" * 70)
        print("📋 METRIC INTERPRETATION GUIDELINES")
        print("=" * 70)
        
        guidelines = """
╔══════════════════════════════════════════════════════════════════════╗
║                   🎯 CONFIDENT & NOT COPYING                         ║
╠══════════════════════════════════════════════════════════════════════╣
║ Metric              │ Excellent    │ Good        │ Acceptable       ║
║                     │ (Confident)  │ (Moderate)  │ (Fair)           ║
╠══════════════════════════════════════════════════════════════════════╣
║ Video Confidence    │ 70-100       │ 55-69       │ 40-54            ║
║ Eye Contact         │ 75-100       │ 60-74       │ 45-59            ║
║ Positive Emotions   │ 70-100%      │ 50-69%      │ 35-49%           ║
║ Negative Emotions   │ 0-20%        │ 21-35%      │ 36-50%           ║
║ Head Yaw (L-R)      │ -5° to +5°   │ -15° to +15°│ -25° to +25°     ║
║ Head Pitch (U-D)    │ -10° to +10° │ -15° to +15°│ -25° to +25°     ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║              ⚠️  COPYING & LOW CONFIDENCE INDICATORS                 ║
╠══════════════════════════════════════════════════════════════════════╣
║ Metric              │ Warning     │ Critical    │ Red Flag         ║
╠══════════════════════════════════════════════════════════════════════╣
║ Video Confidence    │ 30-39       │ 20-29       │ < 20             ║
║ Eye Contact         │ 30-44       │ 15-29       │ < 15             ║
║                     │ (Frequent   │ (READING    │ (CLEARLY         ║
║                     │  breaks)    │  LIKELY)    │  READING)        ║
║ Negative Emotions   │ 51-65%      │ 66-80%      │ > 80%            ║
║ Head Yaw            │ ±5° to 15°  │ ±15° to 30° │ > ±30°           ║
║                     │ (Looking    │ (READING    │ (Clearly         ║
║                     │  aside)     │  LIKELY)    │  looking away)   ║
╚══════════════════════════════════════════════════════════════════════╝

🔍 COPYING DETECTION PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Reading from Screen/Notes:
   • Eye Contact < 45
   • Head Yaw swings >5° repeatedly
   • "Don't look away" feedback messages
   • Pitch looking down consistently

✅ Natural & Confident:
   • Stable eye contact 60-90
   • Minor head movements -5° to +5°
   • Positive emotions >50%
   • "Good job!" feedback messages
"""
        print(guidelines)
    
    def print_final_summary(self):
        """Print final summary and recommendations"""
        if not self.detailed_results:
            return
        
        df = pd.DataFrame(self.detailed_results)
        avg_conf = df['video_confidence'].mean()
        avg_eye = df['eye_contact_score'].mean()
        avg_pos = df['positive_emotion_score'].mean()
        avg_neg = df['negative_emotion_score'].mean()
        
        # Count looking away frames
        looking_away_count = sum(1 for r in self.detailed_results 
                                if "Don't look away" in r['feedback_message'])
        good_frames_count = sum(1 for r in self.detailed_results 
                               if "Good job" in r['feedback_message'])
        
        print("\n" + "=" * 70)
        print("🏆 FINAL ASSESSMENT")
        print("=" * 70)
        
        print(f"\n📊 Your Performance:")
        print(f"   Video Confidence:   {avg_conf:.2f}/100")
        print(f"   Eye Contact:        {avg_eye:.2f}/100")
        print(f"   Positive Emotions:  {avg_pos:.2f}%")
        print(f"   Negative Emotions:  {avg_neg:.2f}%")
        
        print(f"\n📈 Behavior Analysis:")
        print(f"   Good Frames:        {good_frames_count}/{len(self.detailed_results)} ({good_frames_count/len(self.detailed_results)*100:.1f}%)")
        print(f"   Looking Away:       {looking_away_count}/{len(self.detailed_results)} ({looking_away_count/len(self.detailed_results)*100:.1f}%)")
        
        print(f"\n🎯 Target vs. Current:")
        print(f"   Video Confidence:   70+ (Gap: {70 - avg_conf:+.2f})")
        print(f"   Eye Contact:        75+ (Gap: {75 - avg_eye:+.2f})")
        print(f"   Positive Emotions:  70%+ (Gap: {70 - avg_pos:+.2f}%)")
        print(f"   Looking Away:       0% (Current: {looking_away_count/len(self.detailed_results)*100:.1f}%)")
        
        # Overall verdict
        print(f"\n🏅 Overall Status:", end=" ")
        if avg_conf >= 70 and looking_away_count == 0:
            print("✅ EXCELLENT - Confident & Not Copying")
        elif avg_conf >= 70:
            print("👍 GOOD - High confidence but some distractions")
        elif avg_conf >= 55:
            print("⚠️  MODERATE - Needs improvement")
        elif avg_conf >= 40:
            print("⚠️  FAIR - Significant improvement needed")
        else:
            print("❌ POOR - Major issues detected")
        
        # Key recommendations
        if looking_away_count > 0:
            print(f"\n💡 Key Recommendations:")
            print(f"   • {looking_away_count} frames show looking away behavior")
            print(f"   • Maintain focus on the camera throughout")
            print(f"   • Avoid reading from notes or additional screens")
        
        print("\n" + "=" * 70)
        print("✅ COMPLETE ANALYSIS FINISHED!")
        print("=" * 70)


# ============================================================================
# MAIN EXECUTION
# ============================================================================
def main():
    print("\n" + "=" * 70)
    print("🎬 UNIFIED VIDEO ANALYSIS TESTING")
    print("=" * 70)
    print("\nThis script will:")
    print("1. ✅ Capture frames from your webcam")
    print("2. ✅ Send frames to video analysis service (optional)")
    print("3. ✅ Perform detailed frame-by-frame analysis")
    print("4. ✅ Generate comprehensive comparison tables")
    print("5. ✅ Create feedback report in CSV format")
    print("6. ✅ Provide metric interpretation guidelines")
    
    tester = VideoAnalysisTester()
    
    # Step 1: Capture frames
    if not tester.capture_frames():
        print("\n❌ Failed to capture frames. Exiting.")
        return
    
    # Step 2: Send to service (optional, won't fail if service is down)
    tester.send_to_service()
    
    # Step 3: Detailed analysis
    if not tester.analyze_all_frames():
        print("\n❌ Failed to analyze frames. Exiting.")
        return
    
    # Step 4: Generate tables and reports
    tester.generate_comparison_tables()
    
    # Step 5: Print guidelines
    tester.print_metric_guidelines()
    
    # Step 6: Final summary
    tester.print_final_summary()


if __name__ == "__main__":
    main()
