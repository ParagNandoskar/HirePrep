const { Queue, Worker, QueueScheduler } = require('bullmq');
const redisClient = require('../config/redis');
const { REDIS_ENABLED } = require('../config/redis');

/**
 * Bull Queue Configuration
 * Handles background jobs like resume parsing, AI processing, etc.
 * Requires: npm install bullmq
 */

// Redis connection object for Bull (uses the same Redis instance)
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
};

const queuesEnabled = REDIS_ENABLED;

const createDisabledQueue = (name) => ({
  name,
  add: async () => {
    throw new Error(`Queue '${name}' is disabled because REDIS_ENABLED=false`);
  },
  getJob: async () => null,
  getCountsBy: async () => ({ active: 0, completed: 0, failed: 0, delayed: 0, waiting: 0, paused: 0 }),
  clean: async () => {},
  close: async () => {}
});

/**
 * Resume Parsing Queue
 * Processes uploaded resumes with NLP
 */
const resumeQueue = queuesEnabled ? new Queue('resume-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: true, // Remove successful jobs
    removeOnFail: false, // Keep failed jobs for debugging
  },
}) : createDisabledQueue('resume-processing');

/**
 * Interview Processing Queue
 * Handles AI-powered interview analysis
 */
const interviewQueue = queuesEnabled ? new Queue('interview-analysis', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1500,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
}) : createDisabledQueue('interview-analysis');

/**
 * Recommendation Engine Queue
 * Matches job postings with candidates
 */
const recommendationQueue = queuesEnabled ? new Queue('job-recommendations', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
}) : createDisabledQueue('job-recommendations');

/**
 * Email Queue
 * Handles notification emails (optional)
 */
const emailQueue = queuesEnabled ? new Queue('email-notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5, // Email is important, retry more times
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
}) : createDisabledQueue('email-notifications');

/**
 * Add job to resume processing queue
 * @param {string} resumeId - Resume document ID
 * @param {object} data - Resume data and metadata
 * @returns {Promise<Job>}
 */
async function addResumeJob(resumeId, data) {
  if (!queuesEnabled) {
    console.warn('⚠️  Resume queue skipped (REDIS_ENABLED=false)');
    return { id: `disabled-resume-${Date.now()}` };
  }
  try {
    const job = await resumeQueue.add(
      `parse-resume-${resumeId}`,
      { resumeId, ...data },
      { jobId: `resume-${resumeId}-${Date.now()}` }
    );
    console.log(`📋 Resume job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Error adding resume job:', error.message);
    throw error;
  }
}

/**
 * Add job to interview processing queue
 * @param {string} interviewId - Interview document ID
 * @param {object} data - Interview data and metadata
 * @returns {Promise<Job>}
 */
async function addInterviewJob(interviewId, data) {
  if (!queuesEnabled) {
    console.warn('⚠️  Interview queue skipped (REDIS_ENABLED=false)');
    return { id: `disabled-interview-${Date.now()}` };
  }
  try {
    const job = await interviewQueue.add(
      `analyze-interview-${interviewId}`,
      { interviewId, ...data },
      { jobId: `interview-${interviewId}-${Date.now()}` }
    );
    console.log(`🎤 Interview job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Error adding interview job:', error.message);
    throw error;
  }
}

/**
 * Add job to recommendation queue
 * @param {string} userId - Candidate user ID
 * @param {object} data - Filter and preference data
 * @returns {Promise<Job>}
 */
async function addRecommendationJob(userId, data) {
  if (!queuesEnabled) {
    console.warn('⚠️  Recommendation queue skipped (REDIS_ENABLED=false)');
    return { id: `disabled-recommendation-${Date.now()}` };
  }
  try {
    const job = await recommendationQueue.add(
      `recommend-jobs-${userId}`,
      { userId, ...data },
      { jobId: `recommendation-${userId}-${Date.now()}` }
    );
    console.log(`🎯 Recommendation job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Error adding recommendation job:', error.message);
    throw error;
  }
}

/**
 * Add job to email queue
 * @param {string} email - Recipient email
 * @param {string} template - Email template name
 * @param {object} data - Template data
 * @returns {Promise<Job>}
 */
async function addEmailJob(email, template, data) {
  if (!queuesEnabled) {
    console.warn('⚠️  Email queue skipped (REDIS_ENABLED=false)');
    return { id: `disabled-email-${Date.now()}` };
  }
  try {
    const job = await emailQueue.add(
      `send-${template}`,
      { email, template, ...data },
      { jobId: `email-${email}-${Date.now()}` }
    );
    console.log(`📧 Email job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Error adding email job:', error.message);
    throw error;
  }
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @param {string} queueName - Queue name
 * @returns {Promise<object|null>}
 */
async function getJobStatus(jobId, queueName = 'resume-processing') {
  try {
    let queue;
    switch (queueName) {
      case 'interview-analysis':
        queue = interviewQueue;
        break;
      case 'job-recommendations':
        queue = recommendationQueue;
        break;
      case 'email-notifications':
        queue = emailQueue;
        break;
      default:
        queue = resumeQueue;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();
    const attempts = job.attemptsMade;

    return {
      id: job.id,
      state,
      progress,
      attempts,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    };
  } catch (error) {
    console.error('❌ Error getting job status:', error.message);
    return null;
  }
}

/**
 * Get queue statistics
 * @param {string} queueName - Queue name
 * @returns {Promise<object>}
 */
async function getQueueStats(queueName = 'resume-processing') {
  try {
    let queue;
    switch (queueName) {
      case 'interview-analysis':
        queue = interviewQueue;
        break;
      case 'job-recommendations':
        queue = recommendationQueue;
        break;
      case 'email-notifications':
        queue = emailQueue;
        break;
      default:
        queue = resumeQueue;
    }

    const counts = await queue.getCountsBy('state');
    return {
      queue: queueName,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      waiting: counts.waiting || 0,
      paused: counts.paused || 0,
    };
  } catch (error) {
    console.error('❌ Error getting queue stats:', error.message);
    return {};
  }
}

/**
 * Clear all queues (use with caution!)
 * @returns {Promise<void>}
 */
async function clearAllQueues() {
  try {
    await Promise.all([
      resumeQueue.clean(0, 0),
      interviewQueue.clean(0, 0),
      recommendationQueue.clean(0, 0),
      emailQueue.clean(0, 0),
    ]);
    console.log('⚠️  All queues cleared');
  } catch (error) {
    console.error('❌ Error clearing queues:', error.message);
  }
}

/**
 * Close all queue connections
 * Call this on application shutdown
 * @returns {Promise<void>}
 */
async function closeQueues() {
  try {
    await Promise.all([
      resumeQueue.close(),
      interviewQueue.close(),
      recommendationQueue.close(),
      emailQueue.close(),
    ]);
    console.log('✅ All queues closed');
  } catch (error) {
    console.error('❌ Error closing queues:', error.message);
  }
}

module.exports = {
  queuesEnabled,
  resumeQueue,
  interviewQueue,
  recommendationQueue,
  emailQueue,
  addResumeJob,
  addInterviewJob,
  addRecommendationJob,
  addEmailJob,
  getJobStatus,
  getQueueStats,
  clearAllQueues,
  closeQueues,
};
