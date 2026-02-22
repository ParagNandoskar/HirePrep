#!/usr/bin/env python3
"""
MongoDB Storage Module for Video Analysis Service

Handles storing frame-by-frame analysis data in MongoDB
for detailed interview evaluation and reporting.
"""

import os
import logging
from datetime import datetime
from pymongo import MongoClient, ASCENDING, errors
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class VideoAnalysisStorage:
    def __init__(self, mongo_uri=None, database='hireprep'):
        """
        Initialize MongoDB connection
        
        Args:
            mongo_uri: MongoDB connection string (default: from env var)
            database: Database name (default: 'hireprep')
        """
        self.mongo_uri = mongo_uri or os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        self.database_name = database
        self.client = None
        self.db = None
        self.collection = None
        self.enabled = os.getenv('MONGO_STORAGE_ENABLED', 'false').lower() == 'true'
        
        if self.enabled:
            try:
                self._connect()
                logger.info(f"✅ MongoDB storage enabled (database: {database})")
            except Exception as e:
                logger.error(f"❌ MongoDB connection failed: {e}")
                logger.warning("   Video analysis will continue without MongoDB storage")
                self.enabled = False
        else:
            logger.info("ℹ️  MongoDB storage disabled (set MONGO_STORAGE_ENABLED=true to enable)")
    
    def _connect(self):
        """Establish MongoDB connection"""
        self.client = MongoClient(
            self.mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            tlsAllowInvalidCertificates=True  # For development on macOS
        )
        
        # Test connection
        self.client.server_info()
        
        self.db = self.client[self.database_name]
        self.collection = self.db['videoanalysisframes']
        
        # Create indexes for performance
        self._create_indexes()
    
    def _create_indexes(self):
        """Create database indexes for efficient queries"""
        try:
            # Compound indexes
            self.collection.create_index([
                ('interviewId', ASCENDING),
                ('timestamp', ASCENDING)
            ])
            self.collection.create_index([
                ('interviewId', ASCENDING),
                ('questionId', ASCENDING),
                ('timestamp', ASCENDING)
            ])
            self.collection.create_index([
                ('candidateId', ASCENDING),
                ('timestamp', ASCENDING)
            ])
            
            # Single field indexes
            self.collection.create_index('interviewId')
            self.collection.create_index('timestamp')
            
            logger.debug("   MongoDB indexes created successfully")
        except Exception as e:
            logger.warning(f"   Could not create indexes: {e}")
    
    def store_frame(self, frame_data, interview_id, candidate_id, question_id=None):
        """
        Store a single frame analysis result
        
        Args:
            frame_data: Analysis result dict from analyze_frame()
            interview_id: MongoDB ObjectId of the interview (string)
            candidate_id: MongoDB ObjectId of the candidate (string)
            question_id: Optional question number being answered (int)
        
        Returns:
            ObjectId of inserted document or None if failed
        """
        if not self.enabled:
            return None
        
        try:
            # Transform data to match VideoAnalysisFrame schema
            document = self._transform_frame_data(
                frame_data, 
                interview_id, 
                candidate_id, 
                question_id
            )
            
            # Insert into MongoDB
            result = self.collection.insert_one(document)
            logger.debug(f"   Frame stored in MongoDB: {result.inserted_id}")
            
            return result.inserted_id
            
        except Exception as e:
            logger.error(f"❌ Failed to store frame in MongoDB: {e}")
            return None
    
    def store_frames_batch(self, frames_data, interview_id, candidate_id, question_id=None):
        """
        Store multiple frames in a single batch operation (more efficient)
        
        Args:
            frames_data: List of analysis result dicts
            interview_id: MongoDB ObjectId of the interview (string)
            candidate_id: MongoDB ObjectId of the candidate (string)
            question_id: Optional question number being answered (int)
        
        Returns:
            List of inserted ObjectIds or empty list if failed
        """
        if not self.enabled or not frames_data:
            return []
        
        try:
            # Transform all frames
            documents = [
                self._transform_frame_data(frame, interview_id, candidate_id, question_id)
                for frame in frames_data
            ]
            
            # Batch insert
            result = self.collection.insert_many(documents, ordered=False)
            logger.info(f"✅ Stored {len(result.inserted_ids)} frames in MongoDB")
            
            return result.inserted_ids
            
        except errors.BulkWriteError as e:
            # Some succeeded, some failed
            logger.warning(f"⚠️  Partial success storing frames: {e.details}")
            return []
        except Exception as e:
            logger.error(f"❌ Failed to store frames batch in MongoDB: {e}")
            return []
    
    def _convert_numpy_types(self, obj):
        """
        Recursively convert numpy types to Python native types for MongoDB
        
        MongoDB cannot serialize numpy types (float32, float64, int64, etc.)
        This function converts them to native Python types
        """
        import numpy as np
        
        if isinstance(obj, dict):
            return {key: self._convert_numpy_types(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy_types(item) for item in obj]
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj)  # Convert to Python float
        elif isinstance(obj, np.ndarray):
            return obj.tolist()  # Convert arrays to lists
        elif isinstance(obj, np.bool_):
            return bool(obj)  # Convert numpy bool to Python bool
        else:
            return obj
    
    def _transform_frame_data(self, frame_data, interview_id, candidate_id, question_id):
        """
        Transform Flask API response format to MongoDB schema format
        
        Args:
            frame_data: Dict from analyze_frame()
            interview_id: Interview ObjectId (string)
            candidate_id: Candidate ObjectId (string)
            question_id: Question number (int or None)
        
        Returns:
            Document dict matching VideoAnalysisFrame schema
        """
        # Convert all numpy types to Python native types first
        frame_data = self._convert_numpy_types(frame_data)
        
        face_det = frame_data.get('face_detection', {})
        emotions = frame_data.get('emotions', {})
        
        # Extract looking away direction from head pose
        looking_away_dir = 'none'
        if face_det.get('looking_away'):
            head_pose = face_det.get('head_pose', {})
            yaw = abs(head_pose.get('yaw', 0))
            pitch = head_pose.get('pitch', 0)
            
            if yaw > abs(pitch):
                looking_away_dir = 'left' if head_pose.get('yaw', 0) < 0 else 'right'
            elif pitch > 0:
                looking_away_dir = 'down'
            elif pitch < 0:
                looking_away_dir = 'up'
        
        document = {
            # References
            'interviewId': ObjectId(interview_id),
            'candidateId': ObjectId(candidate_id),
            'questionId': question_id,
            
            # Temporal data
            'timestamp': datetime.fromisoformat(frame_data.get('timestamp', datetime.now().isoformat())),
            
            # Face detection (MediaPipe)
            'faceDetection': {
                'detected': face_det.get('face_detected', False),
                'confidence': face_det.get('face_confidence', 0.0),
                'headPose': {
                    'pitch': face_det.get('head_pose', {}).get('pitch', 0.0),
                    'yaw': face_det.get('head_pose', {}).get('yaw', 0.0),
                    'roll': face_det.get('head_pose', {}).get('roll', 0.0)
                },
                'gaze': {
                    'x': face_det.get('gaze', {}).get('x', 0.0),
                    'y': face_det.get('gaze', {}).get('y', 0.0)
                },
                'lookingAway': face_det.get('looking_away', False),
                'lookingAwayDirection': looking_away_dir
            },
            
            # Emotion analysis (DeepFace)
            'emotion': {
                'dominant': emotions.get('dominant', 'unknown'),
                'scores': emotions.get('scores', {})
            },
            
            # Confidence scores
            'scores': {
                'eyeContact': face_det.get('eye_contact_score', 0.0),
                'engagement': frame_data.get('video_confidence', 0.0),
                'videoConfidence': frame_data.get('video_confidence', 0.0)
            },
            
            # Metadata
            'version': 'v2.0',  # MediaPipe + DeepFace dual-modal
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        
        return document
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def __del__(self):
        """Destructor to ensure connection is closed"""
        self.close()


# Global storage instance (initialized in video_analysis.py)
storage = None

def init_storage(mongo_uri=None, database='hireprep'):
    """
    Initialize global storage instance
    
    Usage in video_analysis.py:
        from mongo_storage import init_storage, storage
        init_storage(mongo_uri=os.getenv('MONGODB_URI'))
    """
    global storage
    storage = VideoAnalysisStorage(mongo_uri, database)
    return storage
