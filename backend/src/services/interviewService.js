const { getGeminiFlash } = require('../config/gemini');
const axios = require('axios');

class InterviewService {
  // Generate dynamic interview questions using Gemini Flash
  async generateInterviewQuestions(jobData, resumeData, difficulty = 'medium') {
    try {
      const model = getGeminiFlash();
      
      const prompt = `
        Generate 5 interview questions for the following job position based on the candidate's resume.
        
        Job Details:
        - Title: ${jobData.title}
        - Description: ${jobData.description}
        - Required Skills: ${jobData.requirements.skills.map(s => s.name).join(', ')}
        
        Candidate Resume Summary:
        - Skills: ${resumeData.skills ? resumeData.skills.map(s => s.name).join(', ') : 'Not specified'}
        - Experience: ${resumeData.experience ? resumeData.experience.map(e => `${e.position} at ${e.company}`).join(', ') : 'Not specified'}
        - Education: ${resumeData.education ? resumeData.education.map(e => `${e.degree} from ${e.institution}`).join(', ') : 'Not specified'}
        
        Difficulty Level: ${difficulty}
        
        Generate questions that are:
        1. Relevant to the job requirements
        2. Appropriate for the candidate's experience level
        3. Mix of technical, behavioral, and situational questions
        4. Progressive in difficulty
        
        Return ONLY a JSON array of questions in this format:
        [
          {
            "id": 1,
            "question": "Question text here",
            "type": "technical|behavioral|situational",
            "category": "skill category or topic",
            "difficulty": "easy|medium|hard",
            "expectedAnswer": "Brief outline of what a good answer should cover",
            "scoringCriteria": ["criteria1", "criteria2", "criteria3"]
          }
        ]
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Question generation error:', error);
      throw new Error('Failed to generate interview questions: ' + error.message);
    }
  }

  // Analyze interview answer using Gemini
  async analyzeAnswer(question, answer, expectedAnswer) {
    try {
      const model = getGeminiFlash();
      
      const prompt = `
        Analyze the candidate's answer to this interview question.
        
        Question: ${question}
        Expected Answer Guidelines: ${expectedAnswer}
        Candidate's Answer: ${answer}
        
        Provide analysis in this JSON format (no additional text):
        {
          "relevanceScore": 85,
          "completenessScore": 78,
          "technicalAccuracy": 90,
          "communicationScore": 82,
          "overallScore": 84,
          "feedback": {
            "strengths": ["Good technical understanding", "Clear explanation"],
            "improvements": ["Could provide more specific examples"],
            "suggestions": ["Practice explaining complex concepts more simply"]
          }
        }
        
        Scoring scale: 0-100
        - Relevance: How well the answer addresses the question
        - Completeness: How thoroughly the question is answered
        - Technical Accuracy: Correctness of technical information (if applicable)
        - Communication: Clarity, structure, and articulation
        - Overall: Weighted average of all criteria
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Answer analysis error:', error);
      throw new Error('Failed to analyze answer: ' + error.message);
    }
  }

  // Process video analysis data from Python microservice
  async processVideoAnalysis(videoData, interviewId) {
    try {
      const pythonServiceUrl = process.env.PYTHON_VIDEO_SERVICE_URL || 'http://localhost:8001';
      
      const response = await axios.post(`${pythonServiceUrl}/analyze-video`, {
        interviewId,
        videoData: videoData,
        timestamp: new Date().toISOString()
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Video analysis error:', error);
      
      // Return mock data if service is unavailable
      return {
        emotionScores: [
          { emotion: 'confident', score: 75, timestamp: new Date() },
          { emotion: 'neutral', score: 60, timestamp: new Date() }
        ],
        eyeContactScore: 70,
        engagementScore: 75,
        confidenceScore: 72,
        overallVideoScore: 73
      };
    }
  }

  // Process audio analysis data from Python microservice
  async processAudioAnalysis(audioData, interviewId) {
    try {
      const pythonServiceUrl = process.env.PYTHON_AUDIO_SERVICE_URL || 'http://localhost:8002';
      
      const response = await axios.post(`${pythonServiceUrl}/analyze-audio`, {
        interviewId,
        audioData: audioData,
        timestamp: new Date().toISOString()
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Audio analysis error:', error);
      
      // Return mock data if service is unavailable
      return {
        toneAnalysis: {
          confidence: 68,
          enthusiasm: 72,
          clarity: 75,
          pace: 'moderate'
        },
        sentimentScores: [
          { sentiment: 'positive', score: 70, timestamp: new Date() }
        ],
        stressLevel: 45,
        overallAudioScore: 70
      };
    }
  }

  // Generate follow-up questions based on conversation context
  async generateFollowUpQuestion(conversation, currentQuestion, answer) {
    try {
      const model = getGeminiFlash();
      
      const conversationHistory = conversation.map(msg => 
        `${msg.type}: ${msg.content}`
      ).join('\n');
      
      const prompt = `
        Based on the interview conversation history and the candidate's last answer, 
        generate an appropriate follow-up question.
        
        Conversation History:
        ${conversationHistory}
        
        Last Question: ${currentQuestion}
        Last Answer: ${answer}
        
        Generate a follow-up question that:
        1. Builds on the candidate's response
        2. Probes deeper into relevant topics
        3. Maintains interview flow
        4. Assesses additional competencies
        
        Return only the follow-up question text, no additional formatting.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Follow-up question generation error:', error);
      // Return a generic follow-up question
      return "Can you provide a specific example of how you've applied this in a real-world situation?";
    }
  }

  // Calculate overall interview analysis
  calculateOverallAnalysis(videoAnalysis, audioAnalysis, qaAnalysis) {
    const weights = {
      video: 0.3,
      audio: 0.3,
      qa: 0.4
    };

    const videoScore = videoAnalysis ? videoAnalysis.overallVideoScore || 0 : 0;
    const audioScore = audioAnalysis ? audioAnalysis.overallAudioScore || 0 : 0;
    const qaScore = qaAnalysis ? qaAnalysis.overallQAScore || 0 : 0;

    const overallScore = Math.round(
      videoScore * weights.video +
      audioScore * weights.audio +
      qaScore * weights.qa
    );

    // Generate strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // Video analysis feedback
    if (videoAnalysis) {
      if (videoAnalysis.confidenceScore > 75) {
        strengths.push('Demonstrates strong confidence');
      } else if (videoAnalysis.confidenceScore < 50) {
        weaknesses.push('Could improve confidence presentation');
        recommendations.push('Practice mock interviews to build confidence');
      }

      if (videoAnalysis.eyeContactScore > 70) {
        strengths.push('Maintains good eye contact');
      } else if (videoAnalysis.eyeContactScore < 40) {
        weaknesses.push('Needs to improve eye contact');
        recommendations.push('Practice maintaining eye contact with the camera');
      }
    }

    // Audio analysis feedback
    if (audioAnalysis) {
      if (audioAnalysis.toneAnalysis.clarity > 75) {
        strengths.push('Speaks clearly and articulately');
      } else if (audioAnalysis.toneAnalysis.clarity < 50) {
        weaknesses.push('Could speak more clearly');
        recommendations.push('Practice speaking slowly and clearly');
      }

      if (audioAnalysis.stressLevel < 30) {
        strengths.push('Remains calm under pressure');
      } else if (audioAnalysis.stressLevel > 70) {
        weaknesses.push('Shows signs of stress during interview');
        recommendations.push('Practice relaxation techniques before interviews');
      }
    }

    // Q&A analysis feedback
    if (qaAnalysis && qaAnalysis.responses) {
      const avgRelevance = qaAnalysis.responses.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / qaAnalysis.responses.length;
      
      if (avgRelevance > 75) {
        strengths.push('Provides highly relevant answers');
      } else if (avgRelevance < 50) {
        weaknesses.push('Answers could be more focused and relevant');
        recommendations.push('Practice structuring answers using the STAR method');
      }
    }

    return {
      overallScore,
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 3),
      recommendations: recommendations.slice(0, 3)
    };
  }

  // Generate interview summary report
  async generateInterviewSummary(interview) {
    try {
      const model = getGeminiFlash();
      
      const conversationText = interview.conversation.map(msg => 
        `${msg.type.toUpperCase()}: ${msg.content}`
      ).join('\n');
      
      const analysisData = {
        overallScore: interview.analysis.overallScore,
        videoScore: interview.analysis.videoAnalysis?.overallVideoScore || 0,
        audioScore: interview.analysis.audioAnalysis?.overallAudioScore || 0,
        qaScore: interview.analysis.qaAnalysis?.overallQAScore || 0
      };

      const prompt = `
        Generate a comprehensive interview summary report based on the following data:
        
        Interview Conversation:
        ${conversationText}
        
        Analysis Scores:
        - Overall Score: ${analysisData.overallScore}/100
        - Video Analysis Score: ${analysisData.videoScore}/100
        - Audio Analysis Score: ${analysisData.audioScore}/100
        - Q&A Analysis Score: ${analysisData.qaScore}/100
        
        Generate a professional summary report that includes:
        1. Executive Summary
        2. Key Strengths
        3. Areas for Improvement
        4. Specific Recommendations
        5. Overall Assessment
        
        Keep the report concise but comprehensive, suitable for both the candidate and potential employers.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Summary generation error:', error);
      return 'Interview summary could not be generated at this time.';
    }
  }
}

module.exports = new InterviewService();
