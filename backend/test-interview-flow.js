/**
 * API Interview Flow Test Script
 * Tests the complete conversational mock interview system through API endpoints
 * - Calls startInterview API to get first question
 * - Generates answers using Grok AI
 * - Submits answers via submitAnswer API
 * - Logs all questions, answers, and evaluations
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { openai, GROK_MODEL_NAME } = require('./src/config/openai');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Test data storage
const interviewLog = {
  startTime: new Date(),
  scenarioType: null,
  candidateProfile: null,
  candidateSkills: [],
  questionsAsked: [],
  answersProvided: [],
  evaluations: [],
  followUps: [],
  errors: [],
  completionReason: null,
  averageScore: 0,
  totalQuestionsGenerated: 0,
  totalDuration: 0
};

const log = (msg, color = 'reset', indent = 0) => {
  const prefix = '  '.repeat(indent);
  console.log(colors[color] + prefix + msg + colors.reset);
};

const logSection = (title) => {
  console.log('\n' + colors.bold + colors.blue + '═'.repeat(90) + colors.reset);
  console.log(colors.bold + colors.yellow + title.padEnd(90) + colors.reset);
  console.log(colors.bold + colors.blue + '═'.repeat(90) + colors.reset);
};

const logQuestion = (num, question, category, difficulty) => {
  log(`\n📋 QUESTION #${num}`, 'magenta', 0);
  log(`Category: ${category} | Difficulty: ${difficulty}`, 'dim', 1);
  log(`"${question}"`, 'blue', 1);
};

const logAnswer = (answer) => {
  log(`\n💬 GENERATED ANSWER`, 'green', 0);
  log(`"${answer.substring(0, 180)}${answer.length > 180 ? '...' : ''}"`, 'green', 1);
};

const logEvaluation = (evaluation) => {
  log(`\n📊 AI EVALUATION`, 'yellow', 0);
  log(`Score: ${evaluation.overallScore}/100 | Fit: ${evaluation.fitAssessment} | Rec: ${evaluation.recommendation}`, 'yellow', 1);
  if (evaluation.scores) {
    const r = evaluation.scores.relevance || 0;
    const c = evaluation.scores.clarity || 0;
    const t = evaluation.scores.technicalDepth || 0;
    const co = evaluation.scores.communication || 0;
    const e = evaluation.scores.experienceAlignment || 0;
    log(`Breakdown: Rel:${r} Clr:${c} Tech:${t} Com:${co} Exp:${e}`, 'dim', 1);
  }
};

async function generateAnswer(question, jobContext, previousAnswers = [], candidateSkills = []) {
  try {
    const conversationContext = previousAnswers.slice(-2).map((qa, idx) =>
      `Q: ${qa.question.substring(0, 60)}...\nA: ${qa.answer.substring(0, 60)}...`
    ).join('\n');

    const skillsContext = candidateSkills.length > 0
      ? `\nYour skills: ${candidateSkills.join(', ')}`
      : '';

    const prompt = `You are a mid-level professional (not expert) interviewing for this role:
${jobContext.substring(0, 200)}
${skillsContext}

${conversationContext ? `\nRecent conversation:\n${conversationContext}\n` : ''}

Answer this question naturally as a MEDIUM-LEVEL candidate would:
"${question}"

IMPORTANT - Answer like a real human with medium experience level:
- Keep it 2-3 sentences, conversational tone
- Show competence but NOT expertise in everything
- Include minor hesitations or qualifiers like "I believe", "In my experience", "I've worked with"
- Don't list every possible technology - focus on 2-3 examples
- Be specific but not overly detailed
- If asked about something outside your skills, say "I have limited experience with that but..."
- Sound natural, not like a textbook answer

Provide only the answer, no preamble.`;

    const response = await openai.chat.completions.create({
      model: GROK_MODEL_NAME,
      max_tokens: 500,
      temperature: 0.8, // Add some variability for more human-like responses
      messages: [{ role: 'user', content: prompt }]
    });

    return response.choices[0].message.content.trim().substring(0, 800);
  } catch (error) {
    console.error('Answer generation error:', error.message);
    return 'I have worked with this area in a few projects. While I have some experience, I would say I am still learning and improving in this domain.';
  }
}

async function runInterviewTest(scenarioType = 'good') {
  const isGoodPerformer = scenarioType === 'good';
  const scenarioTitle = isGoodPerformer ? '✅ GOOD PERFORMER' : '❌ BAD PERFORMER';

  logSection(`🎯 INTERACTIVE MOCK INTERVIEW TEST FLOW - ${scenarioTitle}`);

  try {
    const aiInterviewService = require('./src/services/aiInterviewService');

    // Mock candidate resume data - two scenarios
    let candidateResume;

    if (isGoodPerformer) {
      // GOOD PERFORMER - Strong candidate
      candidateResume = {
        skills: [
          'Node.js',
          'React',
          'JavaScript',
          'Express',
          'MongoDB',
          'Typescript',
          'HTML',
          'CSS',
          'Bootstrap',
          'MySQL',
          'Python',
          'Redis'
        ],
        experience: [
          {
            title: 'Full-Stack Developer',
            company: 'Tech Solutions Inc',
            duration: '2 years',
            description: 'Built web applications using MERN stack and Python'
          },
          {
            title: 'Junior Developer',
            company: 'StartupXYZ',
            duration: '1 year',
            description: 'Developed frontend components with React and TypeScript'
          }
        ],
        education: 'Bachelor of Computer Science',
        yearsOfExperience: 3
      };
    } else {
      // BAD PERFORMER - Weak candidate
      candidateResume = {
        skills: [
          'HTML',
          'CSS',
          'Basic JavaScript'
        ],
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
    }

    // Store candidate profile in log
    interviewLog.candidateProfile = candidateResume;
    interviewLog.candidateSkills = candidateResume.skills;
    interviewLog.scenarioType = scenarioType;

    // Job description - Same role for both to show stark differences
    const jobDescription = `Full-Stack Developer Position

Role Requirements:
- Frontend: React, TypeScript, HTML, CSS, Bootstrap
- Backend: Node.js, Express, Python
- Databases: MongoDB, MySQL, Redis
- JavaScript/TypeScript proficiency
- RESTful API design and implementation
- Responsive web design
- Database optimization and caching strategies
- Mid-level experience level (minimum 2+ years)

Looking for someone with practical experience across the full stack, comfortable with both frontend and backend technologies, and able to work with multiple programming languages and databases.`;

    logSection('📝 PHASE 1: GENERATING INTERVIEW QUESTIONS');

    log('📋 Candidate Profile:', 'cyan', 1);
    log(`Skills: ${candidateResume.skills.join(', ')}`, 'dim', 2);
    log(`Experience: ${candidateResume.yearsOfExperience} years`, 'dim', 2);
    log(`Domain: Full-Stack Development (Frontend + Backend + Databases)`, 'dim', 2);

    log('\nGenerating AI-decided interview questions based on candidate profile...', 'dim', 1);
    const questions = await aiInterviewService.generateInterviewQuestions(jobDescription, 'mid-level');

    log(`✓ Generated ${questions.length} questions tailored to candidate's skills`, 'green', 1);
    interviewLog.totalQuestionsGenerated = questions.length;
    interviewLog.candidateSkills = candidateResume.skills;

    log('\n📚 Question Categories Generated:', 'dim', 1);
    const categories = [...new Set(questions.map(q => q.category))];
    categories.forEach(cat => {
      const count = questions.filter(q => q.category === cat).length;
      log(`${cat}: ${count} questions`, 'dim', 2);
    });

    logSection('🚀 PHASE 2: SIMULATING INTERVIEW FLOW');

    let questionIndex = 0;
    let questionsAsked = 0;
    let interviewComplete = false;
    let scores = [];
    const answerHistory = [];

    while (!interviewComplete && questionIndex < questions.length && questionsAsked < 10) {
      const currentQuestion = questions[questionIndex];

      // QUESTION
      questionsAsked += 1;
      logQuestion(questionsAsked, currentQuestion.question, currentQuestion.category, currentQuestion.difficulty);

      interviewLog.questionsAsked.push({
        number: questionsAsked,
        question: currentQuestion.question,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty
      });

      // GENERATE ANSWER
      log(`\n⏳ Generating answer via Grok LLM...`, 'dim', 1);
      const answer = await generateAnswer(currentQuestion.question, jobDescription, answerHistory, candidateResume.skills);
      logAnswer(answer);

      interviewLog.answersProvided.push({
        number: questionsAsked,
        answer: answer
      });

      answerHistory.push({
        question: currentQuestion.question,
        answer: answer
      });

      // EVALUATE ANSWER
      log(`\n⏳ Evaluating response with AI...`, 'dim', 1);
      const evaluation = await aiInterviewService.evaluateInterviewResponse(
        currentQuestion.question,
        answer,
        jobDescription,
        { previousAnswersSummary: null }
      );

      logEvaluation(evaluation);
      scores.push(evaluation.overallScore || 0);

      interviewLog.evaluations.push({
        questionNumber: questionsAsked,
        overallScore: evaluation.overallScore,
        fitAssessment: evaluation.fitAssessment,
        recommendation: evaluation.recommendation,
        categorizedScores: evaluation.scores
      });

      // ADAPTIVE FOLLOW-UP OR NEXT QUESTION
      log(`\n⏳ Analyzing response quality & deciding next action...`, 'dim', 1);
      const followUpResponse = await aiInterviewService.generateAdaptiveFollowUp(
        jobDescription,
        currentQuestion.question,
        answer,
        answerHistory.map(qa => ({
          type: 'qa',
          content: `Q: ${qa.question.substring(0, 100)}\nA: ${qa.answer.substring(0, 100)}`
        }))
      );

      if (followUpResponse.shouldFollowUp && followUpResponse.followUpQuestion) {
        // FOLLOW-UP QUESTION
        log(`\n🔄 FOLLOW-UP QUESTION GENERATED`, 'magenta', 0);
        log(`"${followUpResponse.followUpQuestion}"`, 'magenta', 1);
        log(`Reasoning: ${followUpResponse.reasoning}`, 'dim', 1);

        interviewLog.followUps.push({
          mainQuestion: currentQuestion.question,
          followUpQuestion: followUpResponse.followUpQuestion,
          reasoning: followUpResponse.reasoning
        });

        // Answer follow-up
        log(`\n⏳ Generating answer to follow-up...`, 'dim', 1);
        const followUpAnswer = await generateAnswer(followUpResponse.followUpQuestion, jobDescription, answerHistory, candidateResume.skills);
        logAnswer(followUpAnswer);

        answerHistory.push({
          question: followUpResponse.followUpQuestion,
          answer: followUpAnswer
        });

        // Evaluate follow-up
        log(`\n⏳ Evaluating follow-up response...`, 'dim', 1);
        const followUpEval = await aiInterviewService.evaluateInterviewResponse(
          followUpResponse.followUpQuestion,
          followUpAnswer,
          jobDescription,
          { previousAnswersSummary: null }
        );

        logEvaluation(followUpEval);
        scores.push(followUpEval.overallScore || 0);

        // After follow-up, move to next question
        questionIndex += 1;
      } else {
        // CHECK COMPLETION
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;
        const topicsCovered = [...new Set(interviewLog.questionsAsked.map(q => q.category))].length;

        log(`\n⏳ Checking interview completion (${questionsAsked} questions, avg: ${avgScore}/100)...`, 'dim', 1);

        const completionCheck = await aiInterviewService.shouldCompleteInterview(
          questionsAsked,
          avgScore,
          topicsCovered,
          answerHistory
        );

        if (completionCheck.shouldComplete) {
          // INTERVIEW COMPLETE
          log(`\n✅ INTERVIEW COMPLETED`, 'green', 0);
          log(`Reason: ${completionCheck.reasoning}`, 'green', 1);

          interviewComplete = true;
          interviewLog.completionReason = completionCheck.reasoning;

          // Generate comprehensive feedback
          log(`\n⏳ Generating comprehensive interview feedback...`, 'dim', 1);
          const feedback = await aiInterviewService.generateComprehensiveFeedback(
            {
              questionsAsked: questionsAsked,
              averageScore: avgScore,
              topicsCovered: [...new Set(interviewLog.questionsAsked.map(q => q.category))],
              overallFitAssessment: avgScore >= 75 ? 'strong' : avgScore >= 60 ? 'good' : 'concerning'
            },
            jobDescription
          );

          log(`\n📝 COMPREHENSIVE FEEDBACK FROM AI`, 'magenta', 0);
          log(feedback.substring(0, 500) + (feedback.length > 500 ? '...' : ''), 'magenta', 1);
          interviewLog.comprehensiveFeedback = feedback;
          interviewLog.averageScore = avgScore;
        } else {
          // NEXT QUESTION
          questionIndex += 1;
          if (questionIndex < questions.length) {
            log(`\n➡️ MOVING TO NEXT QUESTION`, 'cyan', 0);
            log(`Question ${questionsAsked + 1}/${questions.length}`, 'cyan', 1);
          }
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate final average score if not already set
    if (interviewLog.averageScore === 0 && interviewLog.evaluations.length > 0) {
      const finalAvgScore = Math.round(
        interviewLog.evaluations.reduce((sum, e) => sum + (e.overallScore || 0), 0) /
        interviewLog.evaluations.length
      );
      interviewLog.averageScore = finalAvgScore;
    }

    logSection('📊 INTERVIEW TEST COMPLETE - SUMMARY');

    // Statistics
    log('\n📈 INTERVIEW STATISTICS', 'bold', 0);
    log(`Total Questions Generated (by AI): ${interviewLog.totalQuestionsGenerated}`, 'cyan', 1);
    log(`Questions Asked: ${interviewLog.questionsAsked.length}`, 'cyan', 1);
    log(`Follow-ups Used: ${interviewLog.followUps.length}`, 'cyan', 1);
    log(`Average Score: ${interviewLog.averageScore}/100`, 'cyan', 1);
    log(`Interview Status: ${interviewComplete ? '✅ Complete' : '⏸️ In Progress'}`, 'cyan', 1);

    // Question Distribution
    logSection('❓ QUESTIONS & ANSWERS LOG');

    interviewLog.questionsAsked.forEach((q, idx) => {
      const answer = interviewLog.answersProvided[idx];
      const evaluation = interviewLog.evaluations[idx];

      log(`\n[${'Q'.padEnd(3)}${idx + 1}] ${q.category.toUpperCase().padEnd(15)} | ${q.difficulty.toUpperCase()}`, 'blue');
      log(`Question: ${q.question}`, 'blue', 1);
      log(`Answer:   ${answer.answer}`, 'green', 1);
      log(`Score:    ${evaluation.overallScore}/100 | Fit: ${evaluation.fitAssessment} | Rec: ${evaluation.recommendation}`, 'yellow', 1);
    });

    // Follow-ups
    if (interviewLog.followUps.length > 0) {
      logSection('🔄 FOLLOW-UP QUESTIONS LOG');
      interviewLog.followUps.forEach((fu, idx) => {
        log(`\n[FU${idx + 1}] ${fu.followUpQuestion}`, 'magenta');
        log(`Main Q: ${fu.mainQuestion.substring(0, 100)}...`, 'dim', 1);
        log(`Reason: ${fu.reasoning}`, 'dim', 1);
      });
    }

    // Quality Analysis
    logSection('🔍 INTERVIEW QUALITY ANALYSIS');

    const scoreDistribution = {
      excellent: interviewLog.evaluations.filter(e => e.overallScore >= 90).length,
      good: interviewLog.evaluations.filter(e => e.overallScore >= 75 && e.overallScore < 90).length,
      average: interviewLog.evaluations.filter(e => e.overallScore >= 60 && e.overallScore < 75).length,
      needsWork: interviewLog.evaluations.filter(e => e.overallScore < 60).length
    };

    const recommendations = {
      'strong-hire': interviewLog.evaluations.filter(e => e.recommendation === 'strong-hire').length,
      'hire': interviewLog.evaluations.filter(e => e.recommendation === 'hire').length,
      'maybe': interviewLog.evaluations.filter(e => e.recommendation === 'maybe').length,
      'no-hire': interviewLog.evaluations.filter(e => e.recommendation === 'no-hire').length
    };

    log('\n✨ ANSWER QUALITY DISTRIBUTION:', 'cyan', 0);
    log(`Excellent (90-100): ${scoreDistribution.excellent} answers`, 'green', 1);
    log(`Good (75-89):       ${scoreDistribution.good} answers`, 'green', 1);
    log(`Average (60-74):    ${scoreDistribution.average} answers`, 'yellow', 1);
    log(`Needs Work (<60):   ${scoreDistribution.needsWork} answers`, 'red', 1);

    log('\n🎯 HIRING RECOMMENDATIONS:', 'cyan', 0);
    log(`Strong Hire: ${recommendations['strong-hire']} answers`, 'green', 1);
    log(`Hire:        ${recommendations.hire} answers`, 'green', 1);
    log(`Maybe:       ${recommendations.maybe} answers`, 'yellow', 1);
    log(`No Hire:     ${recommendations['no-hire']} answers`, 'red', 1);

    log('\n❓ INTERVIEW APPROPRIATENESS ANALYSIS:', 'cyan', 0);
    const followUpRate = (interviewLog.followUps.length / interviewLog.questionsAsked.length * 100).toFixed(1);
    log(`Follow-up Rate: ${followUpRate}%`, 'cyan', 1);

    if (followUpRate > 50) {
      log(`✓ High follow-up rate indicates thorough probing of responses`, 'green', 2);
    } else if (followUpRate > 20) {
      log(`✓ Moderate follow-up rate shows selective deep-dive questioning`, 'cyan', 2);
    } else {
      log(`✓ Low follow-up rate suggests questions are comprehensive`, 'yellow', 2);
    }

    const avgDifficulty = {
      easy: interviewLog.questionsAsked.filter(q => q.difficulty === 'easy').length,
      medium: interviewLog.questionsAsked.filter(q => q.difficulty === 'medium').length,
      hard: interviewLog.questionsAsked.filter(q => q.difficulty === 'hard').length
    };

    log(`\n📊 Difficulty Distribution:`, 'cyan', 1);
    log(`Easy: ${avgDifficulty.easy} | Medium: ${avgDifficulty.medium} | Hard: ${avgDifficulty.hard}`, 'cyan', 2);

    // Save test log
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
    const logFile = `interview-flow-test-${scenarioType}-${timestamp}.json`;

    fs.writeFileSync(logFile, JSON.stringify(interviewLog, null, 2));
    log(`\n✅ Full test log saved: ${logFile}`, 'green');

    interviewLog.totalDuration = (new Date() - interviewLog.startTime) / 1000;
    log(`\n⏱️  Total Duration: ${interviewLog.totalDuration.toFixed(2)} seconds`, 'bold');
    log(`✨ TEST COMPLETED SUCCESSFULLY!\n`, 'green', 0);

    return interviewLog;

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    interviewLog.errors.push({ error: error.message, timestamp: new Date().toISOString() });
    console.error(error);
    return null;
  }
}

// Comparative Analysis Function
async function compareScenarios(goodLog, badLog) {
  logSection('📊 COMPARATIVE ANALYSIS: GOOD vs BAD PERFORMER');

  const comparison = {
    questionsAsked: {
      good: goodLog.questionsAsked.length,
      bad: badLog.questionsAsked.length,
      diff: badLog.questionsAsked.length - goodLog.questionsAsked.length
    },
    averageScore: {
      good: goodLog.averageScore,
      bad: badLog.averageScore,
      diff: badLog.averageScore - goodLog.averageScore
    },
    followUps: {
      good: goodLog.followUps.length,
      bad: badLog.followUps.length,
      diff: badLog.followUps.length - goodLog.followUps.length
    }
  };

  log(`\n📈 QUESTIONS ASKED:`, 'cyan', 0);
  log(`Good Performer: ${comparison.questionsAsked.good} questions`, 'green', 1);
  log(`Bad Performer:  ${comparison.questionsAsked.bad} questions`, 'red', 1);
  log(`Difference:     ${comparison.questionsAsked.diff > 0 ? '+' : ''}${comparison.questionsAsked.diff} (${comparison.questionsAsked.diff > 0 ? 'MORE' : 'FEWER'})`, 'yellow', 1);

  log(`\n🎯 AVERAGE SCORE:`, 'cyan', 0);
  log(`Good Performer: ${comparison.averageScore.good}/100`, 'green', 1);
  log(`Bad Performer:  ${comparison.averageScore.bad}/100`, 'red', 1);
  log(`Difference:     ${comparison.averageScore.diff > 0 ? '+' : ''}${comparison.averageScore.diff.toFixed(1)} (${Math.abs(comparison.averageScore.diff).toFixed(1)} point gap)`, 'yellow', 1);

  log(`\n🔄 FOLLOW-UP QUESTIONS:`, 'cyan', 0);
  log(`Good Performer: ${comparison.followUps.good} follow-ups`, 'green', 1);
  log(`Bad Performer:  ${comparison.followUps.bad} follow-ups`, 'red', 1);
  log(`Difference:     ${comparison.followUps.diff > 0 ? '+' : ''}${comparison.followUps.diff} (${comparison.followUps.diff > 0 ? 'MORE' : 'FEWER'})`, 'yellow', 1);

  // Score Distribution Comparison
  const goodScoreDistribution = {
    excellent: goodLog.evaluations.filter(e => e.overallScore >= 90).length,
    good: goodLog.evaluations.filter(e => e.overallScore >= 75 && e.overallScore < 90).length,
    average: goodLog.evaluations.filter(e => e.overallScore >= 60 && e.overallScore < 75).length,
    needsWork: goodLog.evaluations.filter(e => e.overallScore < 60).length
  };

  const badScoreDistribution = {
    excellent: badLog.evaluations.filter(e => e.overallScore >= 90).length,
    good: badLog.evaluations.filter(e => e.overallScore >= 75 && e.overallScore < 90).length,
    average: badLog.evaluations.filter(e => e.overallScore >= 60 && e.overallScore < 75).length,
    needsWork: badLog.evaluations.filter(e => e.overallScore < 60).length
  };

  log(`\n💯 SCORE DISTRIBUTION COMPARISON:`, 'cyan', 0);
  log(`\nEXCELLENT (90-100):`, 'cyan', 1);
  log(`Good:  ${goodScoreDistribution.excellent} answers`, 'green', 2);
  log(`Bad:   ${badScoreDistribution.excellent} answers`, 'red', 2);

  log(`\nGOOD (75-89):`, 'cyan', 1);
  log(`Good:  ${goodScoreDistribution.good} answers`, 'green', 2);
  log(`Bad:   ${badScoreDistribution.good} answers`, 'red', 2);

  log(`\nAVERAGE (60-74):`, 'cyan', 1);
  log(`Good:  ${goodScoreDistribution.average} answers`, 'yellow', 2);
  log(`Bad:   ${badScoreDistribution.average} answers`, 'red', 2);

  log(`\nNEEDS WORK (<60):`, 'cyan', 1);
  log(`Good:  ${goodScoreDistribution.needsWork} answers`, 'green', 2);
  log(`Bad:   ${badScoreDistribution.needsWork} answers`, 'red', 2);

  // Recommendation Comparison
  const goodRecs = {
    'strong-hire': goodLog.evaluations.filter(e => e.recommendation === 'strong-hire').length,
    'hire': goodLog.evaluations.filter(e => e.recommendation === 'hire').length,
    'maybe': goodLog.evaluations.filter(e => e.recommendation === 'maybe').length,
    'no-hire': goodLog.evaluations.filter(e => e.recommendation === 'no-hire').length
  };

  const badRecs = {
    'strong-hire': badLog.evaluations.filter(e => e.recommendation === 'strong-hire').length,
    'hire': badLog.evaluations.filter(e => e.recommendation === 'hire').length,
    'maybe': badLog.evaluations.filter(e => e.recommendation === 'maybe').length,
    'no-hire': badLog.evaluations.filter(e => e.recommendation === 'no-hire').length
  };

  log(`\n🎯 HIRING RECOMMENDATION COMPARISON:`, 'cyan', 0);
  log(`\nSTRONG HIRE:`, 'cyan', 1);
  log(`Good:  ${goodRecs['strong-hire']} answers`, 'green', 2);
  log(`Bad:   ${badRecs['strong-hire']} answers`, 'red', 2);

  log(`\nHIRE:`, 'cyan', 1);
  log(`Good:  ${goodRecs.hire} answers`, 'green', 2);
  log(`Bad:   ${badRecs.hire} answers`, 'red', 2);

  log(`\nMAYBE:`, 'cyan', 1);
  log(`Good:  ${goodRecs.maybe} answers`, 'yellow', 2);
  log(`Bad:   ${badRecs.maybe} answers`, 'red', 2);

  log(`\nNO-HIRE:`, 'cyan', 1);
  log(`Good:  ${goodRecs['no-hire']} answers`, 'green', 2);
  log(`Bad:   ${badRecs['no-hire']} answers`, 'red', 2);

  // Interview Completion
  log(`\n✅ INTERVIEW COMPLETION:`, 'cyan', 0);
  log(`Good Performer Reason: ${goodLog.completionReason}`, 'green', 1);
  log(`Bad Performer Reason:  ${badLog.completionReason}`, 'red', 1);

  // Key Insights
  log(`\n🔍 KEY INSIGHTS:`, 'cyan', 0);

  if (comparison.averageScore.diff < -20) {
    log(`✓ STARK QUALITY DIFFERENCE: Bad performer scored ${Math.abs(comparison.averageScore.diff).toFixed(1)} points lower`, 'red', 1);
  }

  if (comparison.followUps.diff > 2) {
    log(`✓ SYSTEM ADAPTED: More follow-ups for bad performer suggests AI detected weaker answers`, 'yellow', 1);
  } else if (comparison.followUps.diff < -2) {
    log(`✓ SYSTEM ADAPTED: Fewer follow-ups for bad performer (answers too weak to probe)`, 'yellow', 1);
  }

  if (badRecs['no-hire'] > goodRecs['no-hire']) {
    log(`✓ RECOMMENDATION DIFFERENCE: System is appropriately rejecting bad performer`, 'green', 1);
  }

  log(`\n✨ COMPARISON ANALYSIS COMPLETE!\n`, 'green', 0);
}

// Run both scenarios and compare
async function runAllTests() {
  log('🚀 STARTING DUAL-SCENARIO INTERVIEW TEST SUITE\n', 'bold');

  // Run good performer scenario
  const goodLog = await runInterviewTest('good');

  // Reset log for bad performer
  interviewLog.startTime = new Date();
  interviewLog.candidateProfile = null;
  interviewLog.candidateSkills = [];
  interviewLog.questionsAsked = [];
  interviewLog.answersProvided = [];
  interviewLog.evaluations = [];
  interviewLog.followUps = [];
  interviewLog.errors = [];
  interviewLog.completionReason = null;
  interviewLog.averageScore = 0;
  interviewLog.totalDuration = 0;
  interviewLog.totalQuestionsGenerated = 0;
  interviewLog.scenarioType = null;

  // Rate limiting between tests
  log('⏳ Waiting 2 seconds before bad performer test...', 'dim');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Run bad performer scenario
  const badLog = await runInterviewTest('bad');

  // Compare results
  if (goodLog && badLog) {
    await compareScenarios(goodLog, badLog);
  }
}

// Run test
runAllTests();
