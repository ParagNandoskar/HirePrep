import { apiService } from './api';

/**
 * Upload a single interview video to AWS S3
 * @param {Blob} videoBlob - The video blob to upload
 * @param {object} metadata - Additional metadata (questionId, jobId, etc.)
 * @returns {Promise} Response with video URL and key
 */
export const uploadInterviewVideo = async (videoBlob, metadata = {}) => {
  try {
    const formData = new FormData();
    
    // Create filename with metadata
    const timestamp = Date.now();
    const fileName = `interview_${metadata.jobId || 'unknown'}_${metadata.questionId || timestamp}.webm`;
    
    // Append video blob as file
    formData.append('video', videoBlob, fileName);
    
    // Upload to backend which will upload to AWS S3
    const response = await apiService.post('/upload/interview-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Show upload progress if needed
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

/**
 * Upload multiple interview videos to AWS S3
 * @param {Array<{blob: Blob, metadata: object}>} videos - Array of video blobs with metadata
 * @returns {Promise} Response with array of video URLs
 */
export const uploadInterviewVideos = async (videos) => {
  try {
    const formData = new FormData();
    
    // Append all videos
    videos.forEach((video, index) => {
      const timestamp = Date.now();
      const fileName = `interview_${video.metadata?.jobId || 'unknown'}_q${index + 1}_${timestamp}.webm`;
      formData.append('videos', video.blob, fileName);
    });
    
    // Upload to backend
    const response = await apiService.post('/upload/interview-videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading videos:', error);
    throw error;
  }
};

/**
 * Upload videos with progress tracking
 * @param {Array} videos - Array of video blobs
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise} Array of uploaded video URLs
 */
export const uploadVideosWithProgress = async (videos, onProgress) => {
  const uploadedVideos = [];
  
  for (let i = 0; i < videos.length; i++) {
    try {
      const video = videos[i];
      const result = await uploadInterviewVideo(video.blob, video.metadata);
      uploadedVideos.push(result.data);
      
      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: videos.length,
          percentage: Math.round(((i + 1) / videos.length) * 100),
          currentVideo: result.data
        });
      }
    } catch (error) {
      console.error(`Error uploading video ${i + 1}:`, error);
      // Continue with other videos even if one fails
    }
  }
  
  return uploadedVideos;
};

export default {
  uploadInterviewVideo,
  uploadInterviewVideos,
  uploadVideosWithProgress
};
