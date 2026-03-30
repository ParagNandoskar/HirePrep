/**
 * MongoDB Index Definitions
 * 
 * This file defines all indexes needed for optimal query performance.
 * Indexes are created on application startup to ensure they exist.
 * 
 * Performance Impact:
 * - Dramatically speeds up queries on indexed fields
 * - Improves sorting and filtering operations
 * - Reduces database scanning time
 * 
 * Trade-offs:
 * - Uses additional storage space
 * - Slightly slower write operations (index updates required)
 * - Balances read speed vs write performance
 */

const mongoose = require('mongoose');

/**
 * Create all indexes for the application
 * Call this function after database connection
 */
async function createIndexes() {
  try {
    console.log('📊 Creating MongoDB indexes for optimal performance...');

    // Get all models from mongoose
    const models = mongoose.modelNames();
    let indexCount = 0;

    for (const modelName of models) {
      const model = mongoose.model(modelName);
      
      try {
        await model.collection.createIndex({ dummy: 1 });  // Dummy index to ensure collection exists
        await model.syncIndexes();  // Sync all defined indexes
        const indexes = await model.collection.getIndexes();
        indexCount += Object.keys(indexes).length - 1;  // Subtract the default _id index
        console.log(`  ✓ ${modelName}: ${Object.keys(indexes).length - 1} indexes`);
      } catch (err) {
        console.warn(`  ⚠️ Could not sync indexes for ${modelName}:`, err.message);
      }
    }

    console.log(`✅ Indexes ready. Total indexes: ${indexCount}`);
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
}

/**
 * Index Definitions by Collection
 * Add these to your model schemas using schema.index()
 */

const indexDefinitions = {
  /**
   * User Collection Indexes
   * Common queries: findByEmail, findByRole, findById
   */
  User: [
    { email: 1 },                    // CRITICAL: Used for login (findOne by email)
    { role: 1 },                     // Filtering users by role
    { isVerified: 1 },               // Finding verified users
    { createdAt: -1 },               // Sorting users by creation date
    { email: 1, role: 1 },           // Compound index for role-based email lookup
  ],

  /**
   * Job Collection Indexes
   * Common queries: findByCompanyId, findByStatus, search by title
   */
  Job: [
    { companyId: 1 },               // CRITICAL: Listing company's jobs
    { status: 1 },                  // Finding active/archived jobs
    { createdAt: -1 },              // Sorting jobs by creation date
    { title: 'text', description: 'text' },  // Text search on job title and description
    { companyId: 1, status: 1 },    // Compound: Company's active jobs
    { companyId: 1, createdAt: -1 }, // Compound: Company's jobs sorted by date
  ],

  /**
   * Application Collection Indexes
   * Common queries: findByCandidate, findByJob, findByStatus, timeline queries
   */
  Application: [
    { candidateId: 1 },              // CRITICAL: Finding candidate's applications
    { jobId: 1 },                    // CRITICAL: Finding applications for a job
    { companyId: 1 },                // Finding company's received applications
    { status: 1 },                   // Filtering by application status
    { appliedAt: -1 },               // Sorting by application date
    { candidateId: 1, status: 1 },   // Compound: Candidate's apps by status
    { jobId: 1, status: 1 },         // Compound: Job's applications by status
    { jobId: 1, appliedAt: -1 },     // Compound: Job apps sorted by date
    { companyId: 1, status: 1 },     // Compound: Company's incoming apps by status
  ],

  /**
   * Interview Collection Indexes
   * Common queries: findByStudent, findByJob, findByStatus
   */
  Interview: [
    { studentId: 1 },                // Finding student's interviews
    { jobId: 1 },                    // Finding interviews for a job
    { status: 1 },                   // Filtering by interview status
    { type: 1 },                     // Filtering by interview type (mock/live/screening)
    { startTime: 1 },                // Sorting by scheduled time
    { studentId: 1, status: 1 },     // Compound: Student's interviews by status
    { jobId: 1, startTime: -1 },     // Compound: Job interviews sorted by time
  ],

  /**
   * Resume Collection Indexes
   * Common queries: findByCandidate, search by skills
   */
  Resume: [
    { userId: 1 },                   // Finding user's resumes
    { isPrimary: 1 },                // Finding primary resume
    { uploadedAt: -1 },              // Sorting by upload date
    { userId: 1, isPrimary: 1 },     // Compound: User's primary resume
  ],

  /**
   * MockInterview Collection Indexes
   * Common queries: findByCandidate, findByJob
   */
  MockInterview: [
    { userId: 1 },                   // Finding user's mock interviews
    { jobId: 1 },                    // Finding mock interviews for a job
    { createdAt: -1 },               // Sorting by creation date
    { userId: 1, createdAt: -1 },    // Compound: User's mock interviews sorted by date
  ],

  /**
   * Leaderboard Collection Indexes
   * Common queries: findByJob, sorting by score
   */
  Leaderboard: [
    { jobId: 1 },                    // Finding leaderboard for a job
    { score: -1 },                   // Sorting by score (descending)
    { jobId: 1, score: -1 },         // Compound: Job leaderboard sorted by score
  ],
};

/**
 * Quick Reference: Index Types
 * 
 * Ascending (1): Regular index, good for sorting in ascending order and equality queries
 * Descending (-1): Regular index, good for sorting in descending order
 * Text ('text'): Full-text search index
 * Geospatial ('2dsphere'): For location-based queries
 * 
 * Compound Indexes: Multiple fields indexed together for queries on multiple fields
 * Example: { userId: 1, createdAt: -1 } optimizes queries like:
 *   db.collection.find({ userId, createdAt < date }).sort({ createdAt: -1 })
 */

/**
 * Implementation Guide
 * 
 * Add these indexes to your model schemas:
 * 
 * Example for User.js:
 * ----
 * userSchema.index({ email: 1 });
 * userSchema.index({ role: 1 });
 * userSchema.index({ createdAt: -1 });
 * userSchema.index({ email: 1, role: 1 });
 * 
 * Options (add as 2nd parameter):
 * {
 *   unique: true,           // Enforce uniqueness
 *   sparse: true,           // Skip documents where field is missing
 *   background: true,       // Build in background (don't block writes)
 * }
 * ----
 */

module.exports = {
  createIndexes,
  indexDefinitions,
};
