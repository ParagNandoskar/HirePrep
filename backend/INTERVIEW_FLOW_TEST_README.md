# Interview Flow Test Script - Usage Guide

## Overview
The `test-interview-flow.js` script simulates a complete interactive mock interview experience using:
- **Resume-Based Question Generation**: Questions tailored to candidate's skills and domain
- **Human-Level Answers**: Mid-level realistic responses (not expert-level)
- **AI Evaluation**: Multi-dimensional scoring on each response
- **Adaptive Follow-ups**: AI decides when to probe deeper
- **Comprehensive Logging**: All data captured for analysis

## Key Features

### 1. Resume-Based Question Generation
- Questions are generated based on candidate's **actual skills** from their resume
- Job description is constructed to match candidate's domain
- Questions consider candidate's **experience level** (junior/mid/senior)
- Ensures questions are relevant to what the candidate knows

**Example:**
```javascript
Candidate Skills: Node.js, Express.js, React.js, MongoDB, Docker
↓
Questions Generated: Related to MERN stack, REST APIs, backend/frontend
```

### 2. Realistic Human-Level Answers
Answers are generated to simulate a **mid-level professional** (not an expert):
- Uses conversational tone with qualifiers: "I believe", "In my experience"
- Shows competence but not expertise in everything
- Includes minor hesitations and realistic limitations
- 2-3 sentences, specific but not overly detailed
- Temperature: 0.8 for natural variability

**Before (Expert-level):**
> "I have extensive experience with Node.js and Express.js, having developed numerous highly-scalable microservices architectures with sophisticated error handling, implementing ELK stack for logging, utilizing circuit breakers..."

**After (Medium human-level):**
> "I've worked with Node.js and Express.js for about 2 years now. I typically handle errors using try-catch blocks and middleware, and I've used Winston for logging in most of my projects."

## How It Works

### Single Scenario (Original)
```
1. Generate questions based on candidate resume
2. Simulate complete interview flow
3. Generate answers and evaluate them
4. Output results and metrics
```

### Dual Scenario - NEW FEATURE
Compare **Good Performer vs Bad Performer** to verify system appropriateness:
```
SCENARIO 1: Good Performer
- Strong skills: Node.js, React, Express, MongoDB, TypeScript, Python, Redis, etc. (12 skills)
- Experience: 3+ years as Full-Stack Developer
- Education: Bachelor of Computer Science

        ↓

SYSTEM GENERATED QUESTIONS & EVALUATIONS

        ↓

SCENARIO 2: Bad Performer
- Limited skills: HTML, CSS, Basic JavaScript (3 skills)
- Experience: 6 months as Intern
- Education: High School Diploma

        ↓

COMPARATIVE ANALYSIS
- Questions asked comparison
- Score distribution differences
- Follow-up rate analysis
- Hiring recommendation breakdown
- System adaptation insights
```

## Running the Test

### Option 1: Dual Scenario Test (Recommended for Integration Testing)

Run BOTH good and bad performer scenarios with automatic comparison:

```bash
cd backend
node test-interview-flow.js
```

**What it does:**
1. Runs interview with **Good Performer** (strong candidate)
2. Waits 2 seconds
3. Runs interview with **Bad Performer** (weak candidate)
4. Generates **Comparative Analysis** showing differences
5. Saves both logs: `interview-flow-test-good-YYYY-MM-DD_timestamp.json`
                    `interview-flow-test-bad-YYYY-MM-DD_timestamp.json`

**Console Output Includes:**
```
🚀 STARTING DUAL-SCENARIO INTERVIEW TEST SUITE

══════════════════════════════════════════════════════════════════
🎯 INTERACTIVE MOCK INTERVIEW TEST FLOW - ✅ GOOD PERFORMER
══════════════════════════════════════════════════════════════════
[Interview simulation...]

══════════════════════════════════════════════════════════════════
🎯 INTERACTIVE MOCK INTERVIEW TEST FLOW - ❌ BAD PERFORMER
══════════════════════════════════════════════════════════════════
[Interview simulation...]

══════════════════════════════════════════════════════════════════
📊 COMPARATIVE ANALYSIS: GOOD vs BAD PERFORMER
══════════════════════════════════════════════════════════════════

📈 QUESTIONS ASKED:
  Good Performer: 8 questions
  Bad Performer:  6 questions
  Difference:     -2 (FEWER)

🎯 AVERAGE SCORE:
  Good Performer: 85/100
  Bad Performer:  52/100
  Difference:     -33.0 (33.0 point gap)

💯 SCORE DISTRIBUTION COMPARISON:
  EXCELLENT (90-100):
    Good:  4 answers
    Bad:   0 answers
  ...
  NO-HIRE:
    Good:  0 answers
    Bad:   4 answers

🔍 KEY INSIGHTS:
  ✓ STARK QUALITY DIFFERENCE: Bad performer scored 33 points lower
  ✓ SYSTEM ADAPTED: More follow-ups for bad performer
  ✓ RECOMMENDATION DIFFERENCE: System is appropriately rejecting bad performer
```

### Option 2: Single Scenario (Manual Testing)

To test just one candidate profile, modify `runAllTests()` at the bottom:

```javascript
// Change from:
runAllTests();

// To single scenario:
runInterviewTest('good');  // or 'bad'
```

### Customizing Candidate Profiles

**Good Performer Profile** (lines 126-157):
```javascript
const candidateResume = {
  skills: [
    'Node.js', 'React', 'JavaScript', 'Express', 'MongoDB',
    'TypeScript', 'HTML', 'CSS', 'Bootstrap', 'MySQL', 'Python', 'Redis'
  ],
  experience: [
    {
      title: 'Full-Stack Developer',
      company: 'Tech Solutions Inc',
      duration: '2 years',
      description: 'Built web applications using MERN stack and Python'
    },
    // ...
  ],
  education: 'Bachelor of Computer Science',
  yearsOfExperience: 3
};
```

**Bad Performer Profile** (lines 159-172):
```javascript
const candidateResume = {
  skills: ['HTML', 'CSS', 'Basic JavaScript'],
  experience: [
    {
      title: 'Intern',
      company: 'Small Agency',
      duration: '6 months',
      description: 'Did some basic HTML/CSS work'
    }
  ],
  education: 'High School Diploma',
  yearsOfExperience: 0.5
};
```

To test with your own candidates, edit these profiles directly in the script.

## Output Generated

### Console Output
- Colored, formatted display of:
  - Each question asked to candidate
  - Generated answers
  - AI evaluation scores
  - Follow-up decisions
  - Final interview summary
  - **COMPARATIVE ANALYSIS** (dual scenario only):
    - Questions asked comparison
    - Average score gap
    - Follow-up rate differences
    - Score distribution breakdown
    - Recommendation breakdown
    - Key insights about system adaptation

### Log Files
- Good Performer: `interview-flow-test-good-YYYY-MM-DD_timestamp.json`
- Bad Performer: `interview-flow-test-bad-YYYY-MM-DD_timestamp.json`
- Contains complete interview data:
  ```json
  {
    "startTime": "ISO timestamp",
    "scenarioType": "good" or "bad",
    "totalQuestionsGenerated": 8,
    "questionsAsked": [...],           // Exact questions asked
    "answersProvided": [...],          // Generated answers
    "evaluations": [...],              // Scores and assessments
    "followUps": [...],                // Follow-up questions
    "averageScore": 85,
    "completionReason": "...",
    "totalDuration": 45.2              // seconds
  }
  ```

## Comparative Analysis: What It Reveals

### Example Results
```
GOOD PERFORMER vs BAD PERFORMER:

Questions Asked:        8 vs 6    (good performer gets more detailed assessment)
Average Score:         85 vs 52   (33-point gap shows stark quality difference)
Follow-ups Generated:   7 vs 8    (system probes both, but for different reasons)
Excellent Answers:      4 vs 0    (gap shows system discrimination)
Strong Hire Recs:       3 vs 0    (system appropriately rejects bad performer)
```

### System Appropriateness Indicators

✅ **Good Performer**:
- Higher average score (75+/100)
- More "Excellent" answers (90-100)
- More "Strong Hire" recommendations
- Moderate follow-up rate (~50-70%)
- Longer interviews (more questions asked)

✅ **Bad Performer**:
- Lower average score (<60/100)
- More "Needs Work" answers (<60)
- More "No-Hire" recommendations
- May have shorter interviews (system detects inadequacy)
- Follow-ups target specific weaknesses

✅ **System Verified As Appropriate When**:
1. Clear score separation (30+ point gap)
2. Different recommendation distributions
3. Appropriate follow-up rates for each level
4. System doesn't waste time with bad performers
5. System thoroughly assesses good performers

## Interpreting Results

### Question Quality Metrics
- **Follow-up Rate**: % of questions that generated follow-ups
  - High rate (>50%): Thorough probing of responses
  - Medium rate (20-50%): Selective deep-dive
  - Low rate (<20%): Comprehensive questions

### Answer Quality Distribution
- **Excellent (90-100)**: Strong technical knowledge
- **Good (75-89)**: Solid understanding
- **Average (60-74)**: Acceptable but needs improvement
- **Needs Work (<60)**: Gaps identified

### Hiring Recommendations
- **Strong Hire**: Highly qualified candidate
- **Hire**: Meets requirements
- **Maybe**: Requires further assessment
- **No-Hire**: Doesn't meet basic requirements

## Key Features Demonstrated

✅ **Dynamic Questions**: AI decides count (3-10), not fixed
✅ **Adaptive Follow-ups**: AI intelligently decides when to probe deeper
✅ **Interview Completion**: AI determines when interview has sufficient info
✅ **Multi-dimensional Scoring**: 5 criteria evaluated per response
✅ **Category Coverage**: Questions cover technical, behavioral, experience, scenario, etc.
✅ **Difficulty Progression**: Questions progress from easy to hard
✅ **Conversational Context**: Answers contextualized with previous conversation
✅ **Real-time Logging**: All data captured for analysis

## Example Log Entry

```
[Q1] TECHNICAL | EASY
Question: Can you describe your experience with Node.js and Express.js?
Answer: I have extensive experience with Node.js and Express.js...
Score: 90/100 | Fit: strong | Rec: strong-hire
Breakdown: Rel:95 Clr:90 Tech:92 Com:88 Exp:95

[FU1] Follow-up Generated
"Can you provide a specific example of error handling?"
Reasoning: Answer lacks specific examples and details
```

## Troubleshooting

### Script hangs
- Check API key in .env is valid
- Check internet connection for Grok API
- Verify Grok API is not rate limited

### Low scores on all answers
- Job description may be too specialized
- Candidate level may not match
- Adjust jobDescription in script

### No follow-ups generated
- Candidate answers are comprehensive
- AI determined questions were sufficient
- This is expected behavior for strong answers

## API Endpoints Being Tested (when integrated with backend)

- `POST /api/interview/start` - Initiate interview
- `POST /api/interview/:interviewId/submit-answer` - Submit answer
- `GET /api/interview/:interviewId` - Get interview details

## Next Steps

1. **Review generated logs** to understand interview patterns
2. **Analyze answer quality** to ensure scoring is appropriate
3. **Check follow-up appropriateness** to verify AI decision-making
4. **Verify interview completion logic** is working correctly
5. **Integrate with API endpoints** to test full backend flow
