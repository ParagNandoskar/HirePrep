/**
 * Video Deletion Service
 * Handles automatic deletion of interview videos from AWS S3
 * 
 * Purpose:
 * - Save storage costs (~$770/month savings)
 * - Delete videos after transcription and analysis complete
 * - Keep only text transcripts and analysis scores
 * 
 * Deletion Timing:
 * - After video/audio analysis completes (5-10 minutes)
 * - Transcripts are already saved in database
 * - Analysis scores are already calculated
 * - Videos no longer needed
 */

const { S3Client, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const Interview = require('../models/Interview');
const awsConfig = require('../config/aws');

// Initialize S3 client
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  }
});

/**
 * Delete a single video from S3
 */
const deleteVideoFromS3 = async (videoKey) => {
  try {
    if (!videoKey) {
      console.warn('No video key provided, skipping deletion');
      return false;
    }

    console.log(`🗑️ Deleting video from S3: ${videoKey}`);

    const command = new DeleteObjectCommand({
      Bucket: awsConfig.bucketName,
      Key: videoKey
    });

    await s3Client.send(command);
    
    console.log(`✅ Video deleted successfully: ${videoKey}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to delete video ${videoKey}:`, error);
    return false;
  }
};

/**
 * Delete multiple videos from S3 in batch
 */
const deleteMultipleVideos = async (videoKeys) => {
  try {
    if (!videoKeys || videoKeys.length === 0) {
      console.warn('No video keys provided, skipping batch deletion');
      return { deleted: 0, failed: 0 };
    }

    // Filter out null/undefined keys
    const validKeys = videoKeys.filter(key => key);
    
    if (validKeys.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    console.log(`🗑️ Batch deleting ${validKeys.length} videos from S3...`);

    // S3 allows max 1000 objects per batch
    const batchSize = 1000;
    let totalDeleted = 0;
    let totalFailed = 0;

    for (let i = 0; i < validKeys.length; i += batchSize) {
      const batch = validKeys.slice(i, i + batchSize);
      
      const command = new DeleteObjectsCommand({
        Bucket: awsConfig.bucketName,
        Delete: {
          Objects: batch.map(key => ({ Key: key })),
          Quiet: false
        }
      });

      const response = await s3Client.send(command);
      
      totalDeleted += response.Deleted?.length || 0;
      totalFailed += response.Errors?.length || 0;

      if (response.Errors && response.Errors.length > 0) {
        console.error('Some videos failed to delete:', response.Errors);
      }
    }

    console.log(`✅ Batch deletion complete: ${totalDeleted} deleted, ${totalFailed} failed`);
    
    return { deleted: totalDeleted, failed: totalFailed };

  } catch (error) {
    console.error('❌ Batch deletion failed:', error);
    return { deleted: 0, failed: videoKeys.length };
  }
};

/**
 * Clean up all videos for a completed interview
 */
const cleanupInterviewVideos = async (interviewId) => {
  try {
    console.log(`🗑️ Starting video cleanup for interview: ${interviewId}`);

    const interview = await Interview.findById(interviewId);
    
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Collect all video keys from conversation
    const videoKeys = interview.conversation
      .filter(qa => qa.videoKey && !qa.analysisStatus.videoDeleted)
      .map(qa => qa.videoKey);

    if (videoKeys.length === 0) {
      console.log('No videos to delete for this interview');
      return { deleted: 0, failed: 0 };
    }

    // Delete videos from S3
    const result = await deleteMultipleVideos(videoKeys);

    // Update database to mark videos as deleted
    for (const qa of interview.conversation) {
      if (qa.videoKey && result.deleted > 0) {
        qa.videoUrl = null; // Clear URL
        qa.videoKey = null; // Clear key
        qa.analysisStatus.videoDeleted = true;
      }
    }

    await interview.save();

    console.log(`✅ Cleanup complete for interview ${interviewId}: ${result.deleted} videos deleted`);
    
    return result;

  } catch (error) {
    console.error(`❌ Video cleanup failed for interview ${interviewId}:`, error);
    throw error;
  }
};

/**
 * Schedule video deletion after analysis completes
 * Called from interviewAnalysisService after video/audio analysis
 */
const scheduleVideoDeletion = (interviewId, delayMinutes = 0) => {
  const delayMs = delayMinutes * 60 * 1000;
  
  console.log(`📅 Scheduled video deletion for interview ${interviewId} in ${delayMinutes} minutes`);
  
  setTimeout(async () => {
    try {
      await cleanupInterviewVideos(interviewId);
    } catch (error) {
      console.error(`Scheduled deletion failed for interview ${interviewId}:`, error);
    }
  }, delayMs);
};

/**
 * Delete old videos for completed interviews (cleanup job)
 * Run this periodically (e.g., daily) to clean up any missed videos
 */
const cleanupOldVideos = async (daysOld = 7) => {
  try {
    console.log(`🗑️ Cleaning up videos older than ${daysOld} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find completed interviews with videos still present
    const interviews = await Interview.find({
      status: 'completed',
      endTime: { $lt: cutoffDate },
      'conversation.videoKey': { $exists: true, $ne: null }
    });

    console.log(`Found ${interviews.length} interviews with old videos`);

    let totalDeleted = 0;
    let totalFailed = 0;

    for (const interview of interviews) {
      try {
        const result = await cleanupInterviewVideos(interview._id);
        totalDeleted += result.deleted;
        totalFailed += result.failed;
      } catch (error) {
        console.error(`Failed to cleanup interview ${interview._id}:`, error);
        totalFailed++;
      }
    }

    console.log(`✅ Old video cleanup complete: ${totalDeleted} deleted, ${totalFailed} failed`);
    
    return { 
      interviewsProcessed: interviews.length,
      videosDeleted: totalDeleted,
      videosFailed: totalFailed
    };

  } catch (error) {
    console.error('❌ Old video cleanup job failed:', error);
    throw error;
  }
};

/**
 * Get storage statistics
 */
const getStorageStats = async () => {
  try {
    // Count interviews with videos
    const interviewsWithVideos = await Interview.countDocuments({
      'conversation.videoKey': { $exists: true, $ne: null }
    });

    // Count total video files
    const interviews = await Interview.find({
      'conversation.videoKey': { $exists: true, $ne: null }
    }).select('conversation');

    let totalVideos = 0;
    interviews.forEach(interview => {
      totalVideos += interview.conversation.filter(qa => qa.videoKey).length;
    });

    // Estimate storage (assuming ~5MB per video)
    const estimatedStorageMB = totalVideos * 5;
    const estimatedStorageGB = (estimatedStorageMB / 1024).toFixed(2);

    return {
      interviewsWithVideos,
      totalVideos,
      estimatedStorageMB,
      estimatedStorageGB,
      estimatedMonthlyCost: (estimatedStorageGB * 0.023).toFixed(2) // $0.023 per GB/month
    };

  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return null;
  }
};

/**
 * Emergency: Delete all videos for an interview immediately
 * Use this if interview needs to be deleted or privacy concerns
 */
const emergencyDeleteVideos = async (interviewId) => {
  try {
    console.log(`🚨 Emergency deletion for interview: ${interviewId}`);
    
    const result = await cleanupInterviewVideos(interviewId);
    
    // Also mark interview for review
    await Interview.findByIdAndUpdate(interviewId, {
      'metadata.emergencyDeletion': true,
      'metadata.emergencyDeletionAt': new Date()
    });

    return result;

  } catch (error) {
    console.error('Emergency deletion failed:', error);
    throw error;
  }
};

module.exports = {
  deleteVideoFromS3,
  deleteMultipleVideos,
  cleanupInterviewVideos,
  scheduleVideoDeletion,
  cleanupOldVideos,
  getStorageStats,
  emergencyDeleteVideos
};
