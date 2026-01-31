const { GoogleGenerativeAI } = require('@google/generative-ai');
const Application = require('../models/Application');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    if (!application.interviewTranscript || application.interviewTranscript.length === 0) {
      throw new Error('No interview transcript available');
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
