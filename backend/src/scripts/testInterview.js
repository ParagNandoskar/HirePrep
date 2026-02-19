#!/usr/bin/env node
/**
 * Automated Interview Test Script
 * 
 * This script simulates a complete AI voice interview with synthetic audio/video data
 * to test the behavioral analysis pipeline without manual intervention.
 * 
 * Usage: node src/scripts/testInterview.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const NUM_QUESTIONS = 2; // Reduced for faster testing

// Generate synthetic base64 audio data (simulates PCM float32 audio)
function generateSyntheticAudio(durationSeconds = 3) {
    const sampleRate = 16000;
    const numSamples = sampleRate * durationSeconds;

    // Create a Float32Array with synthetic audio (sine wave + noise)
    const audioData = new Float32Array(numSamples);
    const frequency = 200; // Hz (typical voice frequency)

    for (let i = 0; i < numSamples; i++) {
        // Sine wave (voice simulation)
        const sine = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        // Add some noise for realism
        const noise = (Math.random() - 0.5) * 0.1;
        audioData[i] = sine + noise;
    }

    // Convert to Buffer and then base64
    const buffer = Buffer.from(audioData.buffer);
    return buffer.toString('base64');
}

// Generate synthetic base64 video frame (simulates a face image)
function generateSyntheticVideoFrame() {
    // Create a simple 640x480 RGB image (simulating a video frame)
    const width = 640;
    const height = 480;
    const channels = 3; // RGB

    // Create random pixel data (in reality, this would be a face)
    const imageData = Buffer.alloc(width * height * channels);

    // Fill with semi-random data that looks like a face (centered bright region)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * channels;

            // Create a bright region in the center (simulating a face)
            const centerX = width / 2;
            const centerY = height / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const brightness = Math.max(0, 255 - distance / 2);

            // RGB values (skin tone simulation)
            imageData[index] = Math.min(255, brightness + 100);     // R
            imageData[index + 1] = Math.min(255, brightness + 80);  // G
            imageData[index + 2] = Math.min(255, brightness + 60);  // B
        }
    }

    return imageData.toString('base64');
}

// Sample answers for testing
const SAMPLE_ANSWERS = [
    "I'm very interested in this position because it aligns perfectly with my skills in JavaScript and React. I have been working on web development projects for the past two years and I'm excited about the opportunity to contribute to your team.",
    "I believe my experience with Node.js and SQL databases makes me a strong candidate. I've built several full-stack applications and I'm comfortable working with both frontend and backend technologies.",
    "One of my key strengths is problem-solving. I enjoy tackling complex challenges and finding efficient solutions. I'm also a quick learner and adapt well to new technologies."
];

class InterviewTester {
    constructor(authToken) {
        this.authToken = authToken;
        this.sessionId = null;
        this.questionCount = 0;
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`❌ Request failed: ${endpoint}`, error.response?.data || error.message);
            throw error;
        }
    }

    async initializeInterview(jobId = 'practice') {
        console.log('🚀 Initializing interview...');
        const result = await this.makeRequest('/gemini-voice/initialize', 'POST', {
            jobId,
            candidateName: 'Test User'
        });

        this.sessionId = result.sessionId;
        console.log(`✅ Interview initialized. Session ID: ${this.sessionId}`);
        return result;
    }

    async getNextQuestion() {
        console.log(`\n📝 Getting question ${this.questionCount + 1}...`);
        const result = await this.makeRequest('/gemini-voice/next-question', 'POST', {
            sessionId: this.sessionId
        });

        this.questionCount++;
        console.log(`❓ Question ${this.questionCount}: ${result.question}`);
        return result;
    }

    async submitAnswer(answerText, questionNumber) {
        console.log(`\n💬 Submitting answer ${questionNumber}...`);

        // Generate synthetic audio/video data
        const audioChunks = [];
        const videoFrames = [];

        // Generate 3 audio chunks (simulating 3 seconds of speech)
        for (let i = 0; i < 3; i++) {
            audioChunks.push(generateSyntheticAudio(1));
        }

        // Generate 5 video frames (simulating captured frames during answer)
        for (let i = 0; i < 5; i++) {
            videoFrames.push(generateSyntheticVideoFrame());
        }

        console.log(`   📊 Generated ${audioChunks.length} audio chunks and ${videoFrames.length} video frames`);

        const result = await this.makeRequest('/gemini-voice/submit-answer', 'POST', {
            sessionId: this.sessionId,
            answerText,
            audioChunks,
            videoFrames,
            questionNumber
        });

        console.log(`✅ Answer submitted successfully`);
        if (result.behavioralData) {
            console.log(`   🎯 Behavioral Score: ${result.behavioralData.overallBehavioralScore || 'N/A'}`);
            console.log(`   📈 Detailed Metrics:`, JSON.stringify(result.behavioralData.detailedMetrics, null, 2));
            if (result.behavioralData.rawAnalysis) {
                console.log(`   🧠 Raw ML Analysis:`, JSON.stringify(result.behavioralData.rawAnalysis, null, 2));
            }
        }

        return result;
    }

    async completeInterview(applicationId = null) {
        console.log('\n🏁 Completing interview...');
        const result = await this.makeRequest('/gemini-voice/complete', 'POST', {
            sessionId: this.sessionId,
            applicationId
        });

        console.log('\n✅ Interview completed!');
        console.log('\n📊 Final Results:');
        console.log(`   Overall Score: ${result.overallScore}/100`);
        console.log(`   Content Score: ${result.contentScore}/100`);
        console.log(`   Behavioral Score: ${result.behavioralScore}/100`);
        console.log(`   Video Score: ${result.videoScore}/100`);
        console.log(`   Audio Score: ${result.audioScore}/100`);
        console.log(`   Recommendation: ${result.recommendation}`);

        if (result.strengths && result.strengths.length > 0) {
            console.log('\n💪 Strengths:');
            result.strengths.forEach(s => console.log(`   - ${s}`));
        }

        if (result.improvements && result.improvements.length > 0) {
            console.log('\n📈 Areas for Improvement:');
            result.improvements.forEach(i => console.log(`   - ${i}`));
        }

        return result;
    }

    async runFullInterview(jobId = 'practice') {
        try {
            console.log('🎬 Starting automated interview test...\n');

            // Step 1: Initialize
            await this.initializeInterview(jobId);

            // Step 2: Answer questions
            for (let i = 0; i < NUM_QUESTIONS; i++) {
                // Get question
                await this.getNextQuestion();

                // Wait a bit (simulate thinking time)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Submit answer with synthetic data
                const answer = SAMPLE_ANSWERS[i % SAMPLE_ANSWERS.length];
                await this.submitAnswer(answer, i + 1);

                // Wait a bit before next question
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Step 3: Complete interview
            const finalResults = await this.completeInterview();

            console.log('\n✨ Test completed successfully!');
            return finalResults;

        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            throw error;
        }
    }
}

// Main execution
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   Automated Interview Test with Behavioral Analysis');
    console.log('═══════════════════════════════════════════════════\n');

    // Check if auth token is provided
    const authToken = process.env.TEST_AUTH_TOKEN || process.argv[2];

    if (!authToken) {
        console.error('❌ Error: Authentication token required');
        console.log('\nUsage:');
        console.log('  1. Set TEST_AUTH_TOKEN in .env file, OR');
        console.log('  2. Run: node src/scripts/testInterview.js YOUR_AUTH_TOKEN');
        console.log('\nTo get your auth token:');
        console.log('  1. Login to the app');
        console.log('  2. Open browser console');
        console.log('  3. Run: localStorage.getItem("authToken")');
        process.exit(1);
    }

    const tester = new InterviewTester(authToken);

    try {
        await tester.runFullInterview('practice');
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { InterviewTester, generateSyntheticAudio, generateSyntheticVideoFrame };
