#!/usr/bin/env python3
"""
Test MediaPipe with NEW API (0.10.30+)
Captures and analyzes a single frame
"""

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import time

def capture_single_frame():
    """Capture one frame from webcam"""
    print("📸 Opening webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Could not open webcam")
        return None
    
    print("📸 Smile! Capturing in 2 seconds...")
    time.sleep(2)
    
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        # Save frame
        cv2.imwrite('test_frame.jpg', frame)
        print("✅ Frame captured: test_frame.jpg")
        return frame
    else:
        print("❌ Failed to capture frame")
        return None

def analyze_with_mediapipe(frame):
    """Analyze frame with MediaPipe and show ALL raw outputs"""
    height, width = frame.shape[:2]
    
    print("\n" + "="*70)
    print("🔍 MEDIAPIPE RAW OUTPUT ANALYSIS (NEW API)")
    print("="*70)
    
    # Create FaceLandmarkerOptions
    base_options = python.BaseOptions(model_asset_path='face_landmarker.task')
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Create FaceLandmarker
    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        # Convert frame to MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Detect face landmarks
        results = landmarker.detect(mp_image)
        
        if not results.face_landmarks:
            print("❌ No face detected by MediaPipe")
            return
        
        print(f"✅ Face detected!\n")
        
        # Get first face landmarks
        face_landmarks = results.face_landmarks[0]
        
        # =====================================================================
        # 1. BASIC INFO
        # =====================================================================
        print("=" * 70)
        print("1️⃣  BASIC INFORMATION")
        print("=" * 70)
        print(f"Total landmarks detected: {len(face_landmarks)}")
        print(f"Frame dimensions: {width}x{height}")
        print(f"\nLandmark structure:")
        print(f"  - Each landmark has: x, y, z (normalized coordinates)")
        print(f"  - x, y: 0.0 to 1.0 (relative to image size)")
        print(f"  - z: depth relative to face (negative = forward)")
        
        # =====================================================================
        # 2. KEY LANDMARK POSITIONS
        # =====================================================================
        print("\n" + "=" * 70)
        print("2️⃣  KEY FACIAL LANDMARKS (Raw Positions)")
        print("=" * 70)
        
        key_points = {
            'Nose tip': 1,
            'Chin': 152,
            'Left eye (inner)': 133,
            'Left eye (outer)': 33,
            'Right eye (inner)': 362,
            'Right eye (outer)': 263,
            'Left iris center': 468,
            'Right iris center': 473,
            'Upper lip': 13,
            'Lower lip': 14,
            'Left mouth corner': 61,
            'Right mouth corner': 291,
            'Left eyebrow': 107,
            'Right eyebrow': 336,
            'Forehead center': 10
        }
        
        for name, idx in key_points.items():
            lm = face_landmarks[idx]
            px_x, px_y = int(lm.x * width), int(lm.y * height)
            print(f"{name:20} (#{idx:3}): x={lm.x:.4f}, y={lm.y:.4f}, z={lm.z:.4f} | Pixel: ({px_x}, {px_y})")
        
        # =====================================================================
        # 3. EYE TRACKING
        # =====================================================================
        print("\n" + "=" * 70)
        print("3️⃣  EYE & IRIS TRACKING")
        print("=" * 70)
        
        # Left eye landmarks
        left_eye_indices = [33, 133, 159, 145, 468, 469, 470, 471, 472]
        print("\n📍 Left Eye Landmarks:")
        for idx in left_eye_indices:
            lm = face_landmarks[idx]
            landmark_type = "Iris" if idx >= 468 else "Eye corner/lid"
            print(f"  Landmark {idx:3} ({landmark_type:15}): x={lm.x:.4f}, y={lm.y:.4f}, z={lm.z:.4f}")
        
        # Right eye landmarks  
        right_eye_indices = [362, 263, 386, 374, 473, 474, 475, 476, 477]
        print("\n📍 Right Eye Landmarks:")
        for idx in right_eye_indices:
            lm = face_landmarks[idx]
            landmark_type = "Iris" if idx >= 473 else "Eye corner/lid"
            print(f"  Landmark {idx:3} ({landmark_type:15}): x={lm.x:.4f}, y={lm.y:.4f}, z={lm.z:.4f}")
        
        # Calculate eye openness
        left_eye_top = face_landmarks[159]
        left_eye_bottom = face_landmarks[145]
        left_eye_left = face_landmarks[33]
        left_eye_right = face_landmarks[133]
        
        left_vertical = abs(left_eye_top.y - left_eye_bottom.y)
        left_horizontal = abs(left_eye_right.x - left_eye_left.x)
        left_eye_ratio = left_vertical / (left_horizontal + 1e-6)
        
        print(f"\n👁️  Left Eye Metrics:")
        print(f"  Vertical distance: {left_vertical:.4f}")
        print(f"  Horizontal distance: {left_horizontal:.4f}")
        print(f"  Eye Aspect Ratio (EAR): {left_eye_ratio:.4f}")
        print(f"  Interpretation: {'OPEN' if left_eye_ratio > 0.15 else 'CLOSED'}")
        
        # =====================================================================
        # 4. HEAD POSE ESTIMATION (3D)
        # =====================================================================
        print("\n" + "=" * 70)
        print("4️⃣  HEAD POSE ESTIMATION (3D)")
        print("=" * 70)
        
        # Get 6 key points for 3D pose estimation
        nose_tip = face_landmarks[1]
        chin = face_landmarks[152]
        left_eye = face_landmarks[33]
        right_eye = face_landmarks[263]
        left_mouth = face_landmarks[61]
        right_mouth = face_landmarks[291]
        
        # Convert to pixel coordinates
        nose_2d = (int(nose_tip.x * width), int(nose_tip.y * height))
        chin_2d = (int(chin.x * width), int(chin.y * height))
        left_eye_2d = (int(left_eye.x * width), int(left_eye.y * height))
        right_eye_2d = (int(right_eye.x * width), int(right_eye.y * height))
        left_mouth_2d = (int(left_mouth.x * width), int(left_mouth.y * height))
        right_mouth_2d = (int(right_mouth.x * width), int(right_mouth.y * height))
        
        # 3D model points (canonical face coordinates)
        model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye corner
            (225.0, 170.0, -135.0),      # Right eye corner
            (-150.0, -150.0, -125.0),    # Left mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ], dtype=np.float64)
        
        # 2D image points
        image_points = np.array([
            nose_2d,
            chin_2d,
            left_eye_2d,
            right_eye_2d,
            left_mouth_2d,
            right_mouth_2d
        ], dtype=np.float64)
        
        # Camera matrix
        focal_length = width
        center = (width / 2, height / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        dist_coeffs = np.zeros((4, 1))  # Assuming no lens distortion
        
        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Calculate Euler angles
        pose_matrix = cv2.hconcat([rotation_matrix, translation_vector])
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(pose_matrix)
        
        pitch = euler_angles[0][0]
        yaw = euler_angles[1][0]
        roll = euler_angles[2][0]
        
        print(f"\n📐 3D Head Pose Angles:")
        print(f"  Pitch (Up/Down):    {pitch:7.2f}°")
        print(f"  Yaw (Left/Right):   {yaw:7.2f}°")
        print(f"  Roll (Tilt):        {roll:7.2f}°")
        
        # Interpretation
        print(f"\n💡 Interpretation:")
        if abs(yaw) > 15:
            direction = "LEFT" if yaw < 0 else "RIGHT"
            print(f"  ⚠️  Looking {direction} (yaw: {yaw:.1f}°)")
        elif abs(pitch) > 15:
            direction = "DOWN" if pitch > 0 else "UP"
            print(f"  ⚠️  Looking {direction} (pitch: {pitch:.1f}°)")
        else:
            print(f"  ✅ Looking straight ahead")
        
        # =====================================================================
        # 5. GAZE DIRECTION (Using Iris)
        # =====================================================================
        print("\n" + "=" * 70)
        print("5️⃣  GAZE DIRECTION (Iris-based)")
        print("=" * 70)
        
        # Left eye analysis
        left_iris_center = face_landmarks[468]
        left_eye_center_x = (face_landmarks[33].x + face_landmarks[133].x) / 2
        left_eye_center_y = (face_landmarks[33].y + face_landmarks[133].y) / 2
        
        # Gaze offset (iris relative to eye center)
        gaze_offset_x = left_iris_center.x - left_eye_center_x
        gaze_offset_y = left_iris_center.y - left_eye_center_y
        
        # Normalize to eye width/height
        eye_width = abs(face_landmarks[133].x - face_landmarks[33].x)
        eye_height = abs(face_landmarks[159].y - face_landmarks[145].y)
        
        gaze_normalized_x = gaze_offset_x / (eye_width + 1e-6)
        gaze_normalized_y = gaze_offset_y / (eye_height + 1e-6)
        
        print(f"\n👁️  Gaze Analysis (Left Eye):")
        print(f"  Iris center: ({left_iris_center.x:.4f}, {left_iris_center.y:.4f})")
        print(f"  Eye center:  ({left_eye_center_x:.4f}, {left_eye_center_y:.4f})")
        print(f"  Gaze offset: X={gaze_offset_x:.4f}, Y={gaze_offset_y:.4f}")
        print(f"  Normalized:  X={gaze_normalized_x:.4f}, Y={gaze_normalized_y:.4f}")
        
        gaze_interpretation = []
        if abs(gaze_normalized_x) > 0.3:
            direction = "RIGHT" if gaze_normalized_x > 0 else "LEFT"
            gaze_interpretation.append(f"Looking {direction}")
        if abs(gaze_normalized_y) > 0.3:
            direction = "DOWN" if gaze_normalized_y > 0 else "UP"
            gaze_interpretation.append(f"Looking {direction}")
        
        if not gaze_interpretation:
            gaze_interpretation.append("Looking straight")
        
        print(f"  Interpretation: {', '.join(gaze_interpretation)}")
        
        # =====================================================================
        # 6. MOUTH ANALYSIS
        # =====================================================================
        print("\n" + "=" * 70)
        print("6️⃣  MOUTH ANALYSIS")
        print("=" * 70)
        
        upper_lip = face_landmarks[13]
        lower_lip = face_landmarks[14]
        left_mouth_corner = face_landmarks[61]
        right_mouth_corner = face_landmarks[291]
        
        mouth_height = abs(upper_lip.y - lower_lip.y)
        mouth_width = abs(right_mouth_corner.x - left_mouth_corner.x)
        mouth_ratio = mouth_height / (mouth_width + 1e-6)
        
        print(f"\n👄 Mouth Metrics:")
        print(f"  Height: {mouth_height:.4f}")
        print(f"  Width:  {mouth_width:.4f}")
        print(f"  Ratio:  {mouth_ratio:.4f}")
        
        if mouth_ratio > 0.5:
            mouth_status = "OPEN (likely speaking)"
        elif mouth_ratio > 0.3:
            mouth_status = "SLIGHTLY OPEN"
        else:
            mouth_status = "CLOSED"
        
        print(f"  Status: {mouth_status}")
        
        # =====================================================================
        # 7. FACE POSITIONING
        # =====================================================================
        print("\n" + "=" * 70)
        print("7️⃣  FACE POSITIONING IN FRAME")
        print("=" * 70)
        
        # Calculate face bounding box
        x_coords = [lm.x for lm in face_landmarks]
        y_coords = [lm.y for lm in face_landmarks]
        
        face_left = min(x_coords)
        face_right = max(x_coords)
        face_top = min(y_coords)
        face_bottom = max(y_coords)
        
        face_center_x = (face_left + face_right) / 2
        face_center_y = (face_top + face_bottom) / 2
        face_width = face_right - face_left
        face_height = face_bottom - face_top
        
        frame_center_offset_x = face_center_x - 0.5
        frame_center_offset_y = face_center_y - 0.5
        
        print(f"\n📏 Face Dimensions:")
        print(f"  Bounding box: ({face_left:.3f}, {face_top:.3f}) to ({face_right:.3f}, {face_bottom:.3f})")
        print(f"  Face center: ({face_center_x:.3f}, {face_center_y:.3f})")
        print(f"  Face size: {face_width:.3f} x {face_height:.3f}")
        print(f"  Face area: {(face_width * face_height * 100):.1f}% of frame")
        print(f"  Offset from center: X={frame_center_offset_x:.3f}, Y={frame_center_offset_y:.3f}")
        
        is_centered = abs(frame_center_offset_x) < 0.1 and abs(frame_center_offset_y) < 0.1
        print(f"  Centered: {'✅ YES' if is_centered else '❌ NO'}")
        
        # =====================================================================
        # 8. SUMMARY
        # =====================================================================
        print("\n" + "=" * 70)
        print("8️⃣  QUICK SUMMARY")
        print("=" * 70)
        
        summary = {
            "Face Detected": "✅ YES",
            "Total Landmarks": len(face_landmarks),
            "Head Pose": f"Yaw: {yaw:.1f}°, Pitch: {pitch:.1f}°, Roll: {roll:.1f}°",
            "Gaze Direction": f"X: {gaze_normalized_x:.2f}, Y: {gaze_normalized_y:.2f}",
            "Eye Status": "OPEN" if left_eye_ratio > 0.15 else "CLOSED",
            "Mouth Status": mouth_status,
            "Face Centered": "✅ YES" if is_centered else "❌ NO",
            "Face Size": f"{(face_width * face_height) * 100:.1f}% of frame"
        }
        
        for key, value in summary.items():
            print(f"  {key:20}: {value}")
        
        print("\n" + "=" * 70)
        print("💡 All landmark indices: 0-467 (face mesh) + 468-477 (iris)")
        print("   Full landmark map: https://github.com/google/mediapipe")
        print("=" * 70)

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🎬 MEDIAPIPE SINGLE FRAME TEST (NEW API)")
    print("="*70)
    print("\nUsing MediaPipe Tasks API (v0.10.30+)")
    print("This will capture ONE picture and show ALL raw MediaPipe outputs\n")
    
    frame = capture_single_frame()
    
    if frame is not None:
        analyze_with_mediapipe(frame)
        print("\n✅ Analysis complete! Check the output above.")
        print("📁 Frame saved as: test_frame.jpg")
    else:
        print("\n❌ Failed to capture frame")
