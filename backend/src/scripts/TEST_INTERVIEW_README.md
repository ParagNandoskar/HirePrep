# Automated Interview Testing

This script allows you to test the complete interview pipeline including audio/video behavioral analysis **without manual intervention**.

## How It Works

The script:
1. ✅ Generates **synthetic audio data** (PCM float32 sine waves simulating voice)
2. ✅ Generates **synthetic video frames** (RGB image data simulating a face)
3. ✅ Runs a complete interview flow automatically
4. ✅ Tests the Python audio/video analysis services with real data
5. ✅ Provides detailed results including behavioral scores

## Quick Start

### Step 1: Get Your Auth Token

1. Login to the app in your browser
2. Open browser console (F12)
3. Run: `localStorage.getItem("authToken")`
4. Copy the token

### Step 2: Run the Test

```bash
cd backend
node src/scripts/testInterview.js YOUR_AUTH_TOKEN_HERE
```

Or set it in your `.env` file:
```bash
TEST_AUTH_TOKEN=your_token_here
node src/scripts/testInterview.js
```

## What You'll See

```
═══════════════════════════════════════════════════
   Automated Interview Test with Behavioral Analysis
═══════════════════════════════════════════════════

🚀 Initializing interview...
✅ Interview initialized. Session ID: practice_1234567890

📝 Getting question 1...
❓ Question 1: Tell me about yourself and your background...

💬 Submitting answer 1...
   📊 Generated 3 audio chunks and 5 video frames
✅ Answer submitted successfully
   🎯 Behavioral Score: 67

📝 Getting question 2...
❓ Question 2: What interests you about this position?

💬 Submitting answer 2...
   📊 Generated 3 audio chunks and 5 video frames
✅ Answer submitted successfully
   🎯 Behavioral Score: 72

🏁 Completing interview...

✅ Interview completed!

📊 Final Results:
   Overall Score: 75/100
   Content Score: 78/100
   Behavioral Score: 70/100
   Video Score: 68/100
   Audio Score: 72/100
   Recommendation: Recommended

💪 Strengths:
   - Clear communication
   - Good technical knowledge

📈 Areas for Improvement:
   - Provide more specific examples
```

## Configuration

Edit the script to customize:
- `NUM_QUESTIONS`: Number of questions (default: 2 for faster testing)
- Audio duration and quality
- Number of video frames per answer
- Sample answers

## Benefits

✅ **Fast**: Completes in ~10-15 seconds  
✅ **No manual input**: Fully automated  
✅ **Real analysis**: Tests actual Python services  
✅ **Repeatable**: Run as many times as needed  
✅ **Token efficient**: Only 2 questions by default
