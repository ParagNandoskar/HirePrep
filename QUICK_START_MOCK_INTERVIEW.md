# Quick Start Guide - Mock Interview System

## 30-Second Setup

```bash
# 1. Ensure API key is set
cat backend/.env | grep OPENAI_API_KEY

# 2. Run dual-scenario test
cd backend
node test-interview-flow.js

# 3. Review results in console and JSON files
```

## What It Tests

| Metric | Good Performer | Bad Performer | Expected Diff |
|--------|---|---|---|
| Average Score | 75-90 | 40-60 | 30+ points |
| Strong Hire % | 40-60% | 0-10% | Clear gap |
| No-Hire % | 0-5% | 50-80% | Clear gap |
| Questions Asked | 6-10 | 4-8 | Varies |
| Follow-ups | 5-8 | 4-6 | Similar |

## Key Files

```
backend/
├── test-interview-flow.js ................. Run this to test
├── src/services/aiInterviewService.js ... 5 core functions
├── src/controllers/interviewController.js API endpoints
└── INTERVIEW_FLOW_TEST_README.md ......... Detailed guide
```

## API Usage (Backend)

### Start Interview
```javascript
POST /api/interview/start
// Returns: { interviewId, firstQuestion }
```

### Submit Answer
```javascript
POST /api/interview/:id/submit-answer
// Returns: { evaluation, nextAction, followUpQuestion OR nextQuestion }
```

### Next Actions
- `'followup'`: Ask follow-up question
- `'next-question'`: Ask next question from pool
- `'complete'`: Interview done, show feedback

## Frontend Integration

```typescript
// 1. Start interview
const { interviewId, firstQuestion } = await startInterview();

// 2. User answers
const btn = document.querySelector('button[data-submit]');
btn.onclick = async () => {
  const answer = document.querySelector('textarea').value;

  const result = await submitAnswer(interviewId, answer);

  if (result.nextAction === 'followup') {
    showQuestion(result.followUpQuestion);
  } else if (result.nextAction === 'next-question') {
    showQuestion(result.nextQuestion);
  } else {
    showFeedback(result.completionReason);
  }
};
```

## Expected Results

### Good Performer Output Example
```
🎯 AVERAGE SCORE: 85/100
✓ 4 Excellent (90-100) answers
✓ 2 Good (75-89) answers
✓ Recommendations: 3x Strong Hire, 2x Hire, 1x Maybe
✓ Interview completed with comprehensive feedback
```

### Bad Performer Output Example
```
🎯 AVERAGE SCORE: 52/100
✓ 0 Excellent answers
✓ 2 Average (60-74) answers
✓ 4 Needs Work (<60) answers
✓ Recommendations: 4x No-Hire, 2x Maybe
✓ System appropriately rejected candidate
```

## Verify System Appropriateness

Once test runs, check:

✅ **Score Gap** > 25 points (shows discrimination)
✅ **Good performer** has multiple "Strong Hire" recommendations
✅ **Bad performer** has multiple "No-Hire" recommendations
✅ **Follow-ups** generated for both (shows thorough probing)
✅ **Questions vary** (not asking same question twice)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API Key not found | Check `backend/.env` has `OPENAI_API_KEY` |
| Script hangs | Check internet connection, Grok API status |
| All scores low | Job description too hard, update it |
| No follow-ups | Expected for excellent answers |
| Timeout | Increase timeout in script, check API |

## Customization

### Change Model
Edit `backend/.env`:
```env
GROK_MODEL_NAME=llama-3.3-70b-versatile  # Latest recommended
# or try: mixtral-8x7b-32768
```

### Change Candidate Profiles
Edit `backend/test-interview-flow.js` lines 126-172:
```javascript
// Good performer skills
const goodSkills = ['Node.js', 'React', ...]; // 12 skills
const goodExp = 3; // years

// Bad performer skills
const badSkills = ['HTML', 'CSS', 'JavaScript']; // 3 skills
const badExp = 0.5; // years
```

### Change Job Description
Edit lines 164-180 in test-interview-flow.js

## Monitoring

Check these metrics weekly:

```bash
# Count interviews completed
ls -la backend/interview-flow-test-*.json | wc -l

# Check average scores
grep "averageScore" backend/interview-flow-test-*.json | awk -F: '{sum+=$NF; count++} END {print sum/count}'

# Show completion reasons
grep "completionReason" backend/interview-flow-test-*.json
```

## Performance

Expected timing:
- **Per Question**: 3-5 seconds
- **Per Interview**: 2-3 minutes (6-8 questions)
- **Dual Scenario**: 6-8 minutes total

If slower, check:
- Internet connection
- Grok API status
- API key rate limits

## Next Steps

1. ✅ Run test script and review results
2. ✅ Verify good/bad performer discrimination
3. ✅ Integrate API endpoints in frontend
4. ✅ Test with real candidates
5. ✅ Monitor metrics over time
6. ✅ Deploy to production

---

**Last Updated**: 2026-03-25
**System**: Fully Functional ✅
