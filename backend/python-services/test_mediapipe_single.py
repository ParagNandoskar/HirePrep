#!/usr/bin/env python3
"""
Test MediaPipe on a single captured frame
Shows ALL raw outputs and metrics available
"""

import cv2
import numpy as np
import mediapipe as mp
import json
import os

# Initialize MediaPipe with new API (v0.10.32)
# Note: The new API uses tasks.vision.FaceLandmarker instead of solutions.face_mesh

def capture_single_frame():
    """Capture one frame from webcam"""
    print("📸 Opening webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Could not open webcam")
        return None
    
    print("📸 Smile! Capturing in 2 seconds...")
    import time
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
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    print("\n" + "="*70)
    print("🔍 MEDIAPIPE RAW OUTPUT ANALYSIS")
    print("="*70)
    
    # Check if model file exists
    model_path = 'face_landmarker.task'
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        print("Please download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
        return
    
    # Setup MediaPipe FaceLandmarker with new API (v0.10.32)
    base_options = mp.tasks.BaseOptions(model_asset_path=model_path)
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=base_options,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False
    )
    
    # Create landmarker
    landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
    
    # Convert frame to MediaPipe Image format
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    # Detect face landmarks
    results = landmarker.detect(mp_image)
    
    # Close landmarker
    landmarker.close()
    
    if not results.face_landmarks:
        print("❌ No face detected by MediaPipe")
        return
    
    print(f"✅ Face detected!\n")
    
    # Access landmarks - now it's a list of NormalizedLandmark objects
    landmarks = results.face_landmarks[0]
    
    # =====================================================================
    # 1. BASIC INFO
    # =====================================================================
    print("=" * 70)
    print("1️⃣  BASIC INFORMATION")
    print("=" * 70)
    print(f"Total landmarks detected: {len(landmarks)}")
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
        lm = landmarks[idx]
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
        lm = landmarks[idx]
        landmark_type = "Iris" if idx >= 468 else "Eye corner/lid"
        print(f"  Landmark {idx:3} ({landmark_type:15}): x={lm.x:.4f}, y={lm.y:.4f}, z={lm.z:.4f}")
    
    # Right eye landmarks  
    right_eye_indices = [362, 263, 386, 374, 473, 474, 475, 476, 477]
    print("\n📍 Right Eye Landmarks:")
    for idx in right_eye_indices:
        lm = landmarks[idx]
        landmark_type = "Iris" if idx >= 473 else "Eye corner/lid"
        print(f"  Landmark {idx:3} ({landmark_type:15}): x={lm.x:.4f}, y={lm.y:.4f}, z={lm.z:.4f}")
    
    # Calculate eye openness
    left_eye_top = landmarks[159]
    left_eye_bottom = landmarks[145]
    left_eye_left = landmarks[33]
    left_eye_right = landmarks[133]
    
    left_vertical = abs(left_eye_top.y - left_eye_bottom.y)
    left_horizontal = abs(left_eye_right.x - left_eye_left.x)
    left_eye_ratio = left_vertical / (left_horizontal + 1e-6)
    
    print(f"\n👁️  Left Eye Metrics:")
    print(f"  Vertical distance: {left_vertical:.4f}")
    print(f"  Horizontal distance: {left_horizontal:.4f}")
    print(f"  Eye Aspect Ratio (EAR): {left_eye_ratio:.4f}")
    print(f"  Interpretation: {'OPEN' if left_eye_ratio > 0.15 else 'CLOSED'}")
    
    # =====================================================================
    # 4. HEAD POSE ESTIMATION
    # =====================================================================
    print("\n" + "=" * 70)
    print("4️⃣  HEAD POSE ESTIMATION (3D)")
    print("=" * 70)
    
    # Key points for head pose
    nose_tip = landmarks[1]
    chin = landmarks[152]
    left_eye = landmarks[33]
    right_eye = landmarks[263]
    left_mouth = landmarks[61]
    right_mouth = landmarks[291]
    
    # Convert to pixel coordinates
    nose_2d = np.array([nose_tip.x * width, nose_tip.y * height])
    chin_2d = np.array([chin.x * width, chin.y * height])
    left_eye_2d = np.array([left_eye.x * width, left_eye.y * height])
    right_eye_2d = np.array([right_eye.x * width, right_eye.y * height])
    
    # Eye midpoint
    eye_midpoint = (left_eye_2d + right_eye_2d) / 2
    
    # Calculate raw distances
    eye_distance = np.linalg.norm(right_eye_2d - left_eye_2d)
    nose_to_eye_midpoint = nose_2d - eye_midpoint
    nose_chin_distance = np.linalg.norm(chin_2d - nose_2d)
    
    print(f"\n📏 Raw Measurements:")
    print(f"  Eye-to-eye distance: {eye_distance:.2f} pixels")
    print(f"  Nose to eye midpoint offset: X={nose_to_eye_midpoint[0]:.2f}, Y={nose_to_eye_midpoint[1]:.2f}")
    print(f"  Nose-to-chin distance: {nose_chin_distance:.2f} pixels")
    
    # Simple yaw estimation (left-right rotation)
    # Positive yaw = looking right, Negative = looking left
    expected_eye_distance = width * 0.3
    nose_offset_ratio = nose_to_eye_midpoint[0] / (eye_distance / 2)
    yaw_estimate = -nose_offset_ratio * 30
    
    # Pitch estimation (up-down)
    expected_nose_chin = height * 0.15
    pitch_ratio = (nose_chin_distance - expected_nose_chin) / expected_nose_chin
    pitch_estimate = pitch_ratio * 30
    
    # Roll estimation (head tilt)
    eye_angle = np.arctan2(right_eye_2d[1] - left_eye_2d[1], 
                           right_eye_2d[0] - left_eye_2d[0])
    roll_estimate = np.degrees(eye_angle)
    
    print(f"\n🔄 Estimated Head Rotation:")
    print(f"  Yaw (left↔right):   {yaw_estimate:6.2f}° {'→ Looking RIGHT' if yaw_estimate > 0 else '← Looking LEFT' if yaw_estimate < 0 else '↕ STRAIGHT'}")
    print(f"  Pitch (up↔down):    {pitch_estimate:6.2f}° {'↓ Looking DOWN' if pitch_estimate > 0 else '↑ Looking UP' if pitch_estimate < 0 else '↕ STRAIGHT'}")
    print(f"  Roll (tilt):        {roll_estimate:6.2f}° {'⟳ Tilted right' if roll_estimate > 0 else '⟲ Tilted left' if roll_estimate < 0 else '| LEVEL'}")
    
    # =====================================================================
    # 5. GAZE DIRECTION
    # =====================================================================
    print("\n" + "=" * 70)
    print("5️⃣  GAZE DIRECTION (Iris Tracking)")
    print("=" * 70)
    
    # Iris positions
    left_iris = landmarks[468]
    right_iris = landmarks[473]
    
    # Calculate iris position relative to eye corners
    left_eye_width = abs((left_eye_right.x - left_eye_left.x) * width)
    left_iris_x = left_iris.x * width
    left_eye_left_x = left_eye_left.x * width
    
    if left_eye_width > 0:
        left_gaze_ratio = (left_iris_x - left_eye_left_x) / left_eye_width
        left_gaze_normalized = (left_gaze_ratio - 0.5) * 2  # -1 to +1
    else:
        left_gaze_normalized = 0
    
    print(f"\n👁️  Left Eye Gaze:")
    print(f"  Eye width: {left_eye_width:.2f} pixels")
    print(f"  Iris position: {left_iris_x:.2f} pixels")
    print(f"  Iris ratio in eye: {left_gaze_ratio:.4f} (0=left edge, 1=right edge)")
    print(f"  Normalized gaze X: {left_gaze_normalized:.4f} (-1=left, 0=center, +1=right)")
    
    # Vertical gaze
    left_eye_top = landmarks[159]
    left_eye_bottom = landmarks[145]
    left_eye_height = abs((left_eye_bottom.y - left_eye_top.y) * height)
    left_iris_y = left_iris.y * height
    left_eye_top_y = left_eye_top.y * height
    
    if left_eye_height > 0:
        left_gaze_y_ratio = (left_iris_y - left_eye_top_y) / left_eye_height
        left_gaze_y_normalized = (left_gaze_y_ratio - 0.5) * 2
    else:
        left_gaze_y_normalized = 0
    
    print(f"  Normalized gaze Y: {left_gaze_y_normalized:.4f} (-1=up, 0=center, +1=down)")
    
    interpretation = ""
    if abs(left_gaze_normalized) < 0.3 and abs(left_gaze_y_normalized) < 0.3:
        interpretation = "👁️  LOOKING AT CAMERA"
    elif left_gaze_normalized > 0.3:
        interpretation = "👁️  Looking RIGHT"
    elif left_gaze_normalized < -0.3:
        interpretation = "👁️  Looking LEFT"
    elif left_gaze_y_normalized > 0.3:
        interpretation = "👁️  Looking DOWN"
    elif left_gaze_y_normalized < -0.3:
        interpretation = "👁️  Looking UP"
    
    print(f"\n{interpretation}")
    
    # =====================================================================
    # 6. MOUTH/LIPS
    # =====================================================================
    print("\n" + "=" * 70)
    print("6️⃣  MOUTH ANALYSIS")
    print("=" * 70)
    
    mouth_top = landmarks[13]
    mouth_bottom = landmarks[14]
    mouth_left = landmarks[61]
    mouth_right = landmarks[291]
    
    mouth_vertical = abs(mouth_bottom.y - mouth_top.y) * height
    mouth_horizontal = abs(mouth_right.x - mouth_left.x) * width
    mouth_ratio = mouth_vertical / (mouth_horizontal + 1e-6)
    
    print(f"  Vertical opening: {mouth_vertical:.2f} pixels")
    print(f"  Horizontal width: {mouth_horizontal:.2f} pixels")
    print(f"  Mouth Aspect Ratio: {mouth_ratio:.4f}")
    
    if mouth_ratio < 0.1:
        mouth_status = "😐 CLOSED"
    elif mouth_ratio < 0.3:
        mouth_status = "😊 Slightly open (talking?)"
    elif mouth_ratio < 0.5:
        mouth_status = "😮 Open"
    else:
        mouth_status = "😲 Wide open!"
    
    print(f"  Status: {mouth_status}")
    
    # =====================================================================
    # 7. FACE CONTOUR & BOUNDARIES
    # =====================================================================
    print("\n" + "=" * 70)
    print("7️⃣  FACE BOUNDARIES")
    print("=" * 70)
    
    # Get all X and Y coordinates
    x_coords = [lm.x * width for lm in landmarks]
    y_coords = [lm.y * height for lm in landmarks]
    
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)
    
    face_width = x_max - x_min
    face_height = y_max - y_min
    face_center_x = (x_min + x_max) / 2
    face_center_y = (y_min + y_max) / 2
    
    print(f"  Bounding box: ({x_min:.0f}, {y_min:.0f}) to ({x_max:.0f}, {y_max:.0f})")
    print(f"  Face size: {face_width:.0f} x {face_height:.0f} pixels")
    print(f"  Face center: ({face_center_x:.0f}, {face_center_y:.0f})")
    print(f"  Face area: {(face_width * face_height):.0f} sq pixels")
    print(f"  Face % of frame: {(face_width * face_height) / (width * height) * 100:.1f}%")
    
    # Check if centered
    frame_center_x = width / 2
    frame_center_y = height / 2
    offset_x = abs(face_center_x - frame_center_x) / width
    offset_y = abs(face_center_y - frame_center_y) / height
    
    is_centered = offset_x < 0.15 and offset_y < 0.15
    print(f"  Face centered: {'✅ YES' if is_centered else '❌ NO'} (offset: {offset_x:.2%} horizontal, {offset_y:.2%} vertical)")
    
    # =====================================================================
    # 8. Z-DEPTH INFORMATION
    # =====================================================================
    print("\n" + "=" * 70)
    print("8️⃣  DEPTH INFORMATION (Z-coordinates)")
    print("=" * 70)
    
    z_coords = [lm.z for lm in landmarks]
    z_min, z_max = min(z_coords), max(z_coords)
    z_mean = np.mean(z_coords)
    
    print(f"  Z-coordinate range: {z_min:.6f} to {z_max:.6f}")
    print(f"  Z-coordinate mean: {z_mean:.6f}")
    print(f"  Note: Negative Z = forward (closer to camera)")
    print(f"        Positive Z = backward (farther from camera)")
    
    nose_z = landmarks[1].z
    chin_z = landmarks[152].z
    print(f"\n  Nose tip Z: {nose_z:.6f}")
    print(f"  Chin Z: {chin_z:.6f}")
    print(f"  Nose-chin Z diff: {nose_z - chin_z:.6f} {'(nose forward)' if nose_z < chin_z else '(chin forward)'}")
    
    # =====================================================================
    # 9. SUMMARY
    # =====================================================================
    print("\n" + "=" * 70)
    print("9️⃣  QUICK SUMMARY")
    print("=" * 70)
    
    summary = {
        "Face Detected": "✅ YES",
        "Total Landmarks": len(landmarks),
        "Head Pose": f"Yaw: {yaw_estimate:.1f}°, Pitch: {pitch_estimate:.1f}°, Roll: {roll_estimate:.1f}°",
        "Gaze Direction": f"X: {left_gaze_normalized:.2f}, Y: {left_gaze_y_normalized:.2f}",
        "Eye Status": "OPEN" if left_eye_ratio > 0.15 else "CLOSED",
        "Mouth Status": mouth_status,
        "Face Centered": "✅ YES" if is_centered else "❌ NO",
        "Face Size": f"{(face_width * face_height) / (width * height) * 100:.1f}% of frame"
    }
    
    for key, value in summary.items():
        print(f"  {key:20}: {value}")
    
    print("\n" + "=" * 70)
    print("💡 All landmark indices: 0-467 (face mesh) + 468-477 (iris)")
    print("   Full landmark map: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png")
    print("=" * 70)

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🎬 MEDIAPIPE SINGLE FRAME TEST")
    print("="*70)
    print("\nThis will capture ONE picture and show ALL raw MediaPipe outputs")
    print("including landmarks, head pose, gaze direction, etc.\n")
    
    frame = capture_single_frame()
    
    if frame is not None:
    analyze_with_mediapipe(frame)
    print("\n✅ Analysis complete! Check the output above.")
    print("📁 Frame saved as: test_frame.jpg")
    else:
    print("\n❌ Failed to capture frame")
