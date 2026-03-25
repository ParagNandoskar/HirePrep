const { generateContent } = require('../config/openai');
const Application = require('../models/Application');

/**
 * Generate fallback feedback when transcript is not available
 * @param {Object} application - The application object
 * @returns {Object} Fallback detailed feedback object
 */
function generateFallbackFeedback(application) {
  const scores = application.aiAnalysis?.scores || {};
  const strengths = application.aiAnalysis?.strengths || [];
  const improvements = application.aiAnalysis?.improvements || [];
  const overallScore = application.screeningScore || 0;

  return {
    summary: "Your interview has been evaluated based on available performance metrics. While a detailed transcript analysis is not available, we've assessed your overall performance.",
    
    detailedAnalysis: `Based on your interview performance, you achieved an overall score of ${overallScore}%. ${strengths.length > 0 ? 'Your key strengths include ' + strengths.join(', ') + '.' : 'Continue working on building your core interview skills.'} ${improvements.length > 0 ? 'Areas for improvement: ' + improvements.join(', ') + '.' : ''}`,
    
    skillBreakdown: {
      communication: {
        score: scores.communication || 70,
        feedback: "Communication skills are essential for conveying your ideas effectively during interviews.",
        whyItMatters: "Clear communication helps you articulate your experience and thoughts to interviewers.",
        howToImprove: [
          "Practice the STAR method for structuring answers",
          "Record yourself answering common questions",
          "Focus on speaking clearly and at a moderate pace",
          "Use specific examples from your experience"
        ]
      },
      technical: {
        score: scores.technical || 70,
        feedback: "Technical knowledge demonstrates your expertise and readiness for the role.",
        whyItMatters: "Strong technical skills are crucial for performing job responsibilities effectively.",
        howToImprove: [
          "Review fundamental concepts regularly",
          "Practice coding problems on platforms like LeetCode",
          "Build personal projects to demonstrate skills",
          "Stay updated with industry trends and technologies"
        ]
      },
      problemSolving: {
        score: scores.problemSolving || 70,
        feedback: "Problem-solving ability shows how you approach challenges and find solutions.",
        whyItMatters: "Employers value candidates who can think critically and solve complex problems.",
        howToImprove: [
          "Break down problems into smaller, manageable steps",
          "Think aloud during problem-solving to show your process",
          "Practice with various problem types and scenarios",
          "Learn from past mistakes and iterate on solutions"
        ]
      },
      confidence: {
        score: scores.behavioral || scores.video || 70,
        feedback: "Confidence reflects your self-assurance and ability to handle pressure.",
        whyItMatters: "Confident candidates demonstrate readiness and belief in their abilities.",
        howToImprove: [
          "Maintain good eye contact and posture",
          "Practice power poses before interviews",
          "Prepare thoroughly to boost confidence",
          "Focus on your achievements and strengths"
        ]
      }
    },
    
    proTips: [
      "Research the company thoroughly before interviews",
      "Prepare questions to ask the interviewer",
      "Test your technical setup (camera, mic, internet) beforehand",
      "Take mock interviews to build confidence",
      "Follow up with a thank-you note after interviews"
    ],
    
    finalRecommendation: `With an overall score of ${overallScore}%, ${overallScore >= 70 ? "you're on the right track! Keep practicing and refining your skills." : "there's room for improvement. Focus on the areas highlighted above and keep practicing."} Remember, every interview is a learning opportunity.`,
    
    generatedAt: new Date(),
    isFallback: true
  };
}

/**
 * Generate comprehensive, detailed feedback for interview performance
 * @param {string} applicationId - The application ID
 * @returns {Promise<Object>} Detailed feedback object
 */
async function generateDetailedFeedback(applicationId) {
  try {
    console.log(`🤖 Generating detailed feedback for application ${applicationId}...`);

    // Fetch application with full transcript and AI analysis
    const application = await Application.findById(applicationId)
      .populate('jobId', 'title description requirements skills')
      .populate('candidateId', 'name email');

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if interview transcript is available
    if (!application.interviewTranscript || application.interviewTranscript.length === 0) {
      console.log(`⚠️ No interview transcript for application ${applicationId}, generating fallback feedback`);
      
      // Generate feedback based on available AI analysis data
      return generateFallbackFeedback(application);
    }

    // Build conversation text from transcript
    let conversationText = '';
    application.interviewTranscript.forEach(entry => {
      if (entry.type === 'question') {
        conversationText += `\n\nInterviewer: ${entry.content}`;
      } else if (entry.type === 'answer') {
        conversationText += `\nCandidate: ${entry.content}`;
      }
    });

    // Prepare job context
    const jobTitle = application.jobId?.title || 'the position';
    const jobRequirements = application.jobId?.requirements?.join(', ') || 'Not specified';
    const jobSkills = application.jobId?.skills?.join(', ') || 'Not specified';

    // Get basic AI analysis scores if available
    const scores = application.aiAnalysis?.scores || {};
    const strengths = application.aiAnalysis?.strengths || [];
    const improvements = application.aiAnalysis?.improvements || [];

    // Create comprehensive prompt for Gemini
    const prompt = `You are an expert interview coach and career advisor. Analyze this job interview and provide comprehensive, personalized feedback to help the candidate improve.

**Job Position:** ${jobTitle}
**Required Skills:** ${jobSkills}
**Job Requirements:** ${jobRequirements}

**Current Performance Scores:**
- Overall: ${scores.overall || 'N/A'}/100
- Communication: ${scores.communication || 'N/A'}/100
- Technical: ${scores.technical || 'N/A'}/100
- Problem Solving: ${scores.problemSolving || 'N/A'}/100

**Identified Strengths:** ${strengths.join(', ') || 'None identified yet'}
**Areas for Improvement:** ${improvements.join(', ') || 'None identified yet'}

**Interview Transcript:**
${conversationText}

Based on this interview, provide a comprehensive analysis in the following JSON format:

{
  "summary": "A 3-4 sentence executive summary of the candidate's performance highlighting key strengths and main areas to work on",
  
  "detailedAnalysis": "A detailed paragraph (5-8 sentences) analyzing the candidate's responses, communication style, technical knowledge, and overall approach to answering questions. Be specific about what they did well and what needs improvement.",
  
  "skillBreakdown": {
    "communication": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences about their communication skills observed in the interview",
      "whyItMatters": "1-2 sentences explaining why this skill is crucial for the role",
      "howToImprove": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
    },
    "technical": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences about their technical knowledge and expertise",
      "whyItMatters": "1-2 sentences explaining why this matters",
      "howToImprove": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
    },
    "problemSolving": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences about their problem-solving approach",
      "whyItMatters": "1-2 sentences explaining why this is important",
      "howToImprove": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
    },
    "confidence": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences about their confidence level and demeanor",
      "whyItMatters": "1-2 sentences explaining why confidence matters",
      "howToImprove": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
    }
  },
  
  "proTips": [
    "General tip 1 for interview success",
    "General tip 2 for interview success",
    "General tip 3 for interview success",
    "General tip 4 for interview success",
    "General tip 5 for interview success"
  ],
  
  "finalRecommendation": "A motivating 2-3 sentence conclusion with next steps and encouragement"
}

Important guidelines:
1. Be specific and reference actual answers from the transcript
2. Be honest but encouraging and constructive
3. Provide actionable, practical advice
4. Tailor feedback to the specific job role
5. Use professional yet friendly language
6. Focus on growth and improvement
7. Return ONLY valid JSON, no additional text`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let feedbackText = response.text();

    // Clean up response (remove markdown code blocks if present)
    feedbackText = feedbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON response
    let detailedFeedback;
    try {
      detailedFeedback = JSON.parse(feedbackText);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError);
      console.log('Raw response:', feedbackText);
      throw new Error('Failed to parse AI feedback response');
    }

    // Add generation timestamp
    detailedFeedback.generatedAt = new Date();

    // Save to database
    application.detailedFeedback = detailedFeedback;
    await application.save();

    console.log(`✅ Detailed feedback generated and saved for application ${applicationId}`);
    return detailedFeedback;

  } catch (error) {
    console.error('❌ Error generating detailed feedback:', error);
    throw error;
  }
}

/**
 * Get detailed feedback for an application (generate if not exists)
 * @param {string} applicationId - The application ID
 * @returns {Promise<Object>} Detailed feedback object
 */
async function getDetailedFeedback(applicationId) {
  try {
    const application = await Application.findById(applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    // If detailed feedback already exists and is recent (less than 7 days old), return it
    if (application.detailedFeedback && application.detailedFeedback.generatedAt) {
      const daysSinceGeneration = (Date.now() - new Date(application.detailedFeedback.generatedAt)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceGeneration < 7) {
        console.log(`✅ Using existing detailed feedback for application ${applicationId}`);
        return application.detailedFeedback;
      }
    }

    // Generate new feedback
    return await generateDetailedFeedback(applicationId);

  } catch (error) {
    console.error('❌ Error getting detailed feedback:', error);
    throw error;
  }
}

module.exports = {
  generateDetailedFeedback,
  getDetailedFeedback
};
