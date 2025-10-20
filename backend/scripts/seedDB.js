const mongoose = require('mongoose');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
require('dotenv').config();

const connectDB = require('../src/config/database');

const sampleJobs = [
  {
    title: "Full Stack Developer",
    description: "We are looking for a skilled Full Stack Developer to join our dynamic team. You will be responsible for developing both front-end and back-end web applications.",
    requirements: {
      skills: [
        { name: "JavaScript", required: true },
        { name: "React", required: true },
        { name: "Node.js", required: true },
        { name: "MongoDB", required: false }
      ],
      education: {
        degree: "Bachelor's",
        field: "Computer Science",
        required: false
      },
      experience: {
        minYears: 2,
        maxYears: 5
      },
      location: {
        type: "Remote",
        remote: true,
        hybrid: false
      }
    },
    compensation: {
      salaryMin: 70000,
      salaryMax: 100000,
      currency: "USD",
      benefits: ["Health Insurance", "Dental", "401k"]
    },
    jobType: "full-time",
    tags: ["JavaScript", "React", "Node.js", "Remote"]
  }
];

const sampleCompany = {
  name: "Tech Innovations Inc",
  email: "hr@techinnovations.com",
  password: "Company123!",
  role: "company",
  profile: {
    companyName: "Tech Innovations Inc",
    companySize: "50-200",
    industry: "Technology",
    website: "https://techinnovations.com",
    description: "Leading technology company focused on innovative solutions"
  }
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Check if company already exists
    let company = await User.findOne({ email: sampleCompany.email });
    
    if (!company) {
      console.log('👤 Creating sample company...');
      company = new User(sampleCompany);
      await company.save();
      console.log('✅ Sample company created');
    } else {
      console.log('👤 Sample company already exists');
    }
    
    // Check if jobs already exist
    const existingJobs = await Job.find({});
    
    if (existingJobs.length === 0) {
      console.log('💼 Creating sample jobs...');
      
      // Add company ID to jobs
      const jobsWithCompany = sampleJobs.map(job => ({
        ...job,
        companyId: company._id
      }));
      
      await Job.insertMany(jobsWithCompany);
      console.log('✅ Sample jobs created');
    } else {
      console.log('💼 Jobs already exist in database');
    }
    
    const totalJobs = await Job.countDocuments();
    const totalUsers = await User.countDocuments();
    
    console.log('📊 Database Statistics:');
    console.log(`   - Total Jobs: ${totalJobs}`);
    console.log(`   - Total Users: ${totalUsers}`);
    console.log('🎉 Database seeding completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };