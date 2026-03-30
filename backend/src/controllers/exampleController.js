/**
 * Example Controller - Resume API with Caching and Queue Integration
 * This demonstrates production-grade implementation using:
 * - Redis caching for frequently accessed data
 * - Queue system for background processing
 * - Error handling and fallbacks
 * - Proper response formatting
 */

const cacheService = require('../services/cacheService');
const {
  addResumeJob,
  addInterviewJob,
  getJobStatus,
  getQueueStats,
} = require('../services/queue');

// Assuming you have a Resume model
// const Resume = require('../models/Resume');
// const Candidate = require('../models/Candidate');

/**
 * Get resume by ID (with caching)
 * First request: DB hit + cache set
 * Subsequent requests: Redis hit (faster)
 */
async function getResume(req, res) {
  try {
    const { resumeId } = req.params;

    // Validate input
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID is required',
      });
    }

    const cacheKey = `resume:${resumeId}`;

    // Custom wrap() to use cache with fallback
    const resume = await cacheService.wrap(
      cacheKey,
      async () => {
        // Simulated DB fetch
        // const doc = await Resume.findById(resumeId).lean();
        const doc = {
          _id: resumeId,
          title: 'Sample Resume',
          skills: ['JavaScript', 'Node.js', 'MongoDB'],
          createdAt: new Date(),
        };
        return doc || null;
      },
      3600 // 1 hour TTL
    );

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: resume,
      source: 'database with caching',
    });
  } catch (error) {
    console.error('❌ Error fetching resume:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch resume',
    });
  }
}

/**
 * Upload and parse resume (with queue)
 * Stores job in queue for background processing
 * Returns job ID immediately for polling progress
 */
async function uploadResume(req, res) {
  try {
    const { candidateId } = req.body;
    const fileUrl = req.file?.location || req.body.fileUrl;

    if (!candidateId || !fileUrl) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID and file URL are required',
      });
    }

    // Create resume document in DB
    // const resume = await Resume.create({
    //   candidateId,
    //   fileUrl,
    //   parsed: false,
    // });

    const resumeId = 'resume_' + Date.now(); // Simulated ID

    // Add background job to queue
    const job = await addResumeJob(resumeId, {
      candidateId,
      fileUrl,
    });

    // Invalidate candidate's cached data (if exists)
    await cacheService.deletePattern(`candidate:${candidateId}:*`);

    return res.status(202).json({
      success: true,
      message: 'Resume uploaded. Processing started in background.',
      resumeId,
      jobId: job.id,
      checkProgressUrl: `/api/queue/job/${job.id}`,
    });
  } catch (error) {
    console.error('❌ Error uploading resume:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload resume',
    });
  }
}

/**
 * Update resume (with cache invalidation)
 * Automatically invalidates cached data when data changes
 */
async function updateResume(req, res) {
  try {
    const { resumeId } = req.params;
    const updateData = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID is required',
      });
    }

    // Update in database
    // const updatedResume = await Resume.findByIdAndUpdate(
    //   resumeId,
    //   updateData,
    //   { new: true }
    // );

    const updatedResume = {
      _id: resumeId,
      ...updateData,
      updatedAt: new Date(),
    };

    // Invalidate cache for this resume
    const cacheKey = `resume:${resumeId}`;
    await cacheService.delete(cacheKey);

    // Also invalidate related candidate cache
    if (updateData.candidateId) {
      await cacheService.deletePattern(`candidate:${updateData.candidateId}:*`);
    }

    return res.status(200).json({
      success: true,
      message: 'Resume updated successfully',
      data: updatedResume,
    });
  } catch (error) {
    console.error('❌ Error updating resume:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update resume',
    });
  }
}

/**
 * Get all resumes for candidate (with caching)
 * Caches list of resumes to reduce DB queries
 */
async function getCandidateResumes(req, res) {
  try {
    const { candidateId } = req.params;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID is required',
      });
    }

    const cacheKey = `candidate:${candidateId}:resumes`;

    const resumes = await cacheService.wrap(
      cacheKey,
      async () => {
        // Simulated DB query
        // const docs = await Resume.find({ candidateId }).lean();
        const docs = [
          {
            _id: 'resume_1',
            candidateId,
            title: 'Resume 1',
          },
          {
            _id: 'resume_2',
            candidateId,
            title: 'Resume 2',
          },
        ];
        return docs;
      },
      1800 // 30 minutes TTL
    );

    return res.status(200).json({
      success: true,
      data: resumes,
      count: resumes.length,
    });
  } catch (error) {
    console.error('❌ Error fetching candidate resumes:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes',
    });
  }
}

/**
 * Analyze resume (with queue and AI limiter)
 * Long-running operation moved to background queue
 */
async function analyzeResume(req, res) {
  try {
    const { resumeId } = req.params;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID is required',
      });
    }

    // Add analysis job to interview queue (AI processing uses interview queue)
    const job = await addInterviewJob(resumeId, {
      type: 'resume-analysis',
      resumeId,
    });

    return res.status(202).json({
      success: true,
      message: 'Resume analysis started',
      jobId: job.id,
      checkProgressUrl: `/api/queue/job/${job.id}`,
    });
  } catch (error) {
    console.error('❌ Error analyzing resume:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to start resume analysis',
    });
  }
}

/**
 * Get job status (for polling queue progress)
 * Returns current state and progress percentage
 */
async function checkJobProgress(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    // Try to get status from any queue
    let jobStatus = await getJobStatus(jobId, 'resume-processing');
    if (!jobStatus) {
      jobStatus = await getJobStatus(jobId, 'interview-analysis');
    }
    if (!jobStatus) {
      jobStatus = await getJobStatus(jobId, 'job-recommendations');
    }
    if (!jobStatus) {
      jobStatus = await getJobStatus(jobId, 'email-notifications');
    }

    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: jobStatus,
    });
  } catch (error) {
    console.error('❌ Error checking job progress:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to check job progress',
    });
  }
}

/**
 * Get queue statistics
 * Returns counts of active, completed, failed, etc. jobs
 */
async function getQueueInfo(req, res) {
  try {
    const { queueName } = req.query;

    const stats = await getQueueStats(queueName || 'resume-processing');

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error fetching queue stats:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics',
    });
  }
}

/**
 * Get cache statistics
 * Returns memory usage, key count, connection status
 */
async function getCacheStats(req, res) {
  try {
    const stats = await cacheService.getStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error fetching cache stats:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
    });
  }
}

module.exports = {
  getResume,
  uploadResume,
  updateResume,
  getCandidateResumes,
  analyzeResume,
  checkJobProgress,
  getQueueInfo,
  getCacheStats,
};
