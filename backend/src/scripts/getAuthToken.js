#!/usr/bin/env node
/**
 * Helper script to get authentication token for testing
 * 
 * Usage: node src/scripts/getAuthToken.js email password
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function getAuthToken(email, password) {
    try {
        console.log('🔐 Logging in...');

        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        });

        const token = response.data.data.token;

        console.log('\n✅ Login successful!');
        console.log('\n📋 Your auth token:');
        console.log(token);
        console.log('\n💡 To use with the test script:');
        console.log(`node src/scripts/testInterview.js ${token}`);
        console.log('\nOr add to .env file:');
        console.log(`TEST_AUTH_TOKEN=${token}`);

        return token;

    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.message || error.message);
        process.exit(1);
    }
}

// Main execution
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('❌ Error: Email and password required');
    console.log('\nUsage:');
    console.log('  node src/scripts/getAuthToken.js EMAIL PASSWORD');
    console.log('\nExample:');
    console.log('  node src/scripts/getAuthToken.js test@example.com password123');
    process.exit(1);
}

getAuthToken(email, password);
