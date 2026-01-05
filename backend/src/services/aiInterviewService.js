const { getGeminiFlash } = require('../config/gemini');

/**
 * Generate dynamic interview questions based on job description
 * Creates contextual questions that feel like a real interview
 */
const generateInterviewQuestions = async (jobDescription, customQuestionsCount = 0) => {
  try {
    const model = getGeminiFlash();
    
    const prompt = `You are an expert HR interviewer conducting a screening interview. Based on this job description, generate 5 insightful interview questions that will help assess if a candidate is a good fit.

JOB DESCRIPTION:
${jobDescription}

REQUIREMENTS:
1. Generate 5 unique, open-ended questions
2. Questions should be conversational and natural
3. Mix of technical skills, experience, and behavioral questions
4. Each question should be relevant to the job requirements
5. Questions should encourage detailed responses
6. Make them feel like a real interview, not a quiz

Return the questions in this exact JSON format:
[
  {
    "id": "ai_1",
    "question": "Your question here",
    "category": "technical|behavioral|experience|skills|culture-fit",
    "followUpHints": "What aspects to listen for in the answer"
  }
]

Generate 5 questions now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Add timeLimit to each question
    return questions.map((q, index) => ({
      ...q,
      id: q.id || `ai_${index + 1}`,
      timeLimit: 2, // 2 minutes per question
      type: 'ai-generated'
    }));
    
  } catch (error) {
    console.error('Error generating AI questions:', error);
    throw error;
  }
};

/**
 * Generate a follow-up question based on previous answer
 * Creates dynamic, conversational flow
 */
const generateFollowUpQuestion = async (jobDescription, previousQuestion, candidateAnswer) => {
  try {
    const model = getGeminiFlash();
    
    const prompt = `You are conducting a job interview. Based on the candidate's previous answer, generate a natural follow-up question to dig deeper.

JOB CONTEXT:
${jobDescription}

PREVIOUS QUESTION:
${previousQuestion}

CANDIDATE'S ANSWER (transcript):
${candidateAnswer}

Generate ONE follow-up question that:
1. Builds on their answer naturally
2. Probes deeper into their experience/skills
3. Feels conversational, not scripted
4. Is relevant to the job requirements
5. Encourages them to provide concrete examples

Return in JSON format:
{
  "question": "Your follow-up question here",
  "reason": "Why this follow-up is relevant"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse follow-up question');
    }
    
    const followUp = JSON.parse(jsonMatch[0]);
    
    return {
      id: `followup_${Date.now()}`,
      question: followUp.question,
      type: 'ai-followup',
      timeLimit: 2,
      category: 'follow-up',
      context: followUp.reason
    };
    
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    return null; // Don't break the interview if follow-up fails
  }
};

/**
 * Evaluate interview responses using AI
 * Provides detailed scoring and feedback
 */
const evaluateInterviewResponse = async (question, answer, jobDescription) => {
  try {
    const model = getGeminiFlash();
    
    const prompt = `You are an expert HR evaluator. Analyze this interview response and provide a detailed evaluation.

JOB CONTEXT:
${jobDescription}

INTERVIEW QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

Evaluate the answer on these criteria:
1. Relevance (0-100): How well does it answer the question?
2. Clarity (0-100): Is the answer clear and well-structured?
3. Technical Accuracy (0-100): Does it demonstrate proper understanding?
4. Experience Level (0-100): Does it show appropriate experience?
5. Communication (0-100): Is it articulate and professional?

Return in JSON format:
{
  "scores": {
    "relevance": 85,
    "clarity": 90,
    "technicalAccuracy": 80,
    "experienceLevel": 85,
    "communication": 88
  },
  "overallScore": 86,
  "strengths": ["Clear communication", "Good examples"],
  "improvements": ["Could provide more technical details"],
  "feedback": "Brief constructive feedback"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse evaluation');
    }
    
    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('Error evaluating response:', error);
    // Return default scores if AI fails
    return {
      scores: {
        relevance: 75,
        clarity: 75,
        technicalAccuracy: 75,
        experienceLevel: 75,
        communication: 75
      },
      overallScore: 75,
      strengths: ['Response provided'],
      improvements: ['Could not be fully evaluated'],
      feedback: 'Evaluation pending'
    };
  }
};

/**
 * Transcribe video to text (placeholder - will need actual transcription service)
 * Options: AWS Transcribe, Google Speech-to-Text, AssemblyAI
 */
const transcribeVideo = async (videoUrl) => {
  try {
    // TODO: Integrate with actual transcription service
    // For now, return placeholder
    console.log('Video transcription needed for:', videoUrl);
    
    // In production, use:
    // - AWS Transcribe
    // - Google Speech-to-Text
    // - AssemblyAI
    // - Deepgram
    
    return {
      transcript: '[Transcription pending - integrate speech-to-text service]',
      confidence: 0,
      duration: 120
    };
    
  } catch (error) {
    console.error('Error transcribing video:', error);
    return {
      transcript: '[Transcription failed]',
      confidence: 0,
      duration: 0
    };
  }
};

/**
 * Evaluate entire interview and generate final score
 */
const evaluateCompleteInterview = async (responses, jobDescription) => {
  try {
    // Evaluate each response
    const evaluations = [];
    
    for (const response of responses) {
      // Use the actual transcript (answerTranscript) from speech-to-text
      const answerText = response.answerTranscript || 
                        response.transcript || 
                        '[No transcript available]';
      
      const evaluation = await evaluateInterviewResponse(
        response.question,
        answerText, // ✅ Now using real transcribed answer
        jobDescription
      );
      
      evaluations.push({
        questionId: response.questionId,
        question: response.question,
        answer: answerText,
        ...evaluation
      });
    }
    
    // Calculate overall scores
    const avgScores = {
      relevance: 0,
      clarity: 0,
      technicalAccuracy: 0,
      experienceLevel: 0,
      communication: 0
    };
    
    evaluations.forEach(evaluation => {
      Object.keys(avgScores).forEach(key => {
        avgScores[key] += evaluation.scores[key];
      });
    });
    
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / evaluations.length);
    });
    
    const overallScore = Math.round(
      Object.values(avgScores).reduce((a, b) => a + b, 0) / Object.keys(avgScores).length
    );
    
    // Collect all strengths and improvements
    const allStrengths = [];
    const allImprovements = [];
    
    evaluations.forEach(evaluation => {
      allStrengths.push(...evaluation.strengths);
      allImprovements.push(...evaluation.improvements);
    });
    
    // Remove duplicates
    const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
    const uniqueImprovements = [...new Set(allImprovements)].slice(0, 5);
    
    return {
      overallScore,
      categoryScores: avgScores,
      strengths: uniqueStrengths,
      improvements: uniqueImprovements,
      questionEvaluations: evaluations,
      recommendation: overallScore >= 85 ? 'hire' : overallScore >= 70 ? 'maybe' : 'no-hire'
    };
    
  } catch (error) {
    console.error('Error evaluating complete interview:', error);
    throw error;
  }
};

/**
 * Generate personalized feedback for candidate
 */
const generateInterviewFeedback = async (evaluation, jobDescription) => {
  try {
    const model = getGeminiFlash();
    
    const prompt = `You are an HR professional providing constructive interview feedback.

JOB CONTEXT:
${jobDescription}

INTERVIEW EVALUATION:
- Overall Score: ${evaluation.overallScore}/100
- Strengths: ${evaluation.strengths.join(', ')}
- Areas for Improvement: ${evaluation.improvements.join(', ')}

Generate encouraging, constructive feedback that:
1. Acknowledges their strengths
2. Provides specific areas to improve
3. Offers actionable advice
4. Maintains a positive, professional tone
5. Is 2-3 paragraphs maximum

Write the feedback now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();
    
  } catch (error) {
    console.error('Error generating feedback:', error);
    return 'Thank you for completing the interview. Your responses have been recorded and will be reviewed by the hiring team.';
  }
};

module.exports = {
  generateInterviewQuestions,
  generateFollowUpQuestion,
  evaluateInterviewResponse,
  evaluateCompleteInterview,
  transcribeVideo,
  generateInterviewFeedback
};
