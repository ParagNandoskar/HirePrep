const Interview = require('../models/Interview');
const Application = require('../models/Application');
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

    // Generate dynamic interview questions using new AI service
    const jobDescription = `
      Position: ${job.title}
      Description: ${job.description}
      Required Skills: ${job.requirements?.skills?.map(s => s.name).join(', ') || 'Not specified'}
      Experience Level: ${job.experienceLevel || 'Not specified'}
    `;

    // Determine candidate level from resume
    const candidateLevel = resume.parsedData?.experience?.length > 5 ? 'senior' :
                          resume.parsedData?.experience?.length > 2 ? 'mid-level' : 'junior';

    const questions = await aiInterviewService.generateInterviewQuestions(
      jobDescription,
      candidateLevel
    );

    // Create new interview with interactive conversation tracking
    const interview = new Interview({
      studentId,
      jobId,
      type: type || 'mock',
      duration: duration || 30,
      status: 'scheduled',
      startTime: new Date(),
      questionsPool: questions.map(q => ({
        id: q.id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        type: 'main',
        answered: false,
        evaluation: null,
        followUpAsked: false
      })),
      conversation: [],
      currentQuestionIndex: 0,
      analysisMetadata: {
        totalQuestionsGenerated: questions.length,
        questionsAsked: 0,
        followUpsAsked: 0,
        averageScore: 0,
        topicsCovered: []
      }
    });

    await interview.save();
    await interview.populate(['studentId', 'jobId']);

    // Get first question
    const firstQuestion = interview.questionsPool[0];

    // Add first question to conversation
    interview.conversation.push({
      type: 'question',
      content: firstQuestion.question,
      questionId: firstQuestion.id,
      aiGenerated: true,
      timestamp: new Date()
    });

    interview.analysisMetadata.questionsAsked = 1;
    await interview.save();

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
        socketRoom: `interview_${interview._id}`,
        currentQuestion: {
          id: firstQuestion.id,
          question: firstQuestion.question,
          category: firstQuestion.category,
          difficulty: firstQuestion.difficulty,
          sequenceNumber: 1,
          totalQuestions: questions.length
        },
        totalQuestionsToAsk: questions.length,
        message: 'Interview started! Answer the first question.'
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
    }).populate('jobId');

    if (!interview) {
      return errorResponse(res, 'Interview not found or not accessible', 404);
    }

    // Update interview status to in-progress if it was scheduled
    if (interview.status === 'scheduled') {
      interview.status = 'in-progress';
    }

    // Find the question from pool
    const questionObj = interview.questionsPool.find(q => q.id === questionId);
    if (!questionObj) {
      return errorResponse(res, 'Question not found in interview', 404);
    }

    const question = questionObj.question;

    // Add answer to conversation
    interview.conversation.push({
      type: 'answer',
      content: answer,
      questionId: questionId,
      timestamp: new Date()
    });

    // Evaluate the answer using new AI service
    let evaluation = null;
    try {
      const jobDescription = interview.jobId.description || 'Job position';

      // Get conversation history for context
      const conversationHistory = interview.conversation.slice(-6).map(msg => ({
        type: msg.type === 'question' ? 'interviewer' : 'candidate',
        content: msg.content
      }));

      evaluation = await aiInterviewService.evaluateInterviewResponse(
        question,
        answer,
        jobDescription,
        { previousAnswersSummary: null }
      );

      // Store evaluation in question object
      questionObj.evaluation = evaluation;
      questionObj.answered = true;

      // Update metadata
      if (!interview.analysisMetadata.topicsCovered.includes(questionObj.category)) {
        interview.analysisMetadata.topicsCovered.push(questionObj.category);
      }

      // Calculate running average score
      const allEvaluations = interview.questionsPool
        .filter(q => q.evaluation)
        .map(q => q.evaluation.overallScore || 0);
      if (allEvaluations.length > 0) {
        interview.analysisMetadata.averageScore =
          Math.round(allEvaluations.reduce((a, b) => a + b, 0) / allEvaluations.length);
      }

    } catch (evalError) {
      console.error('Answer evaluation error:', evalError);
      evaluation = {
        overallScore: 50,
        fitAssessment: 'acceptable',
        strengths: ['Response recorded'],
        comment: 'Evaluation pending'
      };
    }

    // Decide: Follow-up or Next Question?
    let nextAction = {
      type: 'next-question', // 'follow-up' | 'next-question' | 'complete'
      content: null
    };

    let followUpGenerated = false;

    // Check if follow-up is needed
    try {
      const conversationHistory = interview.conversation.slice(-6).map(msg => ({
        type: msg.type === 'question' ? 'interviewer' : 'candidate',
        content: msg.content
      }));

      const followUpResponse = await aiInterviewService.generateAdaptiveFollowUp(
        interview.jobId.description || 'Job position',
        question,
        answer,
        conversationHistory
      );

      if (followUpResponse.shouldFollowUp && followUpResponse.followUpQuestion) {
        // Add follow-up question to conversation
        interview.conversation.push({
          type: 'question',
          content: followUpResponse.followUpQuestion,
          questionId: `${questionId}_followup`,
          isFollowUp: true,
          aiGenerated: true,
          timestamp: new Date()
        });

        interview.analysisMetadata.followUpsAsked += 1;
        followUpGenerated = true;

        nextAction = {
          type: 'follow-up',
          content: followUpResponse.followUpQuestion,
          reasoning: followUpResponse.reasoning,
          followUpStrategy: followUpResponse.followUpStrategy
        };
      } else {
        // No follow-up needed, determine next question
        const nextQuestionIndex = interview.questionsPool.findIndex(
          q => !q.answered && q.id !== questionId
        );

        if (nextQuestionIndex !== -1) {
          const nextQuestion = interview.questionsPool[nextQuestionIndex];

          // Check if interview should be completed
          const shouldComplete = await aiInterviewService.shouldCompleteInterview(
            interview.analysisMetadata.questionsAsked,
            interview.analysisMetadata.averageScore,
            interview.analysisMetadata.topicsCovered.length,
            interview.conversation
          );

          if (shouldComplete.shouldComplete) {
            nextAction = {
              type: 'complete',
              reasoning: shouldComplete.reasoning,
              assessment: shouldComplete.assessment
            };
          } else {
            // Move to next question
            interview.analysisMetadata.questionsAsked += 1;

            interview.conversation.push({
              type: 'question',
              content: nextQuestion.question,
              questionId: nextQuestion.id,
              aiGenerated: true,
              timestamp: new Date()
            });

            nextAction = {
              type: 'next-question',
              content: nextQuestion.question,
              questionId: nextQuestion.id,
              sequenceNumber: interview.analysisMetadata.questionsAsked,
              totalQuestions: interview.questionsPool.length,
              category: nextQuestion.category,
              difficulty: nextQuestion.difficulty
            };
          }
        } else {
          // No more questions, complete interview
          nextAction = {
            type: 'complete',
            reasoning: 'All questions completed'
          };
        }
      }
    } catch (followUpError) {
      console.error('Follow-up generation error:', followUpError);
      // Fallback: try to get next question
      const nextQuestionIndex = interview.questionsPool.findIndex(
        q => !q.answered && q.id !== questionId
      );

      if (nextQuestionIndex !== -1) {
        const nextQuestion = interview.questionsPool[nextQuestionIndex];
        interview.analysisMetadata.questionsAsked += 1;

        interview.conversation.push({
          type: 'question',
          content: nextQuestion.question,
          questionId: nextQuestion.id,
          aiGenerated: true,
          timestamp: new Date()
        });

        nextAction = {
          type: 'next-question',
          content: nextQuestion.question,
          questionId: nextQuestion.id,
          sequenceNumber: interview.analysisMetadata.questionsAsked,
          totalQuestions: interview.questionsPool.length,
          category: nextQuestion.category,
          difficulty: nextQuestion.difficulty
        };
      } else {
        nextAction = {
          type: 'complete',
          reasoning: 'Interview completed'
        };
      }
    }

    // If interview is complete, generate feedback
    let comprehensiveFeedback = null;
    if (nextAction.type === 'complete') {
      interview.status = 'completed';
      interview.endTime = new Date();

      try {
        comprehensiveFeedback = await aiInterviewService.generateComprehensiveFeedback(
          {
            questionsAsked: interview.analysisMetadata.questionsAsked,
            averageScore: interview.analysisMetadata.averageScore,
            topicsCovered: interview.analysisMetadata.topicsCovered,
            overallFitAssessment:
              interview.analysisMetadata.averageScore >= 75 ? 'strong' :
              interview.analysisMetadata.averageScore >= 60 ? 'good' : 'concerning'
          },
          interview.jobId.description || 'Job position'
        );

        interview.analysis = {
          comprehensiveFeedback,
          qaAnalysis: {
            responses: interview.questionsPool.map(q => ({
              questionId: q.id,
              question: q.question,
              category: q.category,
              difficulty: q.difficulty,
              evaluation: q.evaluation,
              answered: q.answered
            })),
            overallQAScore: interview.analysisMetadata.averageScore,
            topicsCovered: interview.analysisMetadata.topicsCovered
          }
        };
      } catch (feedbackError) {
        console.error('Feedback generation error:', feedbackError);
      }
    }

    await interview.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`interview_${interviewId}`).emit('answerProcessed', {
      interviewId,
      answer,
      evaluation,
      nextAction,
      conversationLength: interview.conversation.length,
      averageScore: interview.analysisMetadata.averageScore
    });

    return successResponse(res, {
      interviewId,
      evaluation,
      nextAction,
      comprehensiveFeedback: nextAction.type === 'complete' ? comprehensiveFeedback : null,
      conversationLength: interview.conversation.length,
      averageScore: interview.analysisMetadata.averageScore,
      questionsAsked: interview.analysisMetadata.questionsAsked,
      totalQuestionsGenerated: interview.analysisMetadata.totalQuestionsGenerated
    }, 'Answer submitted and processed successfully');

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
  const candidateId = req.user.id;
  const { page = 1, limit = 50, status } = req.query;

  try {
    // Query applications with completed interviews
    const query = {
      candidateId: candidateId,
      $or: [
        { status: 'interviewed' },
        { interviewCompleted: true }
      ]
    };

    // If status filter is provided
    if (status === 'completed') {
      query.screeningScore = { $exists: true, $ne: null };
    }

    const total = await Application.countDocuments(query);

    const applications = await Application.find(query)
      .populate('jobId')
      .populate({
        path: 'jobId',
        populate: { path: 'companyId' }
      })
      .sort({ interviewCompletedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Map applications to interview history format
    const interviewsData = applications.map(app => {
      const overallScore = app.screeningScore || 0;
      const aiAnalysis = app.aiAnalysis || {};
      const scores = aiAnalysis.scores || {};
      
      return {
        _id: app._id,
        type: 'Screening', // All are screening interviews for now
        role: app.jobId?.title || 'Unknown Position',
        company: app.jobId?.companyId?.name || 'Unknown Company',
        difficulty: 'Medium', // Default
        date: app.interviewCompletedAt || app.createdAt,
        createdAt: app.createdAt,
        duration: '25-30 min', // Typical screening interview duration
        totalDuration: 1500, // 25 minutes in seconds
        completedQuestions: app.questionsAnswered || 5,
        totalQuestions: 5,
        finalScore: overallScore,
        overallScore: overallScore,
        scores: {
          confidence: scores.behavioral || scores.video || 0,
          communication: scores.communication || 0,
          technical: scores.technical || 0,
          problemSolving: scores.problemSolving || 0
        },
        breakdown: {
          contentScore: scores.content || 0,
          behavioralScore: scores.behavioral || 0,
          videoScore: scores.video || 0,
          audioScore: scores.audio || 0
        },
        status: 'completed',
        feedback: {
          strengths: aiAnalysis.strengths || [],
          improvements: aiAnalysis.improvements || []
        },
        hasTranscript: app.interviewTranscript && app.interviewTranscript.length > 0
      };
    });

    const response = {
      success: true,
      data: {
        interviews: interviewsData,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
          total: parseInt(total),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    };

    return res.status(200).json(response);

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
    application.screeningScore = evaluation.overallScore; // Also update screeningScore
    application.status = evaluation.recommendation === 'hire' ? 'reviewing' : 'pending';
    await application.save();

    console.log(`✅ Interview saved with preliminary score: ${evaluation.overallScore}`);

    // PHASE 3: Schedule async video/audio analysis (5-10 minutes)
    // This runs in the background and updates the interview when complete
    scheduleAsyncAnalysis(interview._id, application._id);

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
        estimatedCompletionTime: '2-5 minutes'
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
const scheduleAsyncAnalysis = (interviewId, applicationId) => {
  // Import the analysis service
  const interviewAnalysisService = require('../services/interviewAnalysisService');
  const analysisService = require('../services/analysisService');
  const Leaderboard = require('../models/Leaderboard');
  
  // Run analysis after 2 second delay (to ensure response sent to client)
  setTimeout(async () => {
    try {
      console.log(`🎬 Starting async analysis for interview ${interviewId}`);
      
      // Try new analysis service first (with Python services)
      let interview = await interviewAnalysisService.analyzeCompletedInterview(interviewId);
      
      // Update leaderboard after analysis completes
      if (interview.analysisComplete) {
        console.log(`🏆 Updating leaderboard with final scores...`);
        try {
          await analysisService.updateLeaderboard(interview);
          
          // Also update application screeningScore with final score
          const Application = require('../models/Application');
          await Application.findByIdAndUpdate(applicationId, {
            screeningScore: interview.finalScore || interview.score
          });
          
          console.log(`✅ Leaderboard updated successfully`);
        } catch (leaderboardError) {
          console.error(`⚠️ Leaderboard update failed (non-critical):`, leaderboardError.message);
        }
      }
      
      console.log(`✅ Async analysis complete for interview ${interviewId}`);
      console.log(`   Final Score: ${interview.finalScore || interview.score}/100`);
      
    } catch (error) {
      console.error(`❌ Async analysis failed for interview ${interviewId}:`, error);
      
      // Mark interview as having analysis complete with error (don't leave it pending forever)
      const Interview = require('../models/Interview');
      const interview = await Interview.findById(interviewId);
      if (interview && !interview.analysisComplete) {
        interview.analysisComplete = true;
        interview.finalScore = interview.preliminaryScore; // Use preliminary score if analysis fails
        interview.score = interview.preliminaryScore;
        if (!interview.analysis) interview.analysis = {};
        interview.analysis.error = error.message;
        await interview.save();
        console.log(`⚠️ Marked interview as complete with preliminary score due to analysis error`);
      }
    }
  }, 2000); // 2 second delay
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
      isTopPerformer: index < 10, // Top 10 are recommended to company
      isRecommendedToCompany: index < 10
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
