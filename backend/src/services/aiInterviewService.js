const { getOpenAIFlash } = require('../config/openai');

/**
 * Generate FULLY DYNAMIC interview questions
 * AI decides the optimal number of questions based on job complexity and requirements
 * Questions are contextual and interconnected, not hardcoded to 5 questions
 */
const generateInterviewQuestions = async (jobDescription, candidateLevel = 'mid-level') => {
  try {
    const model = getOpenAIFlash();

    const prompt = `You are an expert HR interviewer creating a CUSTOMIZED, ADAPTIVE interview for a candidate.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE LEVEL: ${candidateLevel}

CRITICAL INSTRUCTION: You must AUTONOMOUSLY decide the optimal number of interview questions based on:
1. Job Complexity Analysis:
   - Simple/Entry-level role: 3-4 questions (focus on fundamentals)
   - Mid-level role: 5-6 questions (balanced assessment)
   - Senior/Expert role: 7-10 questions (comprehensive evaluation)
   - Leadership role: 8-10 questions (include behavioral + strategic)

2. Role Requirements Analysis:
   - Technical heavy role: 60% technical + 40% behavioral/soft skills
   - Leadership role: 40% technical + 60% behavioral/leadership
   - Customer-facing: Include communication and stress-handling questions
   - Niche role: Deep-dive specific knowledge questions

3. Candidate Level Matching:
   - Junior: Focus on fundamentals, willingness to learn
   - Mid-level: Balanced technical + leadership potential
   - Senior: Advanced scenarios, mentorship capabilities

MUST INCLUDE:
- Questions that build on each other (contextual references)
- Progressive difficulty (easy → medium → hard)
- Mix of question types (technical, behavioral, situational, scenario-based)
- Real-world, practical questions
- Questions that reveal problem-solving approach
- Cultural fit assessment questions

STRICTLY FOLLOW THIS FORMAT - Generate EXACTLY what's requested below:

Return ONLY a valid JSON array (no markdown, no comments, no extra text):
[
  {
    "id": "q_1",
    "sequenceNumber": 1,
    "question": "Full, conversational interview question with specific context",
    "category": "technical|behavioral|experience|skills|culture-fit|scenario|leadership",
    "difficulty": "easy|medium|hard",
    "expectedKnowledgeAreas": ["area1", "area2", "area3"],
    "followUpHints": ["probe point 1", "probe point 2", "probe point 3"],
    "estimatedResponseTimeMinutes": 2,
    "whyThisQuestion": "Why this is critical for this specific role",
    "whatMakesGoodAnswer": "Specific criteria for a strong response",
    "redFlags": ["warning sign 1", "warning sign 2"],
    "relatesTo": "q_1 or null"
  }
]

NOW GENERATE THE QUESTIONS - YOU DECIDE THE OPTIMAL COUNT, NOT FIXED TO 5:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response - expected JSON array of questions');
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Enhance questions with metadata
    const enhancedQuestions = questions.map((q, index) => ({
      ...q,
      id: q.id || `q_${index + 1}`,
      sequenceNumber: index + 1,
      totalQuestionsInInterview: questions.length,
      type: 'ai-generated-dynamic',
      isDynamic: true,
      isAdaptive: true,
      generatedAt: new Date(),
      interviewPhase: index < 2 ? 'warm-up' : index < questions.length - 1 ? 'assessment' : 'wrap-up'
    }));

    console.log(`✅ AI-Generated ${enhancedQuestions.length} dynamic interview questions (not fixed to 5)`);

    return enhancedQuestions;

  } catch (error) {
    console.error('Error generating dynamic interview questions:', error);
    throw error;
  }
};

/**
 * Generate ADAPTIVE follow-up questions based on candidate answer
 * AI decides if follow-up is needed and what direction to take
 */
const generateAdaptiveFollowUp = async (jobDescription, currentQuestion, candidateAnswer, conversationHistory = []) => {
  try {
    const model = getOpenAIFlash();

    const recentContext = conversationHistory
      .slice(-6)  // Last 6 exchanges
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n');

    const prompt = `As an expert interviewer, analyze this candidate's answer and decide the best next action.

JOB REQUIREMENTS:
${jobDescription}

CURRENT QUESTION:
${currentQuestion}

CANDIDATE'S ANSWER:
${candidateAnswer}

RECENT INTERVIEW CONTEXT:
${recentContext || 'Opening question'}

Based on the answer quality and candidate's demonstrated knowledge, decide:
1. Is follow-up needed? (answer incomplete, needs clarification, or deserves deeper exploration)
2. What should be explored next? (follow-up on this topic or pivot to new area)
3. What are the assessment signals? (strengths, gaps, red flags)

Return ONLY valid JSON:
{
  "shouldFollowUp": true|false,
  "followUpQuestion": "null or specific follow-up question",
  "reasoning": "Short reason for decision",
  "answerQuality": "poor|fair|good|excellent",
  "assessmentInsights": {
    "strengths": ["strength1", "strength2"],
    "gaps": ["gap1", "gap2"],
    "redFlags": ["flag1"] or [],
    "candidateLevel": "junior|mid|senior|expert"
  },
  "nextTopic": "pivot to this area or null if following up on current",
  "followUpStrategy": "clarification|deeper-dive|challenge-assumption|pivot"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        shouldFollowUp: false,
        followUpQuestion: null,
        reasoning: 'Proceeding to next question'
      };
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error generating adaptive follow-up:', error);
    return {
      shouldFollowUp: false,
      followUpQuestion: null,
      reasoning: 'Moving to next question (follow-up generation failed)'
    };
  }
};

/**
 * Evaluate interview response with context awareness
 */
const evaluateInterviewResponse = async (question, answer, jobDescription, conversationContext = {}) => {
  try {
    const model = getOpenAIFlash();

    const prompt = `Evaluate this interview response in the context of the full interview and role requirements.

JOB CONTEXT:
${jobDescription}

QUESTION:
${question}

ANSWER:
${answer}

PREVIOUS ANSWERS CONTEXT:
${conversationContext.previousAnswersSummary || 'First question of interview'}

Evaluate comprehensively:
Return ONLY valid JSON:
{
  "score": 0-100,
  "scores": {
    "relevance": 0-100,
    "clarity": 0-100,
    "technicalDepth": 0-100,
    "communication": 0-100,
    "experienceAlignment": 0-100
  },
  "overallScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "keyInsights": "Notable observations",
  "candidateType": "junior|mid|senior|expert",
  "fitAssessment": "strong|good|acceptable|concerning",
  "recommendation": "strong-hire|hire|maybe|no-hire",
  "leadershipPotential": true|false,
  "culturalFitSignals": ["signal1", "signal2"]
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
    return {
      score: 50,
      overallScore: 50,
      strengths: ['Response recorded'],
      improvements: ['Awaiting evaluation'],
      keyInsights: 'Evaluation pending'
    };
  }
};

/**
 * Comprehensive interview feedback based on all answers
 */
const generateComprehensiveFeedback = async (interview, jobDescription) => {
  try {
    const model = getOpenAIFlash();

    const interviewMetrics = {
      totalQuestions: interview.questionsAsked || 0,
      averageScore: Math.round(interview.averageScore || 0),
      topicsCovered: interview.topicsCovered || [],
      overallFit: interview.overallFitAssessment || 'pending'
    };

    const prompt = `Generate comprehensive, personalized interview feedback after a full interview session.

JOB POSITION:
${jobDescription}

INTERVIEW METRICS:
- Total Questions Asked: ${interviewMetrics.totalQuestions}
- Average Performance Score: ${interviewMetrics.averageScore}/100
- Topics Covered: ${interviewMetrics.topicsCovered.join(', ')}
- Overall Fit Assessment: ${interviewMetrics.overallFit}

Create constructive, encouraging feedback that:
1. Celebrates demonstrated strengths with specific examples
2. Provides concrete, actionable improvement areas
3. Identifies high-potential areas
4. Offers realistic preparation recommendations
5. Maintains supportive, professional tone

Structure: 4-5 paragraphs covering:
- Interview Performance Summary
- Key Strengths Demonstrated
- Areas for Growth and Development
- Concrete Next Steps and Recommendations
- Closing Encouragement

Write the feedback now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error('Error generating comprehensive feedback:', error);
    return 'Thank you for the interview. Your responses have been recorded and will be reviewed.';
  }
};

/**
 * AI determines if interview should continue or complete
 * Not fixed - AI decides based on assessment coverage and patterns
 */
const shouldCompleteInterview = async (questionsAsked, averageScore, uniqueTopicsCovered, conversationHistory) => {
  try {
    const model = getOpenAIFlash();

    const prompt = `Determine if an interview has gathered sufficient information about a candidate.

INTERVIEW STATUS:
- Questions Asked: ${questionsAsked}
- Average Score: ${averageScore}/100
- Topics Covered: ${uniqueTopicsCovered} unique areas
- Total Conversation Turns: ${conversationHistory.length}

DECISION CRITERIA:
1. Minimum threshold: At least 3 questions answered
2. Adequate coverage: Key job requirements assessed
3. Pattern clarity: Assessment trend is stable
4. Reasonable length: Not exceeding 10 questions (unless complex role)
5. Candidate fatigue: Interview should not be too long

Decide with reasoning.

Return ONLY valid JSON:
{
  "shouldComplete": true|false,
  "reasoning": "Why complete or continue",
  "assessment": {
    "sufficiencyScore": 0-100,
    "coverageLevel": "incomplete|adequate|comprehensive",
    "patternClarity": 0-100,
    "recommendation": "complete|ask-more|probe-specific-area"
  },
  "suggestion": "Next action if continuing"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback logic
      return {
        shouldComplete: questionsAsked >= 5,
        reasoning: 'Using default completion logic'
      };
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error determining interview completion:', error);
    return {
      shouldComplete: questionsAsked >= 5,
      reasoning: 'Fallback completion logic'
    };
  }
};

module.exports = {
  generateInterviewQuestions,
  generateAdaptiveFollowUp,
  evaluateInterviewResponse,
  generateComprehensiveFeedback,
  shouldCompleteInterview
};
