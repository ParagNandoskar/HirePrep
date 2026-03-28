const { Worker } = require('bullmq');
const mongoose = require('mongoose');

/**
 * Bull Queue Worker
 * Processes jobs from all queues
 * Run this in a separate process/server instance
 */

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
};

// Import your services/models here
// const nlpService = require('./nlp-service');
// const Resume = require('../models/Resume');
// const Interview = require('../models/Interview');

/**
 * Resume Processing Worker
 * Parses resumes using NLP
 */
const resumeWorker = new Worker(
  'resume-processing',
  async (job) => {
    console.log(`🔄 Processing resume job: ${job.id}`);

    try {
      const { resumeId, fileUrl, candidateId } = job.data;

      // Track progress
      await job.updateProgress(10);

      // Step 1: Download/fetch resume
      console.log(`📥 Fetching resume: ${resumeId}`);
      await job.updateProgress(30);

      // Step 2: Parse resume with NLP
      console.log(`🔍 Parsing resume with NLP`);
      // const parseResult = await nlpService.parseResume(fileUrl);
      await job.updateProgress(60);

      // Step 3: Store results in MongoDB
      console.log(`💾 Storing parsed data`);
      // await Resume.findByIdAndUpdate(resumeId, {
      //   parsed: true,
      //   extractedData: parseResult,
      //   updatedAt: new Date(),
      // });
      await job.updateProgress(90);

      // Step 4: Update candidate profile
      console.log(`👤 Updating candidate profile`);
      await job.updateProgress(100);

      return {
        success: true,
        resumeId,
        message: 'Resume parsed successfully',
      };
    } catch (error) {
      console.error(`❌ Resume job failed: ${error.message}`);
      throw error; // Trigger retry mechanism
    }
  },
  { connection: redisConnection, concurrency: 2 } // Process 2 resumes in parallel
);

/**
 * Interview Analysis Worker
 * Analyzes interview responses using AI
 */
const interviewWorker = new Worker(
  'interview-analysis',
  async (job) => {
    console.log(`🔄 Processing interview job: ${job.id}`);

    try {
      const { interviewId, responses, candidateId, jobId } = job.data;

      await job.updateProgress(10);

      // Step 1: Fetch interview data
      console.log(`📥 Fetching interview: ${interviewId}`);
      // const interview = await Interview.findById(interviewId);
      await job.updateProgress(25);

      // Step 2: Analyze responses with AI
      console.log(`🤖 Analyzing interview responses`);
      // const analysis = await aiService.analyzeInterview(responses, jobId);
      await job.updateProgress(60);

      // Step 3: Generate recommendations
      console.log(`💡 Generating recommendations`);
      // const recommendations = await generateRecommendations(analysis);
      await job.updateProgress(80);

      // Step 4: Store analysis results
      console.log(`💾 Storing analysis results`);
      // await Interview.findByIdAndUpdate(interviewId, {
      //   analyzed: true,
      //   analysis,
      //   recommendations,
      //   analysisCompletedAt: new Date(),
      // });
      await job.updateProgress(100);

      return {
        success: true,
        interviewId,
        message: 'Interview analyzed successfully',
      };
    } catch (error) {
      console.error(`❌ Interview job failed: ${error.message}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 3 }
);

/**
 * Job Recommendation Worker
 * Matches candidates with job postings
 */
const recommendationWorker = new Worker(
  'job-recommendations',
  async (job) => {
    console.log(`🔄 Processing recommendation job: ${job.id}`);

    try {
      const { userId, filters } = job.data;

      await job.updateProgress(20);

      // Step 1: Fetch candidate profile and skills
      console.log(`👤 Fetching candidate profile: ${userId}`);
      // const candidate = await Candidate.findById(userId);
      await job.updateProgress(40);

      // Step 2: Find matching jobs
      console.log(`🔍 Searching for matching jobs`);
      // const matchingJobs = await findMatchingJobs(candidate, filters);
      await job.updateProgress(70);

      // Step 3: Score and rank matches
      console.log(`⭐ Ranking matches`);
      // const rankedMatches = await rankMatches(matchingJobs, candidate);
      await job.updateProgress(90);

      // Step 4: Store recommendations
      console.log(`💾 Storing recommendations`);
      // await Candidate.findByIdAndUpdate(userId, {
      //   recommendations: rankedMatches,
      //   recommendationsUpdatedAt: new Date(),
      // });
      await job.updateProgress(100);

      return {
        success: true,
        userId,
        recommendationsCount: 0, // Replace with actual count
        message: 'Job recommendations generated successfully',
      };
    } catch (error) {
      console.error(`❌ Recommendation job failed: ${error.message}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 5 } // More lightweight, 5 concurrent
);

/**
 * Email Notification Worker
 * Sends notification emails
 */
const emailWorker = new Worker(
  'email-notifications',
  async (job) => {
    console.log(`🔄 Processing email job: ${job.id}`);

    try {
      const { email, template, ...templateData } = job.data;

      await job.updateProgress(25);

      // Step 1: Render email template
      console.log(`📝 Rendering email template: ${template}`);
      // const emailContent = await renderTemplate(template, templateData);
      await job.updateProgress(50);

      // Step 2: Send email
      console.log(`📧 Sending email to: ${email}`);
      // await emailService.send(email, emailContent.subject, emailContent.html);
      await job.updateProgress(100);

      return {
        success: true,
        email,
        template,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error(`❌ Email job failed: ${error.message}`);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 10 } // Can send many emails in parallel
);

/**
 * Event handlers for all workers
 */
const workers = [resumeWorker, interviewWorker, recommendationWorker, emailWorker];

workers.forEach((worker) => {
  worker.on('drained', () => {
    console.log(`✅ ${worker.name} queue drained - all jobs processed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ ${worker.name} - Job ${job.id} failed: ${err.message}`);
  });

  worker.on('completed', (job) => {
    console.log(`✅ ${worker.name} - Job ${job.id} completed`);
  });

  worker.on('progress', (job, progress) => {
    console.log(`📊 ${worker.name} - Job ${job.id} progress: ${progress}%`);
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('⏹️  SIGTERM received, shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️  SIGINT received, shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
});

console.log('🚀 Bull Queue Workers started');
console.log('  📋 Resume Processing Worker');
console.log('  🎤 Interview Analysis Worker');
console.log('  🎯 Job Recommendation Worker');
console.log('  📧 Email Notification Worker');

module.exports = {
  resumeWorker,
  interviewWorker,
  recommendationWorker,
  emailWorker,
};
