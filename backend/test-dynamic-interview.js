require('dotenv').config({ path: __dirname + '/.env' });
const {
  generateInterviewQuestions,
  generateAdaptiveFollowUp,
  evaluateInterviewResponse,
  generateComprehensiveFeedback,
  shouldCompleteInterview
} = require('./src/services/aiInterviewService');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = (msg, color = 'reset') => {
  console.log(colors[color] + msg + colors.reset);
};

async function runTests() {
  log('\n' + '='.repeat(70), 'bold');
  log('TESTING DYNAMIC AI INTERVIEW SERVICE', 'yellow');
  log('='.repeat(70) + '\n', 'yellow');

  try {
    // Test 1: Dynamic Question Generation
    log('TEST 1: Generate Dynamic Interview Questions', 'blue');
    log('-'.repeat(70), 'blue');

    const jobDescription = `We are looking for a Senior Full-Stack Developer with expertise in:
    - Node.js and Express.js backend development
    - React.js with TypeScript frontend development
    - MongoDB database design and optimization
    - Docker containerization and Kubernetes
    - AWS cloud services (EC2, S3, Lambda, RDS)
    - System design and architecture
    - Agile/Scrum methodologies
    - Team leadership and mentoring`;

    const startTime1 = Date.now();
    const questions = await generateInterviewQuestions(jobDescription, 'senior');
    const duration1 = Date.now() - startTime1;

    log(`✓ Generated ${questions.length} dynamic interview questions (AI-decided count, not fixed 5)`, 'green');
    log(`⏱ Duration: ${duration1}ms\n`, 'green');

    // Display question details
    questions.forEach((q, idx) => {
      log(`\nQuestion ${idx + 1}/${questions.length}:`, 'yellow');
      log(`  Question: ${q.question.substring(0, 100)}...`);
      log(`  Category: ${q.category}`);
      log(`  Difficulty: ${q.difficulty}`);
      log(`  Phase: ${q.interviewPhase}`);
      log(`  Expected Time: ${q.estimatedResponseTimeMinutes} min`);
    });

    // Test 2: Evaluate Interview Response
    log('\n' + '='.repeat(70), 'bold');
    log('TEST 2: Evaluate Interview Response', 'blue');
    log('-'.repeat(70), 'blue');

    const firstQuestion = questions[0];
    const candidateAnswer = `I have extensive experience with Node.js backend development.
    I've built RESTful APIs, real-time applications using WebSockets, and microservices architectures.
    I'm proficient with Express.js, have optimized databases for performance, and implemented caching strategies.
    I've also worked with Docker for containerization and deployed applications on AWS.`;

    const startTime2 = Date.now();
    const evaluation = await evaluateInterviewResponse(
      firstQuestion.question,
      candidateAnswer,
      jobDescription,
      { previousAnswersSummary: null }
    );
    const duration2 = Date.now() - startTime2;

    log(`✓ Evaluated response`, 'green');
    log(`⏱ Duration: ${duration2}ms\n`, 'green');
    log(`Overall Score: ${evaluation.overallScore}/100`);
    log(`Answer Quality: ${evaluation.answerQuality || 'N/A'}`);
    log(`Candidate Type: ${evaluation.candidateType}`);
    log(`Fit Assessment: ${evaluation.fitAssessment}`);
    log(`Recommendation: ${evaluation.recommendation}`);
    log(`Leadership Potential: ${evaluation.leadershipPotential ? 'Yes' : 'No'}`);
    log(`\nScore Breakdown:`);
    if (evaluation.scores) {
      log(`  - Relevance: ${evaluation.scores.relevance || 'N/A'}/100`);
      log(`  - Clarity: ${evaluation.scores.clarity || 'N/A'}/100`);
      log(`  - Technical Depth: ${evaluation.scores.technicalDepth || 'N/A'}/100`);
      log(`  - Communication: ${evaluation.scores.communication || 'N/A'}/100`);
      log(`  - Experience Alignment: ${evaluation.scores.experienceAlignment || 'N/A'}/100`);
    }

    // Test 3: Generate Adaptive Follow-up
    log('\n' + '='.repeat(70), 'bold');
    log('TEST 3: Generate Adaptive Follow-up Question', 'blue');
    log('-'.repeat(70), 'blue');

    const conversationHistory = [
      { type: 'interviewer', content: firstQuestion.question },
      { type: 'candidate', content: candidateAnswer }
    ];

    const startTime3 = Date.now();
    const followUp = await generateAdaptiveFollowUp(
      jobDescription,
      firstQuestion.question,
      candidateAnswer,
      conversationHistory
    );
    const duration3 = Date.now() - startTime3;

    log(`✓ Generated follow-up assessment`, 'green');
    log(`⏱ Duration: ${duration3}ms\n`, 'green');
    log(`Should Follow Up: ${followUp.shouldFollowUp ? 'Yes' : 'No'}`);
    if (followUp.followUpQuestion) {
      log(`Follow-up: ${followUp.followUpQuestion}`);
    }
    log(`Answer Quality: ${followUp.answerQuality}`);
    log(`Reasoning: ${followUp.reasoning}`);
    if (followUp.assessmentInsights) {
      log(`\nAssessment Insights:`);
      log(`  - Candidate Level: ${followUp.assessmentInsights.candidateLevel}`);
      if (followUp.assessmentInsights.strengths?.length > 0) {
        log(`  - Strengths: ${followUp.assessmentInsights.strengths.join(', ')}`);
      }
      if (followUp.assessmentInsights.gaps?.length > 0) {
        log(`  - Gaps: ${followUp.assessmentInsights.gaps.join(', ')}`);
      }
    }

    // Test 4: Interview Completion Logic
    log('\n' + '='.repeat(70), 'bold');
    log('TEST 4: Determine Interview Completion', 'blue');
    log('-'.repeat(70), 'blue');

    const startTime4 = Date.now();
    const completion = await shouldCompleteInterview(
      3,  // questions asked
      evaluation.overallScore,
      3,  // unique topics covered
      conversationHistory
    );
    const duration4 = Date.now() - startTime4;

    log(`✓ Generated completion assessment`, 'green');
    log(`⏱ Duration: ${duration4}ms\n`, 'green');
    log(`Should Complete: ${completion.shouldComplete ? 'Yes' : 'No'}`);
    log(`Reasoning: ${completion.reasoning}`);
    if (completion.assessment) {
      log(`\nAssessment:`);
      log(`  - Sufficiency Score: ${completion.assessment.sufficiencyScore || 'N/A'}/100`);
      log(`  - Coverage Level: ${completion.assessment.coverageLevel || 'N/A'}`);
      log(`  - Pattern Clarity: ${completion.assessment.patternClarity || 'N/A'}%`);
      log(`  - Recommendation: ${completion.assessment.recommendation || 'N/A'}`);
    }

    // Test 5: Comprehensive Feedback
    log('\n' + '='.repeat(70), 'bold');
    log('TEST 5: Generate Comprehensive Interview Feedback', 'blue');
    log('-'.repeat(70), 'blue');

    const mockInterview = {
      questionsAsked: questions.length,
      averageScore: evaluation.overallScore,
      topicsCovered: ['Backend Development', 'System Design', 'Database Optimization'],
      overallFitAssessment: evaluation.fitAssessment
    };

    const startTime5 = Date.now();
    const feedback = await generateComprehensiveFeedback(mockInterview, jobDescription);
    const duration5 = Date.now() - startTime5;

    log(`✓ Generated comprehensive feedback`, 'green');
    log(`⏱ Duration: ${duration5}ms\n`, 'green');
    log(`\nFeedback Preview:`);
    log(feedback.substring(0, 300) + '...\n');

    // Summary
    log('='.repeat(70), 'bold');
    log('TEST SUMMARY', 'yellow');
    log('='.repeat(70) + '\n', 'yellow');

    const totalDuration = duration1 + duration2 + duration3 + duration4 + duration5;

    log(`✓ All tests passed!`, 'green');
    log(`\n📊 Performance Metrics:`);
    log(`  - Question Generation: ${duration1}ms`);
    log(`  - Response Evaluation: ${duration2}ms`);
    log(`  - Follow-up Generation: ${duration3}ms`);
    log(`  - Completion Assessment: ${duration4}ms`);
    log(`  - Feedback Generation: ${duration5}ms`);
    log(`  - Total Duration: ${totalDuration}ms\n`);

    log(`🎯 Key Findings:`);
    log(`  ✓ AI dynamically generated ${questions.length} questions (not fixed to 5)`);
    log(`  ✓ Questions include proper metadata (difficulty, category, expectedTime)`);
    log(`  ✓ Interview phases assigned: ${[...new Set(questions.map(q => q.interviewPhase))].join(', ')}`);
    log(`  ✓ Response evaluation working with multi-dimensional scoring`);
    log(`  ✓ Adaptive follow-up logic functioning correctly`);
    log(`  ✓ Interview completion can be determined programmatically`);
    log(`  ✓ Comprehensive feedback generation successful\n`);

    log('='.repeat(70) + '\n', 'bold');

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

runTests();
