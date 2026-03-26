#!/usr/bin/env python3
"""
Real-time Face Centering Guide with Interview Analysis - DUAL MODAL APPROACH

🎯 DUAL MODAL EVALUATION SYSTEM:
1. MediaPipe (Face Landmarks & Head Pose) - Primary orientation tracking
   - 478 facial landmarks (468 face + 10 iris)
   - 3D head pose estimation (yaw, pitch, roll)
   - Gaze direction tracking (iris position)
   - Fast and accurate for geometric analysis
   - NO emotion detection capability

2. DeepFace (Emotion Recognition) - Secondary emotion analysis
   - Pre-trained CNN for facial expression analysis
   - 7 emotions: happy, sad, angry, fear, surprise, disgust, neutral
   - Runs every 1.5 seconds (computationally expensive)
   - Provides confidence scoring based on emotion

📊 OUTPUT:
- Face positioning feedback (centering guide)
- Eye contact monitoring (detect looking away/copying)
- Emotion detection (positive vs negative)
- Overall confidence score (0-100)

Provides live feedback to help users:
1. Center their face in frame
2. Maintain eye contact (detect copying/looking away)
3. Monitor emotions and confidence
"""

import cv2
import numpy as np
import mediapipe as mp
from deepface import DeepFace
import time
import os

class FaceCenterGuide:
    def __init__(self):
        # Resolve model path relative to this script so it works from any cwd.
        script_dir = os.path.dirname(os.path.abspath(__file__))
        env_model_path = os.getenv('FACE_LANDMARKER_MODEL_PATH')
        self.model_path = env_model_path or os.path.join(script_dir, 'face_landmarker.task')

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model file not found: {self.model_path}\n"
                "Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            )
        
        # MediaPipe setup
        base_options = mp.tasks.BaseOptions(model_asset_path=self.model_path)
        self.options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Thresholds
        self.CENTER_THRESHOLD_X = 0.15  # 15% tolerance for horizontal
        self.CENTER_THRESHOLD_Y = 0.15  # 15% tolerance for vertical
        self.YAW_THRESHOLD = 15  # degrees - looking left/right
        self.PITCH_UP_THRESHOLD = 12  # degrees - looking UP (negative pitch)
        self.PITCH_DOWN_THRESHOLD = 8  # degrees - looking DOWN (positive pitch) - more sensitive
        
        # Baseline calibration for pitch
        self.baseline_pitch = None
        self.baseline_samples = []
        self.baseline_calibrated = False
        
        # Emotion analysis configuration
        self.last_emotion_time = 0
        self.emotion_interval = 1.5  # Analyze emotions every 1.5 seconds
        self.current_emotion = "neutral"
        self.emotion_scores = {}
        self.confidence_score = 0
        
        # DeepFace detector backend (try different models for better accuracy)
        # Options: 'opencv', 'ssd', 'dlib', 'mtcnn', 'retinaface', 'mediapipe'
        self.emotion_detector = 'opencv'  # Fast and reasonably accurate
        self.emotion_model = 'Emotion'  # DeepFace emotion model
        
        # Colors
        self.COLOR_GOOD = (0, 255, 0)  # Green
        self.COLOR_WARNING = (0, 165, 255)  # Orange
        self.COLOR_BAD = (0, 0, 255)  # Red
        self.COLOR_INFO = (255, 255, 255)  # White
        
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
                    print(f"[CALIBRATION] Baseline pitch ratio: {self.baseline_pitch_ratio:.3f}")
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
    
    def calculate_head_pose(self, landmarks, width, height):
        """Calculate 3D head pose from landmarks"""
        # Key points for head pose
        nose_tip = landmarks[1]
        chin = landmarks[152]
        left_eye_outer = landmarks[33]
        right_eye_outer = landmarks[263]
        left_mouth = landmarks[61]
        right_mouth = landmarks[291]
        
        # Convert to pixel coordinates
        nose_2d = np.array([nose_tip.x * width, nose_tip.y * height])
        chin_2d = np.array([chin.x * width, chin.y * height])
        left_eye_2d = np.array([left_eye_outer.x * width, left_eye_outer.y * height])
        right_eye_2d = np.array([right_eye_outer.x * width, right_eye_outer.y * height])
        
        # 3D points
        nose_3d = np.array([nose_tip.x, nose_tip.y, nose_tip.z])
        chin_3d = np.array([chin.x, chin.y, chin.z])
        left_eye_3d = np.array([left_eye_outer.x, left_eye_outer.y, left_eye_outer.z])
        right_eye_3d = np.array([right_eye_outer.x, right_eye_outer.y, right_eye_outer.z])
        left_mouth_3d = np.array([left_mouth.x, left_mouth.y, left_mouth.z])
        right_mouth_3d = np.array([right_mouth.x, right_mouth.y, right_mouth.z])
        
        # Create 3D model points
        model_points = np.array([
            nose_3d,
            chin_3d,
            left_eye_3d,
            right_eye_3d,
            left_mouth_3d,
            right_mouth_3d
        ])
        
        # Camera matrix (approximate)
        focal_length = width
        center = (width / 2, height / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=float)
        
        # Assuming no lens distortion
        dist_coeffs = np.zeros((4, 1))
        
        # 2D image points
        image_points = np.array([
            nose_2d,
            chin_2d,
            left_eye_2d,
            right_eye_2d,
            [left_mouth.x * width, left_mouth.y * height],
            [right_mouth.x * width, right_mouth.y * height]
        ], dtype=float)
        
        # Get rotation vector
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points * 100,  # Scale up for better numerical stability
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Get angles
        angles = self.rotation_matrix_to_angles(rotation_matrix)
        
        # Normalize pitch to -90 to +90 range
        pitch, yaw, roll = angles
        
        # If pitch is out of reasonable range, normalize it
        # Pitch should be around 0 when looking straight
        if pitch > 90:
            pitch = pitch - 180
        elif pitch < -90:
            pitch = pitch + 180
        
        angles = (pitch, yaw, roll)
        
        return angles  # Returns (pitch, yaw, roll)
    
    def rotation_matrix_to_angles(self, rotation_matrix):
        """Convert rotation matrix to euler angles"""
        sy = np.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
        singular = sy < 1e-6
        
        if not singular:
            x = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
            y = np.arctan2(-rotation_matrix[2, 0], sy)
            z = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        else:
            x = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
            y = np.arctan2(-rotation_matrix[2, 0], sy)
            z = 0
        
        return np.degrees([x, y, z])  # pitch, yaw, roll
    
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
    
    def analyze_emotions(self, frame):
        """Analyze emotions using DeepFace with improved backend (throttled)"""
        current_time = time.time()
        
        if current_time - self.last_emotion_time >= self.emotion_interval:
            try:
                # DeepFace analysis with specified detector for better accuracy
                result = DeepFace.analyze(
                    frame,
                    actions=['emotion'],
                    detector_backend=self.emotion_detector,
                    enforce_detection=False,
                    silent=True
                )
                
                if isinstance(result, list):
                    result = result[0]
                
                self.emotion_scores = result.get('emotion', {})
                self.current_emotion = result.get('dominant_emotion', 'neutral')
                self.last_emotion_time = current_time
                
                # Log emotion scores for debugging
                print(f"[EMOTION] {self.current_emotion.upper()}: "
                      f"Happy={self.emotion_scores.get('happy', 0):.0f}% "
                      f"Sad={self.emotion_scores.get('sad', 0):.0f}% "
                      f"Neutral={self.emotion_scores.get('neutral', 0):.0f}%")
                
            except Exception as e:
                # If analysis fails, keep previous values
                print(f"[EMOTION] Detection failed: {e}")
                pass
        
        return self.current_emotion, self.emotion_scores
    
    def calculate_confidence_score(self, head_pose, gaze, emotion_scores):
        """Calculate overall confidence score"""
        pitch, yaw, roll = head_pose
        gaze_x, gaze_y = gaze
        
        # Head pose score (0-100)
        yaw_score = max(0, 100 - abs(yaw) * 3)  # Penalty for looking away
        
        # Pitch score with different penalties for up vs down
        if pitch < 0:  # Looking UP
            pitch_penalty = abs(pitch) * 4  # Stricter penalty for looking up
        else:  # Looking DOWN
            pitch_penalty = pitch * 6  # Even stricter for looking down (reading behavior)
        pitch_score = max(0, 100 - pitch_penalty)
        
        head_pose_score = (yaw_score + pitch_score) / 2
        
        # Gaze score (0-100)
        gaze_score = max(0, 100 - (abs(gaze_x) * 50 + abs(gaze_y) * 50))
        
        # Eye contact score (combined)
        eye_contact_score = (head_pose_score * 0.6 + gaze_score * 0.4)
        
        # Emotion score (0-100)
        if emotion_scores:
            positive = emotion_scores.get('happy', 0) + emotion_scores.get('neutral', 0)
            negative = emotion_scores.get('sad', 0) + emotion_scores.get('angry', 0) + emotion_scores.get('fear', 0)
            emotion_score = min(100, positive - negative * 0.5)
        else:
            emotion_score = 50  # Default
        
        # Overall confidence (weighted average)
        confidence = (eye_contact_score * 0.6 + emotion_score * 0.4)
        
        return confidence, eye_contact_score, emotion_score
    
    def draw_feedback_overlay(self, frame, landmarks, width, height):
        """Draw real-time feedback overlay on frame"""
        # Calculate face position
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]
        
        face_center_x = np.mean(x_coords)
        face_center_y = np.mean(y_coords)
        
        offset_x = face_center_x - 0.5
        offset_y = face_center_y - 0.5
        
        is_centered_x = abs(offset_x) < self.CENTER_THRESHOLD_X
        is_centered_y = abs(offset_y) < self.CENTER_THRESHOLD_Y
        is_centered = is_centered_x and is_centered_y
        
        # Calculate head pose - using simple 2D method (more reliable)
        head_pose_simple = self.calculate_simple_head_pose(landmarks, width, height)
        pitch_simple, yaw_simple, _ = head_pose_simple
        
        # Also calculate 3D pose for comparison
        head_pose_3d = self.calculate_head_pose(landmarks, width, height)
        pitch_3d, yaw_3d, roll_3d = head_pose_3d
        
        # Use simple method as primary
        pitch, yaw, roll = pitch_simple, yaw_simple, 0
        head_pose = (pitch, yaw, roll)
        
        # Calculate gaze
        gaze_x, gaze_y = self.calculate_gaze(landmarks)
        
        # Analyze emotions (throttled)
        emotion, emotion_scores = self.analyze_emotions(frame)
        
        # Calculate confidence
        confidence, eye_contact, emotion_score = self.calculate_confidence_score(
            head_pose, (gaze_x, gaze_y), emotion_scores
        )
        
        # Check pitch thresholds (different for up vs down)
        pitch_up_ok = pitch >= -self.PITCH_UP_THRESHOLD  # Negative = looking up
        pitch_down_ok = pitch <= self.PITCH_DOWN_THRESHOLD  # Positive = looking down
        pitch_ok = pitch_up_ok and pitch_down_ok
        
        # Log head pose values for debugging
        print(f"[DEBUG] Simple - Yaw: {yaw_simple:+7.2f}° Pitch: {pitch_simple:+7.2f}° | "
              f"3D - Yaw: {yaw_3d:+7.2f}° Pitch: {pitch_3d:+7.2f}° | "
              f"Thresholds OK: Yaw={abs(yaw) <= self.YAW_THRESHOLD} Pitch={pitch_ok} "
              f"(Up={pitch_up_ok} Down={pitch_down_ok})")
        
        # Determine if looking away (copying behavior)
        looking_away_yaw = abs(yaw) > self.YAW_THRESHOLD
        looking_away_pitch_up = pitch < -self.PITCH_UP_THRESHOLD
        looking_away_pitch_down = pitch > self.PITCH_DOWN_THRESHOLD
        looking_away = looking_away_yaw or looking_away_pitch_up or looking_away_pitch_down
        
        # Draw center guide
        center_x, center_y = width // 2, height // 2
        guide_size = 200
        
        # Draw crosshair
        cv2.line(frame, (center_x - guide_size, center_y), (center_x + guide_size, center_y), 
                 self.COLOR_INFO, 1, cv2.LINE_AA)
        cv2.line(frame, (center_x, center_y - guide_size), (center_x, center_y + guide_size), 
                 self.COLOR_INFO, 1, cv2.LINE_AA)
        
        # Draw face center point
        face_pixel_x = int(face_center_x * width)
        face_pixel_y = int(face_center_y * height)
        point_color = self.COLOR_GOOD if is_centered else self.COLOR_WARNING
        cv2.circle(frame, (face_pixel_x, face_pixel_y), 10, point_color, -1)
        cv2.circle(frame, (face_pixel_x, face_pixel_y), 10, self.COLOR_INFO, 2)
        
        # Draw positioning feedback
        y_offset = 30
        
        # Header
        cv2.rectangle(frame, (10, 10), (400, y_offset + 250), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (400, y_offset + 250), self.COLOR_INFO, 2)
        
        cv2.putText(frame, "INTERVIEW FEEDBACK", (20, 35), 
                   cv2.FONT_HERSHEY_DUPLEX, 0.7, self.COLOR_INFO, 2)
        
        y_offset += 35
        
        # Face Position
        pos_color = self.COLOR_GOOD if is_centered else self.COLOR_WARNING
        pos_text = "CENTERED" if is_centered else "ADJUST POSITION"
        cv2.putText(frame, f"Position: {pos_text}", (20, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, pos_color, 2)
        y_offset += 25
        
        # Position arrows
        if not is_centered_x:
            arrow = "<<<" if offset_x < 0 else ">>>"
            cv2.putText(frame, arrow, (200, y_offset - 25), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.7, self.COLOR_WARNING, 2)
        
        if not is_centered_y:
            arrow = "MOVE UP" if offset_y > 0 else "MOVE DOWN"
            cv2.putText(frame, arrow, (150, y_offset - 25), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.COLOR_WARNING, 1)
        
        # Eye Contact / Looking Away
        if looking_away:
            if looking_away_yaw:
                direction = "RIGHT" if yaw > 0 else "LEFT"
                cv2.putText(frame, f"DON'T LOOK {direction}!", (20, y_offset), 
                           cv2.FONT_HERSHEY_DUPLEX, 0.7, self.COLOR_BAD, 2)
            elif looking_away_pitch_up:
                cv2.putText(frame, f"DON'T LOOK UP!", (20, y_offset), 
                           cv2.FONT_HERSHEY_DUPLEX, 0.7, self.COLOR_BAD, 2)
            elif looking_away_pitch_down:
                cv2.putText(frame, f"DON'T LOOK DOWN!", (20, y_offset), 
                           cv2.FONT_HERSHEY_DUPLEX, 0.7, self.COLOR_BAD, 2)
        else:
            cv2.putText(frame, "Eye Contact: GOOD", (20, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.COLOR_GOOD, 2)
        y_offset += 30
        
        # Head Pose with detailed threshold status
        yaw_status = "✓" if abs(yaw) <= self.YAW_THRESHOLD else "✗"
        yaw_color = self.COLOR_GOOD if abs(yaw) <= self.YAW_THRESHOLD else self.COLOR_BAD
        
        pitch_status = "✓" if pitch_ok else "✗"
        pitch_color = self.COLOR_GOOD if pitch_ok else self.COLOR_BAD
        
        cv2.putText(frame, f"Yaw: {yaw:+6.1f}deg {yaw_status} (limit: ±{self.YAW_THRESHOLD}deg)", 
                   (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, yaw_color, 1)
        y_offset += 20
        
        cv2.putText(frame, f"Pitch: {pitch:+6.1f}deg {pitch_status} (UP<-{self.PITCH_UP_THRESHOLD} DOWN<+{self.PITCH_DOWN_THRESHOLD})", 
                   (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, pitch_color, 1)
        y_offset += 20
        
        # Show comparison with 3D method (for debugging)
        cv2.putText(frame, f"3D Pose: Yaw={yaw_3d:+.1f} Pitch={pitch_3d:+.1f}", 
                   (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)
        y_offset += 20
        
        # Emotion
        emotion_display = emotion.upper()
        emotion_color = self.COLOR_GOOD if emotion in ['happy', 'neutral'] else self.COLOR_WARNING
        cv2.putText(frame, f"Emotion: {emotion_display}", (20, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, emotion_color, 2)
        y_offset += 25
        
        # Confidence Score
        conf_color = self.COLOR_GOOD if confidence > 70 else (self.COLOR_WARNING if confidence > 50 else self.COLOR_BAD)
        cv2.putText(frame, f"Confidence: {confidence:.0f}/100", (20, y_offset), 
                   cv2.FONT_HERSHEY_DUPLEX, 0.7, conf_color, 2)
        y_offset += 30
        
        # Confidence Bar
        bar_width = 360
        bar_height = 20
        bar_x, bar_y = 20, y_offset
        
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height), 
                     self.COLOR_INFO, 2)
        
        fill_width = int((confidence / 100) * bar_width)
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_width, bar_y + bar_height), 
                     conf_color, -1)
        
        y_offset += 35
        
        # Detailed scores
        cv2.putText(frame, f"Eye Contact: {eye_contact:.0f}  Emotion: {emotion_score:.0f}", 
                   (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.COLOR_INFO, 1)
        
        # Instructions at bottom
        cv2.putText(frame, "Press 'Q' to quit", (width - 180, height - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.COLOR_INFO, 2)
        
        return frame
    
    def run(self):
        """Run the real-time feedback GUI"""
        print("\n" + "="*70)
        print("🎬 FACE CENTER GUIDE - REAL-TIME INTERVIEW FEEDBACK")
        print("="*70)
        print("\nThis tool helps you:")
        print("  ✓ Center your face in frame")
        print("  ✓ Maintain eye contact (detect copying/looking away)")
        print("  ✓ Monitor emotions and confidence")
        print("\n👉 Position your face to align with the crosshair")
        print("👉 Keep eye contact with the camera")
        print("👉 Press 'Q' to quit\n")
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Could not open webcam")
            return
        
        # Set resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        # Create window
        cv2.namedWindow('Interview Feedback', cv2.WINDOW_NORMAL)
        
        # Create landmarker
        landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(self.options)
        
        print("✅ Starting... Press 'Q' to quit\n")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("❌ Failed to capture frame")
                    break
                
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                height, width = frame.shape[:2]
                
                # Convert to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                
                # Detect landmarks
                results = landmarker.detect(mp_image)
                
                if results.face_landmarks:
                    landmarks = results.face_landmarks[0]
                    frame = self.draw_feedback_overlay(frame, landmarks, width, height)
                else:
                    # No face detected
                    cv2.putText(frame, "NO FACE DETECTED", (width // 2 - 150, height // 2), 
                               cv2.FONT_HERSHEY_DUPLEX, 1, self.COLOR_BAD, 3)
                
                # Display frame
                cv2.imshow('Interview Feedback', frame)
                
                # Check for quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        
        finally:
            landmarker.close()
            cap.release()
            cv2.destroyAllWindows()
            print("\n✅ Session complete!")


if __name__ == "__main__":
    try:
        guide = FaceCenterGuide()
        guide.run()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
