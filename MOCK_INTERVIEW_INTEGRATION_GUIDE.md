# Mock Interview System - Integration Guide

## Project Overview

The HirePrep Mock Interview system is now fully integrated with:
- ✅ **Dynamic AI Question Generation** (3-10 questions, AI-decided count)
- ✅ **Interactive Conversational Flow** (ask, answer, follow-up, evaluate, repeat)
- ✅ **Resume-Based Customization** (questions tailored to candidate skills)
- ✅ **Dual-Scenario Testing** (Good vs Bad performer comparison)
- ✅ **Comprehensive Evaluation** (5-dimensional scoring)
- ✅ **Grok AI Integration** (Latest model: llama-3.3-70b-versatile)

## System Architecture

```
Frontend (React)
    ↓
API Layer (Node.js/Express)
    ↓
Interview Controller
    ├─ startInterview() → Generate questions
    └─ submitAnswer() → Evaluate & decide next action
    ↓
AI Interview Service
    ├─ generateInterviewQuestions() → AI decides count
    ├─ evaluateInterviewResponse() → 5D scoring
    ├─ generateAdaptiveFollowUp() → AI-driven probing
    ├─ shouldCompleteInterview() → Completion logic
    └─ generateComprehensiveFeedback() → Final assessment
    ↓
Grok LLM API (OpenAI-compatible)
    └─ Model: llama-3.3-70b-versatile
```

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── openai.js ........................ Grok API configuration
│   ├── controllers/
│   │   └── interviewController.js .......... Interview API endpoints
│   ├── models/
│   │   └── Interview.js ................... Interview data schema
│   └── services/
│       └── aiInterviewService.js ......... Core interview logic (5 functions)
├── .env .................................... API keys & config
├── .env.example ............................. Template
├── test-interview-flow.js ................... Dual-scenario test suite
└── INTERVIEW_FLOW_TEST_README.md ............ Test documentation
```

## Configuration

### 1. Environment Setup

**File: `backend/.env`**
```env
# Grok API Configuration
OPENAI_API_KEY=gsk_xxxxxxxxxxxxxxxx
GROK_MODEL_NAME=llama-3.3-70b-versatile

# Database
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key

# Port
PORT=5000
```

### 2. Model Configuration

**File: `backend/src/config/openai.js`**
```javascript
const GROK_MODEL_NAME = process.env.GROK_MODEL_NAME || 'llama-3.3-70b-versatile';

// All functions use environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
```

## API Endpoints

### Start Interview
```
POST /api/interview/start
Body: {
  jobId: string,
  candidateId: string
}

Response: {
  interviewId: string,
  firstQuestion: string,
  questionNumber: 1
}
```

**Flow:**
1. AI generates 3-10 questions based on job & candidate
2. Questions stored in database
3. First question returned to frontend

### Submit Answer
```
POST /api/interview/:interviewId/submit-answer
Body: {
  answer: string,
  questionNumber: number
}

Response: {
  evaluation: {
    overallScore: 0-100,
    fitAssessment: string,
    recommendation: string,
    scores: { relevance, clarity, depth, communication, alignment }
  },
  nextAction: 'followup' | 'next-question' | 'complete',
  followUpQuestion?: string,
  nextQuestion?: string,
  completionReason?: string
}
```

**Flow:**
1. AI evaluates answer (5-dimensional scoring)
2. AI decides: follow-up needed? or next question? or complete?
3. If follow-up: generate and ask follow-up
4. If next question: send next question
5. If complete: generate feedback & close interview

## Core Functions

### 1. generateInterviewQuestions()
**Purpose:** Generate initial question pool based on candidate profile

**Input:**
```javascript
{
  jobDescription: string,
  candidateResume: { skills: [], experience: [], education: string }
}
```

**Output:**
```javascript
{
  questions: [
    {
      question: string,
      category: string,        // Technical, Behavioral, etc.
      difficulty: string,      // easy, medium, hard
      expectedDuration: number // seconds
    },
    ... // 3-10 total
  ]
}
```

**Details:**
- AI autonomously decides question count (3-10)
- Not fixed at 5
- Based on job complexity & candidate level
- Distributed across multiple categories

### 2. evaluateInterviewResponse()
**Purpose:** Score answer on 5 dimensions

**Input:**
```javascript
{
  question: string,
  answer: string,
  jobDescription: string
}
```

**Output:**
```javascript
{
  overallScore: 0-100,
  scores: {
    relevance: 0-100,
    clarity: 0-100,
    technicalDepth: 0-100,
    communication: 0-100,
    experienceAlignment: 0-100
  },
  fitAssessment: 'strong' | 'good' | 'acceptable' | 'concerning',
  recommendation: 'strong-hire' | 'hire' | 'maybe' | 'no-hire'
}
```

**Scoring Criteria:**
- **Relevance**: How well answer addresses question
- **Clarity**: How clearly response is communicated
- **Technical Depth**: Technical correctness and completeness
- **Communication**: Articulation and professionalism
- **Experience Alignment**: Matches candidate's claimed experience

### 3. generateAdaptiveFollowUp()
**Purpose:** Decide if follow-up needed and generate it

**Input:**
```javascript
{
  originalQuestion: string,
  answer: string,
  evaluation: { overallScore, scores },
  answerHistory: []
}
```

**Output:**
```javascript
{
  shouldFollowUp: boolean,
  followUpQuestion?: string,
  reasoning?: string      // Why follow-up was needed
}
```

**Logic:**
- If score < 70: Higher likelihood of follow-up
- If answer lacks specifics: Generate clarifying follow-up
- If answer is vague: Ask for concrete examples
- If score > 85: May skip follow-up
- ~75% follow-up rate is typical

### 4. shouldCompleteInterview()
**Purpose:** Determine if interview should end

**Input:**
```javascript
{
  questionsAsked: number,
  averageScore: number,
  topicsCovered: number,
  answerHistory: []
}
```

**Output:**
```javascript
{
  shouldComplete: boolean,
  reasoning: string         // Why completion decision was made
}
```

**Completion Criteria:**
- Minimum questions asked (typically 4-5)
- Sufficient average score (to assess capability)
- Multiple topics covered
- Pattern clarity achieved

### 5. generateComprehensiveFeedback()
**Purpose:** Generate final assessment feedback

**Input:**
```javascript
{
  questionsAsked: number,
  averageScore: number,
  topicsCovered: [],
  overallFitAssessment: 'strong' | 'good' | 'concerning'
}
```

**Output:**
```javascript
string  // 4-5 paragraph personalized feedback
```

**Content:**
- Summary of performance
- Strengths identified
- Areas for improvement
- Recommendation
- Technical assessment

## Frontend Integration

### Start Interview Flow

```typescript
// 1. User clicks "Start Interview"
const response = await fetch('/api/interview/start', {
  method: 'POST',
  body: JSON.stringify({
    jobId: selectedJob.id,
    candidateId: currentUser.id
  })
});

const { interviewId, firstQuestion } = await response.json();

// 2. Display first question
setCurrentQuestion(firstQuestion);
setInterviewId(interviewId);
```

### Answer Submission Flow

```typescript
// 1. User types answer
const userAnswer = answerText;

// 2. Submit answer
const response = await fetch(`/api/interview/${interviewId}/submit-answer`, {
  method: 'POST',
  body: JSON.stringify({
    answer: userAnswer,
    questionNumber: currentQuestionNumber
  })
});

const { evaluation, nextAction, followUpQuestion, nextQuestion, completionReason }
  = await response.json();

// 3. Handle response based on nextAction
switch (nextAction) {
  case 'followup':
    // Show follow-up question
    setCurrentQuestion(followUpQuestion);
    setIsFollowUp(true);
    break;

  case 'next-question':
    // Show next question
    setCurrentQuestion(nextQuestion);
    setIsFollowUp(false);
    break;

  case 'complete':
    // Show feedback and complete interview
    setCompletionReason(completionReason);
    setInterviewComplete(true);
    break;
}
```

## Testing Integration

### Run Dual-Scenario Test

```bash
cd backend
node test-interview-flow.js
```

**This will:**

1. **Scenario 1: Good Performer**
   - Skills: 12 full-stack technologies
   - Experience: 3+ years
   - Education: Bachelor's degree
   - Expected: High scores (75+), Strong hire recommendations

2. **Scenario 2: Bad Performer**
   - Skills: 3 basic web technologies
   - Experience: 6 months
   - Education: High school
   - Expected: Low scores (<60), No-hire recommendations

3. **Comparative Analysis**
   - Shows score differences
   - Displays recommendation distributions
   - Verifies system appropriateness
   - Confirms AI decision-making

**Expected Output:**
```
Good Performer: 85/100 average
Bad Performer:  52/100 average
Difference:     33 points (stark quality difference)

Good Performer: Strong hire recommendations
Bad Performer:  No-hire recommendations

System is APPROPRIATELY discriminating between candidates
```

## Key Metrics to Monitor

### Interview Completion Time
- Target: 2-3 minutes per interview
- Acceptable: 1-5 minutes
- Issue: >10 minutes may indicate API problems

### Question Generation
- Expected: 3-10 questions per interview
- Average: 6-8 questions
- Should vary by complexity

### Follow-up Rate
- Target: 50-75% of questions
- Indicates: System is probing appropriately
- Too high (>90%): May be over-questioning
- Too low (<30%): May be under-questioning

### Score Distribution
- Good performers: 60+ average
- Bad performers: <60 average
- Gap should be clear and significant

### Recommendation Accuracy
- Good performers: "Hire" or "Strong Hire"
- Bad performers: "No-Hire" or "Maybe"
- Should show clear discrimination

## Troubleshooting

### Issue: Low Scores on All Answers
**Cause:** Job description too specialized for candidate

**Solution:**
- Edit job description in controller
- Or use candidates matching the job
- Or test with different resume profiles

### Issue: No Follow-ups Generated
**Cause:** Questions are well-answered

**Solution:**
- Expected behavior for strong candidates
- Indicates good question clarity
- Not a system issue

### Issue: Interview Doesn't Complete
**Cause:** Completion criteria not met

**Solution:**
- Check question count (need minimum)
- Check average score calculation
- Verify topics are being tracked

### Issue: API Timeouts
**Cause:** Grok API is slow or unreachable

**Solution:**
- Verify API key is correct
- Check internet connection
- Check Grok API status
- Add longer timeout values

## Database Schema Updates

### Interview Model

```javascript
const interviewSchema = new Schema({
  jobId: ObjectId,
  candidateId: ObjectId,

  // Questions Pool
  questionsPool: [{
    question: String,
    category: String,
    difficulty: String,
    asked: Boolean
  }],

  // Conversation History
  conversation: [{
    questionId: String,
    isFollowUp: Boolean,
    question: String,
    answer: String,
    evaluation: {
      overallScore: Number,
      scores: {
        relevance: Number,
        clarity: Number,
        technicalDepth: Number,
        communication: Number,
        experienceAlignment: Number
      },
      fitAssessment: String,
      recommendation: String
    },
    timestamp: Date
  }],

  // Analysis Metadata
  analysisMetadata: {
    questionsAsked: Number,
    followUpsAsked: Number,
    averageScore: Number,
    topicsCovered: [String],
    completionReason: String
  },

  // Final Feedback
  comprehensiveFeedback: String,

  // Status
  status: String,         // started, in_progress, completed, abandoned
  startTime: Date,
  endTime: Date,
  duration: Number        // seconds
});
```

## Deployment Checklist

- [ ] API key set in `.env`
- [ ] Model name set: `llama-3.3-70b-versatile`
- [ ] Database connection verified
- [ ] Interview model migrations run
- [ ] Test script runs successfully
- [ ] Both scenarios show expected results
- [ ] Score distribution appropriate
- [ ] Good/bad performer distinction clear
- [ ] Follow-up logic working
- [ ] Completion criteria functioning
- [ ] Frontend integrated with endpoints
- [ ] Real-time logging working
- [ ] Performance acceptable (2-3 min per interview)

## Next Steps

1. **Monitor Interview Quality**: Run tests weekly to ensure system appropriateness
2. **Analyze Patterns**: Review logs to identify question gaps
3. **Refine Candidates**: Test with real candidate profiles
4. **Tune Scores**: Adjust scoring if needed
5. **Optimize Performance**: Cache common questions if needed
6. **Scale Testing**: Run 100+ interviews to verify consistency

## Support & Documentation

- **Test Guide**: `backend/INTERVIEW_FLOW_TEST_README.md`
- **API Documentation**: See controller comments
- **Core Logic**: See service function comments
- **Configuration**: See `.env.example`

---

**Status**: ✅ Fully Integrated and Tested
**Last Updated**: 2026-03-25
**System**: Grok LLM (llama-3.3-70b-versatile)
