const Interview = require('../models/Interview');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const interviewService = require('../services/interviewService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Start a new interview session
const startInterview = asyncHandler(async (req, res) => {
  const { jobId, type, duration } = req.body;
  const studentId = req.user.id;

  try {
    // Validate job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    // Get student's resume for context
    const resume = await Resume.findOne({ userId: studentId, isProcessed: true });
    if (!resume) {
      return errorResponse(res, 'Please upload and process your resume before starting interview', 400);
    }

    // Check if there's already an active interview
    const existingInterview = await Interview.findOne({
      studentId,
      jobId,
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (existingInterview) {
      return errorResponse(res, 'You already have an active interview for this job', 400);
    }

    // Generate interview questions
    const questions = await interviewService.generateInterviewQuestions(
      job,
      resume.parsedData,
      'medium'
    );

    // Create new interview
    const interview = new Interview({
      studentId,
      jobId,
      type: type || 'mock',
      duration: duration || 30,
      status: 'scheduled',
      startTime: new Date(),
      conversation: questions.map((q, index) => ({
        type: 'question',
        content: q.question,
        aiGenerated: true,
        timestamp: new Date()
      }))
    });

    await interview.save();
    await interview.populate(['studentId', 'jobId']);

    // Get socket.io instance to set up real-time communication
    const io = req.app.get('io');

    return successResponse(res, {
      interview: {
        id: interview._id,
        studentId: interview.studentId._id,
        job: {
          id: interview.jobId._id,
          title: interview.jobId.title
        },
        type: interview.type,
        status: interview.status,
        duration: interview.duration,
        startTime: interview.startTime,
        questions: questions,
        socketRoom: `interview_${interview._id}`
      }
    }, 'Interview session started successfully', 201);

  } catch (error) {
    console.error('Interview start error:', error);
    return errorResponse(res, 'Failed to start interview: ' + error.message, 500);
  }
});

// Get interview by ID
const getInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  const interview = await Interview.findById(interviewId)
    .populate('studentId', 'name email profile')
    .populate('jobId', 'title description companyId');

  if (!interview) {
    return errorResponse(res, 'Interview not found', 404);
  }

  // Check access permissions
  const canAccess = 
    req.user.id === interview.studentId._id.toString() ||
    (req.user.role === 'company' && req.user.id === interview.jobId.companyId.toString());

  if (!canAccess) {
    return errorResponse(res, 'Access denied', 403);
  }

  return successResponse(res, {
    interview: {
      id: interview._id,
      student: interview.studentId,
      job: interview.jobId,
      type: interview.type,
      status: interview.status,
      duration: interview.duration,
      startTime: interview.startTime,
      endTime: interview.endTime,
      conversation: interview.conversation,
      analysis: interview.analysis,
      recordingUrl: interview.recordingUrl,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt
    }
  }, 'Interview retrieved successfully');
});

// Submit answer to interview question
const submitAnswer = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { questionId, answer } = req.body;
  const studentId = req.user.id;

  try {
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: { $in: ['scheduled', 'in-progress'] }
    });

    if (!interview) {
      return errorResponse(res, 'Interview not found or not accessible', 404);
    }

    // Update interview status to in-progress if it was scheduled
    if (interview.status === 'scheduled') {
      interview.status = 'in-progress';
    }

    // Add answer to conversation
    interview.conversation.push({
      type: 'answer',
      content: answer,
      timestamp: new Date()
    });

    // Find the corresponding question
    const questionIndex = interview.conversation.findIndex(
      msg => msg.type === 'question' && msg.content.includes(questionId)
    );

    const question = questionIndex >= 0 ? interview.conversation[questionIndex].content : '';

    // Analyze the answer using AI
    let answerAnalysis = null;
    try {
      answerAnalysis = await interviewService.analyzeAnswer(
        question,
        answer,
        'Expected answer guidelines' // This could be enhanced with actual expected answers
      );
    } catch (error) {
      console.error('Answer analysis error:', error);
      // Continue without analysis if AI service fails
    }

    // Initialize analysis structure if it doesn't exist
    if (!interview.analysis) {
      interview.analysis = {
        qaAnalysis: {
          responses: [],
          overallQAScore: 0
        }
      };
    }

    if (!interview.analysis.qaAnalysis) {
      interview.analysis.qaAnalysis = {
        responses: [],
        overallQAScore: 0
      };
    }

    // Add response analysis
    if (answerAnalysis) {
      interview.analysis.qaAnalysis.responses.push({
        questionId: questionId,
        question: question,
        answer: answer,
        relevanceScore: answerAnalysis.relevanceScore,
        completenessScore: answerAnalysis.completenessScore,
        technicalAccuracy: answerAnalysis.technicalAccuracy,
        communicationScore: answerAnalysis.communicationScore
      });

      // Update overall Q&A score
      const responses = interview.analysis.qaAnalysis.responses;
      const totalScore = responses.reduce((sum, r) => {
        return sum + (r.relevanceScore + r.completenessScore + r.technicalAccuracy + r.communicationScore) / 4;
      }, 0);
      interview.analysis.qaAnalysis.overallQAScore = Math.round(totalScore / responses.length);
    }

    await interview.save();

    // Generate follow-up question if needed
    let followUpQuestion = null;
    try {
      if (interview.conversation.filter(msg => msg.type === 'question').length < 8) {
        followUpQuestion = await interviewService.generateFollowUpQuestion(
          interview.conversation,
          question,
          answer
        );
      }
    } catch (error) {
      console.error('Follow-up question generation error:', error);
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`interview_${interviewId}`).emit('answerSubmitted', {
      interviewId,
      answer,
      analysis: answerAnalysis,
      followUpQuestion
    });

    return successResponse(res, {
      interviewId,
      answerAnalysis,
      followUpQuestion,
      conversationLength: interview.conversation.length,
      overallQAScore: interview.analysis.qaAnalysis.overallQAScore
    }, 'Answer submitted and analyzed successfully');

  } catch (error) {
    console.error('Answer submission error:', error);
    return errorResponse(res, 'Failed to submit answer: ' + error.message, 500);
  }
});

// Process video analysis data
const analyzeVideo = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { videoData } = req.body;
  const studentId = req.user.id;

  try {
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: 'in-progress'
    });

    if (!interview) {
      return errorResponse(res, 'Interview not found or not in progress', 404);
    }

    // Process video analysis through Python microservice
    const videoAnalysis = await interviewService.processVideoAnalysis(videoData, interviewId);

    // Initialize analysis structure if needed
    if (!interview.analysis) {
      interview.analysis = {};
    }

    interview.analysis.videoAnalysis = videoAnalysis;
    await interview.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`interview_${interviewId}`).emit('videoAnalysisUpdate', {
      interviewId,
      videoAnalysis
    });

    return successResponse(res, {
      interviewId,
      videoAnalysis
    }, 'Video analysis completed');

  } catch (error) {
    console.error('Video analysis error:', error);
    return errorResponse(res, 'Failed to analyze video: ' + error.message, 500);
  }
});

// Process audio analysis data
const analyzeAudio = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { audioData } = req.body;
  const studentId = req.user.id;

  try {
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: 'in-progress'
    });

    if (!interview) {
      return errorResponse(res, 'Interview not found or not in progress', 404);
    }

    // Process audio analysis through Python microservice
    const audioAnalysis = await interviewService.processAudioAnalysis(audioData, interviewId);

    // Initialize analysis structure if needed
    if (!interview.analysis) {
      interview.analysis = {};
    }

    interview.analysis.audioAnalysis = audioAnalysis;
    await interview.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`interview_${interviewId}`).emit('audioAnalysisUpdate', {
      interviewId,
      audioAnalysis
    });

    return successResponse(res, {
      interviewId,
      audioAnalysis
    }, 'Audio analysis completed');

  } catch (error) {
    console.error('Audio analysis error:', error);
    return errorResponse(res, 'Failed to analyze audio: ' + error.message, 500);
  }
});

// Finish interview and generate final report
const finishInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const studentId = req.user.id;

  try {
    const interview = await Interview.findOne({
      _id: interviewId,
      studentId,
      status: 'in-progress'
    }).populate('jobId');

    if (!interview) {
      return errorResponse(res, 'Interview not found or not in progress', 404);
    }

    // Update interview status and end time
    interview.status = 'completed';
    interview.endTime = new Date();

    // Calculate overall analysis
    const overallAnalysis = interviewService.calculateOverallAnalysis(
      interview.analysis?.videoAnalysis,
      interview.analysis?.audioAnalysis,
      interview.analysis?.qaAnalysis
    );

    // Update overall analysis
    if (!interview.analysis) {
      interview.analysis = {};
    }

    interview.analysis.overallScore = overallAnalysis.overallScore;
    interview.analysis.strengths = overallAnalysis.strengths;
    interview.analysis.weaknesses = overallAnalysis.weaknesses;
    interview.analysis.recommendations = overallAnalysis.recommendations;

    await interview.save();

    // Generate detailed summary report
    let summaryReport = null;
    try {
      summaryReport = await interviewService.generateInterviewSummary(interview);
    } catch (error) {
      console.error('Summary generation error:', error);
    }

    // Update leaderboard
    try {
      const leaderboardService = require('../services/leaderboard');
      await leaderboardService.generateLeaderboard(interview.jobId._id);
    } catch (error) {
      console.error('Leaderboard update error:', error);
    }

    return successResponse(res, {
      interview: {
        id: interview._id,
        status: interview.status,
        duration: Math.round((interview.endTime - interview.startTime) / (1000 * 60)),
        analysis: interview.analysis,
        summaryReport
      }
    }, 'Interview completed successfully');

  } catch (error) {
    console.error('Interview completion error:', error);
    return errorResponse(res, 'Failed to complete interview: ' + error.message, 500);
  }
});

// Get user's interview history
const getInterviewHistory = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const total = await Interview.countDocuments({ studentId });

    const interviews = await Interview.find({ studentId })
      .populate('jobId', 'title description companyId')
      .populate('jobId.companyId', 'name profile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const interviewsData = interviews.map(interview => ({
      id: interview._id,
      job: interview.jobId,
      type: interview.type,
      status: interview.status,
      duration: interview.duration,
      startTime: interview.startTime,
      endTime: interview.endTime,
      overallScore: interview.analysis?.overallScore || 0,
      createdAt: interview.createdAt
    }));

    const response = {
      data: interviewsData,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
        total: parseInt(total),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    return successResponse(res, response, 'Interview history retrieved successfully');

  } catch (error) {
    console.error('Interview history error:', error);
    return errorResponse(res, 'Failed to retrieve interview history', 500);
  }
});

// Cancel/abort interview
const cancelInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const studentId = req.user.id;

  const interview = await Interview.findOne({
    _id: interviewId,
    studentId,
    status: { $in: ['scheduled', 'in-progress'] }
  });

  if (!interview) {
    return errorResponse(res, 'Interview not found or cannot be cancelled', 404);
  }

  interview.status = 'cancelled';
  interview.endTime = new Date();
  await interview.save();

  return successResponse(res, {
    interviewId,
    status: 'cancelled'
  }, 'Interview cancelled successfully');
});

module.exports = {
  startInterview,
  getInterview,
  submitAnswer,
  analyzeVideo,
  analyzeAudio,
  finishInterview,
  getInterviewHistory,
  cancelInterview
};
