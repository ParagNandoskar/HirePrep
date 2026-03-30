# Backend Scripts

Utility scripts for database seeding and testing.

## Seed Leaderboard

Creates or updates leaderboard data for a job.

### Usage

```bash
cd backend
node src/scripts/seedLeaderboard.js <jobId>
```

### Examples

```bash
# Seed leaderboard for a specific job
node src/scripts/seedLeaderboard.js 69043877407f9e0ea9de6e80

# The script will:
# 1. Find completed interviews for the job
# 2. If interviews exist, use actual scores
# 3. If no interviews, create sample data with random scores (60-90)
# 4. Calculate ranks and update leaderboard
```

### What it does

- ✅ Creates/updates Leaderboard document in MongoDB
- ✅ Assigns ranks based on overall scores
- ✅ Calculates average score
- ✅ Uses actual interview data if available
- ✅ Creates sample data if no interviews exist

### Output

```
🌱 Seeding leaderboard data...

✅ Connected to MongoDB

📋 Job: Senior Full Stack Developer

Found 3 completed interviews

✅ Leaderboard updated from actual interview data!

📊 Leaderboard Summary:
   Total Candidates: 3
   Average Score: 78

🏆 Top 3 Candidates:
   1. John Doe - 85%
   2. Jane Smith - 78%
   3. Bob Johnson - 72%

✅ Leaderboard seeding complete!

🌐 View at: http://localhost:5173/leaderboard
📡 API: GET /api/analysis/leaderboard/69043877407f9e0ea9de6e80
```

## Find Job IDs

To find job IDs in your database:

```javascript
// In MongoDB shell or compass
db.jobs.find({}, { _id: 1, title: 1 })

// Or via Node:
node -e "
const mongoose = require('mongoose');
const Job = require('./src/models/Job');
mongoose.connect('mongodb://localhost:27017/hireprep').then(async () => {
  const jobs = await Job.find({}, 'title _id');
  console.log(jobs);
  process.exit();
});
"
```

## Quick Test

To quickly test the leaderboard integration:

```bash
# 1. Get a job ID from your database
# 2. Seed leaderboard
node src/scripts/seedLeaderboard.js <jobId>

# 3. Open frontend
# Navigate to: http://localhost:5173/leaderboard

# 4. Click on "View Leaderboard" for the job
```
