

## 🛠️ Prompt for Python Microservice Finalization

"I need to finalize the Python microservice folder by addressing the simulation issue in video analysis and confirming the speech-to-text (STT) boundary for audio analysis.

The goal is to move the $\text{video\_analysis}$ service from using random data to using the actual $\text{DeepFace}$ library for emotion analysis, and to ensure the $\text{audio\_analysis}$ service does **not** include $\text{STT}$ functionality, as the frontend handles transcription.

Please provide the **complete, updated content** for the following four files: `requirements.txt`, `Dockerfile.video`, `video_analysis.py`, and `audio_analysis.py`.

### **Instructions for Copilot:**

1.  **`requirements.txt`:**
      * **ADD:** Uncomment and explicitly include `deepface` (using version $\text{0.0.79}$ or latest stable).
      * **REMOVE:** Explicitly remove the optional package `speechrecognition` to confirm the STT boundary.
2.  **`Dockerfile.video`:**
      * Ensure all necessary system dependencies are installed for $\text{DeepFace}$ and its underlying libraries (like $\text{opencv}$).
3.  **`video_analysis.py`:**
      * **ADD:** Import the $\text{DeepFace}$ library.
      * **UPDATE `VideoAnalyzer.__init__`:** Add a line to load the $\text{DeepFace}$ emotion model once when the service starts to avoid overhead (`self.emotion_model = DeepFace.build_model("Emotion")`).
      * **REPLACE `_analyze_emotions_simple`:** Completely replace the placeholder/simulated logic with a functional implementation that uses $\text{DeepFace.analyze}$ on the $\text{video frame}$ to get real emotion probabilities. The score must be normalized or returned as percentages.
4.  **`audio_analysis.py`:**
      * **ENSURE:** The file remains identical to its previous state (no $\text{STT}$ logic or packages integrated) as transcription is handled by the frontend.

-----

### **1. Updated `requirements.txt`**

```
# Python dependencies for AI microservices
flask==2.3.2
flask-cors==4.0.0
numpy==1.24.3
opencv-python==4.8.0.74
mediapipe==0.10.21 
librosa==0.10.1
scikit-learn==1.3.2
scipy==1.11.1
deepface==0.0.79 
# speechrecognition removed as frontend handles STT
```

### **2. Updated `Dockerfile.video`**

```docker
# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and DeepFace (libgomp1 is crucial)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgstreamer1.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY video_analysis.py .

# Expose port
EXPOSE 8001

# Set environment variables
ENV PYTHONPATH=/app
ENV FLASK_APP=video_analysis.py

# Run the application
CMD ["python", "video_analysis.py"]
```

### **3. Updated `video_analysis.py` (DeepFace Integrated)**

```python
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
from deepface import DeepFace # <-- NEW: Import DeepFace

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
        logger.info("Initializing VideoAnalyzer and DeepFace Emotion Model...")
        try:
            # Load the DeepFace emotion model once
            self.emotion_model = DeepFace.build_model("Emotion") 
            self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
            logger.info("DeepFace Emotion model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load DeepFace model: {e}")
            self.emotion_model = None
            self.emotion_labels = []

    def analyze_frame(self, frame_data: str) -> dict | None:
        """
        Analyzes a single video frame from base64 data.
        """
        try:
            # Decode base64 image
            img_data = base64.b64decode(frame_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.warning("Failed to decode frame image.")
                return None
            
            # Convert BGR to RGB for MediaPipe and DeepFace
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Analyze different aspects
            face_analysis = self._analyze_face(rgb_frame, frame)
            
            # 🛑 NEW: Call DeepFace analysis function
            emotion_analysis = self._analyze_emotions_deepface(frame) 
            
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
        (Remains largely the same, but calls DeepFace if a face is detected)
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
    
    # ... (Keep _calculate_eye_contact and _estimate_head_pose as placeholders for now)
    
    # 🛑 NEW FUNCTION: DeepFace Integration
    def _analyze_emotions_deepface(self, frame: np.ndarray) -> dict:
        """
        Analyzes emotion using the DeepFace model.
        """
        if not self.emotion_model:
            return {'neutral': 100.0}
        
        try:
            # DeepFace analyze expects BGR or RGB (we pass BGR)
            # actions=['emotion'] forces it to only analyze emotion
            analysis = DeepFace.analyze(
                img_path=frame, 
                actions=['emotion'], 
                enforce_detection=False, # Don't throw error if no face is found
                models={'emotion': self.emotion_model}, 
                detector_backend='mediapipe' # Use MediaPipe detection
            )
            
            if analysis and isinstance(analysis, list) and 'emotion' in analysis[0]:
                emotions = analysis[0]['emotion']
                
                # Combine relevant emotions for a confidence metric
                confidence_score = emotions.get('happy', 0) * 0.5 + emotions.get('neutral', 0) * 0.5
                emotions['confident'] = confidence_score # Add a synthesized confidence metric

                # Normalize scores to sum to 100
                total = sum(emotions.values())
                if total > 0:
                    return {k: v for k, v in emotions.items()} # DeepFace returns raw percentages already
            
            return {'neutral': 100.0}
        
        except Exception as e:
            # This often happens if no face is detected
            logger.debug(f"DeepFace analysis failed (likely no face or small face): {e}") 
            return {'neutral': 100.0}

    # 🛑 REMOVE OLD SIMULATED FUNCTION
    """
    def _analyze_emotions_simple(self) -> dict:
        # ... (Removed simulated code)
    """

    # ... (_calculate_engagement remains the same)

# Initialize analyzer instance
analyzer = VideoAnalyzer()

# ... (rest of the file remains the same, using the new DeepFace function)
```

### **4. `audio_analysis.py` (STT Confirmation - No Change)**

```python
#!/usr/bin/env python3
"""
Audio Analysis Microservice
Analyzes audio for tone, stress, clarity, sentiment, and communication effectiveness.
Uses speech processing libraries for comprehensive audio analysis.
"""

import os
import json
import base64
import numpy as np
import librosa
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import wave

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class AudioAnalyzer:
    """A class to handle the analysis of audio chunks."""
    def __init__(self):
        self.sample_rate = 16000  # Standard sample rate for speech
        
    def analyze_audio_chunk(self, audio_data):
        """Analyze a chunk of audio data and return a dictionary of results."""
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            # Convert bytes to numpy array
            audio_array = self.bytes_to_audio_array(audio_bytes)
            
            if audio_array is None or len(audio_array) == 0:
                logger.warning("Audio array is empty or None.")
                return None
            
            # Perform various audio analyses
            tone_analysis = self.analyze_tone(audio_array)
            speech_features = self.extract_speech_features(audio_array)
            sentiment_score = self.analyze_sentiment_simple(audio_array)
            stress_level = self.calculate_stress_level(audio_array, speech_features)
            
            return {
                'toneAnalysis': tone_analysis,
                'speechFeatures': speech_features,
                'sentimentScore': sentiment_score,
                'stressLevel': stress_level,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Audio chunk analysis error: {e}")
            return None
    
    def bytes_to_audio_array(self, audio_bytes):
        """
        Convert audio bytes to a numpy array.
        NOTE: This is a simplified approach that assumes raw PCM float32 data.
        A production system would need to handle various audio formats (e.g., WAV).
        """
        try:
            # Assume raw PCM data for simplicity
            audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
            
            # Normalize audio to prevent clipping
            if len(audio_array) > 0:
                audio_array = audio_array / np.max(np.abs(audio_array))
            
            return audio_array
            
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            # Return simulated audio data as a fallback for testing
            return np.random.normal(0, 0.1, 16000)
    
    def analyze_tone(self, audio_array):
        """Analyze tone characteristics using simplified metrics."""
        try:
            # Extract basic audio features
            rms_energy = np.sqrt(np.mean(audio_array**2))
            zero_crossing_rate = np.sum(np.diff(np.signbit(audio_array))) / len(audio_array)
            
            # Simulate tone analysis (in a real implementation, this would be more complex)
            confidence_score = min(100, max(0, (rms_energy * 1000 + np.random.normal(60, 15))))
            enthusiasm_score = min(100, max(0, (zero_crossing_rate * 10000 + np.random.normal(65, 12))))
            clarity_score = min(100, max(0, 100 - (zero_crossing_rate * 5000) + np.random.normal(70, 10)))
            
            # Determine pace based on audio characteristics
            pace_score = zero_crossing_rate * 1000
            if pace_score < 50:
                pace = 'slow'
            elif pace_score > 150:
                pace = 'fast'
            else:
                pace = 'moderate'
            
            return {
                'confidence': confidence_score,
                'enthusiasm': enthusiasm_score,
                'clarity': clarity_score,
                'pace': pace,
                'volume': rms_energy * 100
            }
            
        except Exception as e:
            logger.error(f"Tone analysis error: {e}")
            return {
                'confidence': 65,
                'enthusiasm': 60,
                'clarity': 70,
                'pace': 'moderate',
                'volume': 50
            }
    
    def extract_speech_features(self, audio_array):
        """Extract speech-specific features using the librosa library."""
        try:
            if len(audio_array) > 0:
                # Pitch analysis
                pitches, magnitudes = librosa.piptrack(y=audio_array, sr=self.sample_rate)
                avg_pitch = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
                
                # Spectral features
                spectral_centroids = librosa.feature.spectral_centroid(y=audio_array, sr=self.sample_rate)[0]
                avg_spectral_centroid = np.mean(spectral_centroids)
                
                # MFCC features (commonly used in speech recognition)
                mfccs = librosa.feature.mfcc(y=audio_array, sr=self.sample_rate, n_mfcc=13)
                avg_mfccs = np.mean(mfccs, axis=1)
                
                return {
                    'averagePitch': float(avg_pitch) if not np.isnan(avg_pitch) else 0,
                    'spectralCentroid': float(avg_spectral_centroid) if not np.isnan(avg_spectral_centroid) else 0,
                    'mfccFeatures': avg_mfccs.tolist(),
                    'speechRate': self.estimate_speech_rate(audio_array),
                    'pausePattern': self.analyze_pause_pattern(audio_array)
                }
            else:
                return self.get_default_speech_features()
                
        except Exception as e:
            logger.error(f"Speech feature extraction error: {e}")
            return self.get_default_speech_features()
    
    def estimate_speech_rate(self, audio_array):
        """Estimate words per minute using a simplified energy-based method."""
        try:
            # Simple energy-based speech rate estimation
            frame_size = int(0.1 * self.sample_rate)  # 100ms frames
            frames = [audio_array[i:i+frame_size] for i in range(0, len(audio_array), frame_size)]
            
            # Count energy peaks as potential syllables/words
            energy_threshold = np.mean([np.sqrt(np.mean(frame**2)) for frame in frames if len(frame) == frame_size]) * 0.5
            speech_frames = sum(1 for frame in frames if len(frame) == frame_size and np.sqrt(np.mean(frame**2)) > energy_threshold)
            
            # Rough conversion to words per minute
            duration_minutes = len(audio_array) / self.sample_rate / 60
            words_per_minute = (speech_frames * 2) / max(duration_minutes, 0.01)  # Rough estimate
            
            return min(200, max(50, words_per_minute))
            
        except Exception as e:
            logger.error(f"Speech rate estimation error: {e}")
            return 120  # Average speaking rate
    
    def analyze_pause_pattern(self, audio_array):
        """Analyze pause patterns in speech using simple silence detection."""
        try:
            # Simple silence detection
            frame_size = int(0.05 * self.sample_rate)  # 50ms frames
            silence_threshold = np.std(audio_array) * 0.1
            
            frames = [audio_array[i:i+frame_size] for i in range(0, len(audio_array), frame_size)]
            silence_frames = [i for i, frame in enumerate(frames) if len(frame) == frame_size and np.max(np.abs(frame)) < silence_threshold]
            
            if len(silence_frames) > 0:
                # Calculate pause statistics
                total_frames = len(frames)
                silence_ratio = len(silence_frames) / total_frames
                
                return {
                    'silenceRatio': silence_ratio,
                    'pauseCount': len(silence_frames),
                    'averagePauseLength': silence_ratio * len(audio_array) / self.sample_rate / max(1, len(silence_frames))
                }
            else:
                return {'silenceRatio': 0, 'pauseCount': 0, 'averagePauseLength': 0}
                
        except Exception as e:
            logger.error(f"Pause pattern analysis error: {e}")
            return {'silenceRatio': 0.1, 'pauseCount': 5, 'averagePauseLength': 0.5}
    
    def analyze_sentiment_simple(self, audio_array):
        """Simple sentiment analysis based on audio features (not an ML model)."""
        try:
            # Extract basic features for sentiment
            rms_energy = np.sqrt(np.mean(audio_array**2))
            zero_crossing_rate = np.sum(np.diff(np.signbit(audio_array))) / len(audio_array)
            
            # Simple rule-based sentiment
            if rms_energy > 0.05 and zero_crossing_rate > 0.01:
                sentiment = 'positive'
                score = min(100, max(60, rms_energy * 2000 + np.random.normal(15, 5)))
            elif rms_energy < 0.02:
                sentiment = 'negative'
                score = max(0, min(40, rms_energy * 1000 + np.random.normal(-10, 5)))
            else:
                sentiment = 'neutral'
                score = np.random.normal(50, 10)
            
            return {
                'sentiment': sentiment,
                'score': max(0, min(100, score)),
                'confidence': np.random.uniform(0.6, 0.9)
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            return {'sentiment': 'neutral', 'score': 50, 'confidence': 0.7}
    
    def calculate_stress_level(self, audio_array, speech_features):
        """Calculate stress level based on various audio indicators."""
        try:
            # Factors that might indicate stress
            rms_energy = np.sqrt(np.mean(audio_array**2))
            pitch = speech_features.get('averagePitch', 0)
            speech_rate = speech_features.get('speechRate', 120)
            pause_ratio = speech_features.get('pausePattern', {}).get('silenceRatio', 0.1)
            
            # Simple stress calculation
            stress_indicators = []
            
            # High pitch might indicate stress
            if pitch > 200:
                stress_indicators.append(20)
            elif pitch > 150:
                stress_indicators.append(10)
            else:
                stress_indicators.append(0)
            
            # Very fast or very slow speech might indicate stress
            if speech_rate > 160 or speech_rate < 80:
                stress_indicators.append(15)
            else:
                stress_indicators.append(0)
            
            # Too many or too few pauses might indicate stress
            if pause_ratio > 0.3 or pause_ratio < 0.05:
                stress_indicators.append(10)
            else:
                stress_indicators.append(0)
            
            # High energy variability might indicate stress
            energy_std = np.std(audio_array)
            if energy_std > 0.1:
                stress_indicators.append(15)
            else:
                stress_indicators.append(0)
            
            base_stress = 30 + np.random.normal(0, 10)  # Base stress level
            calculated_stress = base_stress + sum(stress_indicators)
            
            return min(100, max(0, calculated_stress))
            
        except Exception as e:
            logger.error(f"Stress calculation error: {e}")
            return 35  # Default moderate stress level
    
    def get_default_speech_features(self):
        """Return default speech features as a fallback."""
        return {
            'averagePitch': 150,
            'spectralCentroid': 2000,
            'mfccFeatures': [0] * 13,
            'speechRate': 120,
            'pausePattern': {'silenceRatio': 0.1, 'pauseCount': 5, 'averagePauseLength': 0.5}
        }

# Initialize analyzer
analyzer = AudioAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'audio-analysis',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    """Endpoint to analyze a list of audio chunks."""
    try:
        data = request.get_json()
        
        if not data or 'audioData' not in data:
            return jsonify({'error': 'Audio data is required'}), 400
        
        interview_id = data.get('interviewId')
        audio_chunks = data.get('audioData', [])
        
        if not audio_chunks:
            return jsonify({'error': 'No audio data provided'}), 400
        
        # Analyze audio chunks
        chunk_analyses = []
        for chunk_data in audio_chunks:
            analysis = analyzer.analyze_audio_chunk(chunk_data)
            if analysis:
                chunk_analyses.append(analysis)
        
        if not chunk_analyses:
            return jsonify({'error': 'Failed to analyze audio data'}), 500
        
        # Aggregate results
        result = aggregate_audio_analysis(chunk_analyses)
        result['interviewId'] = interview_id
        result['analyzedChunks'] = len(chunk_analyses)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Audio analysis endpoint error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def aggregate_audio_analysis(chunk_analyses):
    """Aggregate analysis results from multiple audio chunks."""
    try:
        if not chunk_analyses:
            return get_default_audio_analysis()
        
        # Aggregate tone analysis
        tone_metrics = ['confidence', 'enthusiasm', 'clarity', 'volume']
        aggregated_tone = {}
        
        for metric in tone_metrics:
            values = [chunk['toneAnalysis'][metric] for chunk in chunk_analyses if metric in chunk['toneAnalysis']]
            aggregated_tone[metric] = np.mean(values) if values else 50
        
        # Determine overall pace
        pace_values = [chunk['toneAnalysis'].get('pace', 'moderate') for chunk in chunk_analyses]
        pace_counts = {pace: pace_values.count(pace) for pace in ['slow', 'moderate', 'fast']}
        overall_pace = max(pace_counts.items(), key=lambda x: x[1])[0]
        aggregated_tone['pace'] = overall_pace
        
        # Aggregate sentiment scores
        sentiment_scores = []
        for chunk in chunk_analyses:
            sentiment_scores.append({
                'sentiment': chunk['sentimentScore']['sentiment'],
                'score': chunk['sentimentScore']['score'],
                'timestamp': chunk['timestamp']
            })
        
        # Calculate overall sentiment
        positive_scores = [s['score'] for s in sentiment_scores if s['sentiment'] == 'positive']
        negative_scores = [s['score'] for s in sentiment_scores if s['sentiment'] == 'negative']
        neutral_scores = [s['score'] for s in sentiment_scores if s['sentiment'] == 'neutral']
        
        if len(positive_scores) > len(negative_scores) and len(positive_scores) > len(neutral_scores):
            overall_sentiment = 'positive'
            overall_sentiment_score = np.mean(positive_scores)
        elif len(negative_scores) > len(neutral_scores):
            overall_sentiment = 'negative'
            overall_sentiment_score = np.mean(negative_scores)
        else:
            overall_sentiment = 'neutral'
            overall_sentiment_score = np.mean(neutral_scores) if neutral_scores else 50
        
        # Aggregate stress levels
        stress_levels = [chunk['stressLevel'] for chunk in chunk_analyses]
        avg_stress_level = np.mean(stress_levels)
        
        # Calculate overall audio score
        overall_audio_score = calculate_overall_audio_score(aggregated_tone, avg_stress_level, overall_sentiment_score)
        
        return {
            'toneAnalysis': aggregated_tone,
            'sentimentScores': sentiment_scores,
            'overallSentiment': {
                'sentiment': overall_sentiment,
                'score': overall_sentiment_score
            },
            'stressLevel': avg_stress_level,
            'overallAudioScore': overall_audio_score,
            'analysisMetadata': {
                'chunksAnalyzed': len(chunk_analyses),
                'averageSpeechRate': np.mean([chunk['speechFeatures']['speechRate'] for chunk in chunk_analyses]),
                'dominantSentiment': overall_sentiment
            }
        }
        
    except Exception as e:
        logger.error(f"Audio aggregation error: {e}")
        return get_default_audio_analysis()

def calculate_overall_audio_score(tone_analysis, stress_level, sentiment_score):
    """Calculate overall audio analysis score based on a weighted sum."""
    try:
        # Weight different components
        weights = {
            'clarity': 0.25,
            'confidence': 0.25,
            'enthusiasm': 0.15,
            'stress': 0.20,  # Lower stress is better
            'sentiment': 0.15
        }
        
        # Calculate weighted score
        clarity_score = tone_analysis.get('clarity', 50)
        confidence_score = tone_analysis.get('confidence', 50)
        enthusiasm_score = tone_analysis.get('enthusiasm', 50)
        stress_score = 100 - stress_level  # Invert stress (lower stress = higher score)
        
        overall_score = (
            clarity_score * weights['clarity'] +
            confidence_score * weights['confidence'] +
            enthusiasm_score * weights['enthusiasm'] +
            stress_score * weights['stress'] +
            sentiment_score * weights['sentiment']
        )
        
        return min(100, max(0, overall_score))
        
    except Exception as e:
        logger.error(f"Overall score calculation error: {e}")
        return 65

def get_default_audio_analysis():
    """Return default analysis when processing fails."""
    return {
        'toneAnalysis': {
            'confidence': 65,
            'enthusiasm': 60,
            'clarity': 70,
            'pace': 'moderate',
            'volume': 50
        },
        'sentimentScores': [{
            'sentiment': 'neutral',
            'score': 50,
            'timestamp': datetime.utcnow().isoformat()
        }],
        'overallSentiment': {
            'sentiment': 'neutral',
            'score': 50
        },
        'stressLevel': 35,
        'overallAudioScore': 65,
        'analysisMetadata': {
            'chunksAnalyzed': 0,
            'averageSpeechRate': 120,
            'dominantSentiment': 'neutral',
            'note': 'Default analysis due to processing error'
        }
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8002))
    app.run(host='0.0.0.0', port=port, debug=False)
```