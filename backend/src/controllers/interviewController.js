const Interview = require('../models/Interview');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const interviewService = require('../services/interviewService');
const aiInterviewService = require('../services/aiInterviewService');
const speechToTextService = require('../services/speechToTextService');
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
        timestamp: new Date(),
        questionId: q.id // Store the unique question ID for reliable lookup
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

    // Find the corresponding question using reliable questionId lookup
    const questionMessage = interview.conversation.find(
      msg => msg.type === 'question' && msg.questionId === questionId
    );
    const question = questionMessage ? questionMessage.content : '';

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

// Generate AI questions based on job description
const generateAIQuestions = asyncHandler(async (req, res) => {
  const { jobDescription, customQuestionsCount = 0 } = req.body;

  if (!jobDescription) {
    return errorResponse(res, 'Job description is required', 400);
  }

  try {
    // Generate dynamic AI questions using Gemini
    const aiQuestions = await aiInterviewService.generateInterviewQuestions(
      jobDescription,
      customQuestionsCount
    );

    return successResponse(res, {
      questions: aiQuestions,
      totalQuestions: customQuestionsCount + aiQuestions.length
    }, 'AI questions generated successfully');

  } catch (error) {
    console.error('AI question generation error:', error);
    return errorResponse(res, 'Failed to generate AI questions: ' + error.message, 500);
  }
});

// Submit screening interview responses
const submitScreeningInterview = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { jobId, responses, totalQuestions } = req.body;
  const studentId = req.user.id;

  try {
    const Application = require('../models/Application');

    // Verify application exists and belongs to the student
    const application = await Application.findOne({
      _id: applicationId,
      candidateId: studentId
    }).populate('jobId');

    if (!application) {
      return errorResponse(res, 'Application not found', 404);
    }

    const job = application.jobId;

    console.log('🎤 Starting transcription for interview responses...');
    const startTranscription = Date.now();

    // PHASE 1: Transcribe all video responses (30-60 seconds)
    const transcribedResponses = [];
    
    for (const response of responses) {
      if (response.videoUrl) {
        try {
          console.log(`Transcribing response ${response.questionId}...`);
          
          // Transcribe video to text
          const transcription = await speechToTextService.transcribeVideo(
            response.videoUrl
          );
          
          transcribedResponses.push({
            questionId: response.questionId,
            question: response.question,
            answerTranscript: transcription.text, // ✅ Real answer text
            transcriptionConfidence: transcription.confidence,
            transcriptionLanguage: transcription.language || 'en-US',
            transcriptionDuration: transcription.duration,
            transcriptionError: transcription.error || null,
            videoUrl: response.videoUrl, // Temporary (will be deleted)
            videoKey: response.videoKey,
            timestamp: response.timestamp || new Date()
          });
          
          console.log(`✅ Transcribed (${transcription.text.length} chars, confidence: ${transcription.confidence})`);
          
        } catch (transcriptionError) {
          console.error(`❌ Transcription failed for question ${response.questionId}:`, transcriptionError);
          
          // Continue with error transcript instead of failing completely
          transcribedResponses.push({
            questionId: response.questionId,
            question: response.question,
            answerTranscript: '[Transcription failed]',
            transcriptionConfidence: 0,
            transcriptionError: transcriptionError.message,
            videoUrl: response.videoUrl,
            videoKey: response.videoKey,
            timestamp: response.timestamp || new Date()
          });
        }
      } else {
        // No video (shouldn't happen, but handle gracefully)
        transcribedResponses.push({
          questionId: response.questionId,
          question: response.question,
          answerTranscript: '[No video response]',
          transcriptionConfidence: 0,
          videoUrl: null,
          videoKey: null,
          timestamp: response.timestamp || new Date()
        });
      }
    }

    const transcriptionTime = ((Date.now() - startTranscription) / 1000).toFixed(2);
    console.log(`✅ Transcription complete in ${transcriptionTime}s`);

    console.log('🤖 Starting AI evaluation with transcripts...');
    const startEvaluation = Date.now();

    // PHASE 2: Evaluate using REAL transcripts (10-20 seconds)
    const evaluation = await aiInterviewService.evaluateCompleteInterview(
      transcribedResponses, // Now has actual transcripts!
      job.description
    );

    // Generate personalized feedback
    const feedback = await aiInterviewService.generateInterviewFeedback(
      evaluation,
      job.description
    );

    const evaluationTime = ((Date.now() - startEvaluation) / 1000).toFixed(2);
    console.log(`✅ AI evaluation complete in ${evaluationTime}s`);

    // Create interview record with transcripts
    const interview = new Interview({
      studentId,
      jobId,
      applicationId,
      type: 'screening',
      status: 'completed',
      startTime: new Date(Date.now() - (totalQuestions * 2 * 60 * 1000)), // Estimate start time
      endTime: new Date(),
      
      // Preliminary score (based on transcript evaluation)
      preliminaryScore: evaluation.overallScore,
      score: evaluation.overallScore, // Will be updated with final score later
      
      conversation: transcribedResponses.map(response => ({
        type: 'qa',
        question: response.question,
        questionId: response.questionId,
        
        // Transcript data
        answerTranscript: response.answerTranscript,
        transcriptionConfidence: response.transcriptionConfidence,
        transcriptionLanguage: response.transcriptionLanguage,
        transcriptionDuration: response.transcriptionDuration,
        transcriptionError: response.transcriptionError,
        
        // Video data (temporary)
        videoUrl: response.videoUrl,
        videoKey: response.videoKey,
        
        timestamp: response.timestamp,
        
        // Analysis status
        analysisStatus: {
          transcribed: true,
          videoAnalyzed: false,
          audioAnalyzed: false,
          videoDeleted: false
        }
      })),
      
      evaluation: {
        technicalScore: evaluation.categoryScores.technicalAccuracy,
        communicationScore: evaluation.categoryScores.communication,
        problemSolvingScore: evaluation.categoryScores.relevance,
        overallScore: evaluation.overallScore,
        feedback: feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        recommendation: evaluation.recommendation
      },
      
      analysisComplete: false // Video/audio analysis pending
    });

    await interview.save();

    // Update application with interview details
    application.interviewCompleted = true;
    application.interviewScore = evaluation.overallScore;
    application.status = evaluation.recommendation === 'hire' ? 'reviewing' : 'pending';
    await application.save();

    console.log(`✅ Interview saved with preliminary score: ${evaluation.overallScore}`);

    // PHASE 3: Schedule async video/audio analysis (5-10 minutes)
    // This runs in the background and updates the interview when complete
    scheduleAsyncAnalysis(interview._id);

    const totalTime = ((Date.now() - startTranscription) / 1000).toFixed(2);
    console.log(`✅ Interview submission complete in ${totalTime}s (analysis scheduled)`);

    return successResponse(res, {
      interviewId: interview._id,
      score: evaluation.overallScore,
      applicationId: application._id,
      status: application.status,
      evaluation: {
        overallScore: evaluation.overallScore,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        feedback: feedback
      },
      analysisStatus: {
        transcriptionComplete: true,
        aiEvaluationComplete: true,
        videoAnalysisPending: true,
        audioAnalysisPending: true,
        estimatedCompletionTime: '5-10 minutes'
      }
    }, 'Screening interview submitted successfully. Final analysis in progress.', 201);

  } catch (error) {
    console.error('Screening interview submission error:', error);
    return errorResponse(res, 'Failed to submit screening interview: ' + error.message, 500);
  }
});

/**
 * Schedule async video/audio analysis
 * This runs in background after interview submission
 */
const scheduleAsyncAnalysis = (interviewId) => {
  // Import the analysis service (we'll create this next)
  const interviewAnalysisService = require('../services/interviewAnalysisService');
  
  // Run analysis after 5 second delay (to ensure response sent to client)
  setTimeout(async () => {
    try {
      console.log(`🎬 Starting async analysis for interview ${interviewId}`);
      await interviewAnalysisService.analyzeCompletedInterview(interviewId);
      console.log(`✅ Async analysis complete for interview ${interviewId}`);
    } catch (error) {
      console.error(`❌ Async analysis failed for interview ${interviewId}:`, error);
      
      // Mark interview as having analysis error (don't fail completely)
      const Interview = require('../models/Interview');
      await Interview.findByIdAndUpdate(interviewId, {
        analysisComplete: true,
        'analysis.error': error.message
      });
    }
  }, 5000); // 5 second delay
};

// Get job-specific leaderboard
const getJobLeaderboard = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    // Get all completed screening interviews for this job
    const interviews = await Interview.find({
      jobId,
      type: 'screening',
      status: 'completed'
    })
    .populate('studentId', 'name email profile')
    .sort({ score: -1 }) // Sort by score descending
    .select('studentId score endTime');

    // Format leaderboard data
    const leaderboard = interviews.map((interview, index) => ({
      rank: index + 1,
      candidateId: interview.studentId._id,
      candidateName: interview.studentId.name,
      candidateEmail: interview.studentId.email,
      score: interview.score,
      interviewDate: interview.endTime,
      isTopPerformer: index < 3 // Top 3 are highlighted
    }));

    // Calculate statistics
    const scores = interviews.map(i => i.score);
    const stats = {
      totalCandidates: interviews.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      topScore: scores.length > 0 ? Math.max(...scores) : 0,
      medianScore: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0
    };

    return successResponse(res, {
      leaderboard,
      stats
    }, 'Job leaderboard retrieved successfully');

  } catch (error) {
    console.error('Leaderboard retrieval error:', error);
    return errorResponse(res, 'Failed to retrieve leaderboard: ' + error.message, 500);
  }
});

module.exports = {
  startInterview,
  getInterview,
  submitAnswer,
  analyzeVideo,
  analyzeAudio,
  finishInterview,
  getInterviewHistory,
  cancelInterview,
  generateAIQuestions,
  submitScreeningInterview,
  getJobLeaderboard
};
