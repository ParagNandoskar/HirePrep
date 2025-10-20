const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../src/config/database');
const Job = require('../src/models/Job');
const User = require('../src/models/User');

dotenv.config();

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

const sampleJobs = [
  {
    title: "Full Stack Developer",
    description:
      "We are looking for a skilled Full Stack Developer to join our dynamic team. You will be responsible for developing both front-end and back-end web applications.",
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
      experience: { minYears: 2, maxYears: 5 }
    },
    compensation: {
      salaryMin: 70000,
      salaryMax: 100000,
      currency: "USD",
      benefits: ["Health Insurance", "Dental", "401k"]
    },
    jobType: "full-time",
    tags: ["JavaScript", "React", "Node.js", "Remote"]
  },
  {
    title: "Frontend Developer",
    description:
      "Join our team as a Frontend Developer and create amazing user experiences. Work with modern technologies and frameworks.",
    requirements: {
      skills: [
        { name: "HTML", required: true },
        { name: "CSS", required: true },
        { name: "JavaScript", required: true },
        { name: "React", required: true },
        { name: "TypeScript", required: false }
      ],
      education: {
        degree: "Associate's",
        field: "Web Development",
        required: false
      },
      experience: { minYears: 1, maxYears: 3 }
    },
    compensation: {
      salaryMin: 60000,
      salaryMax: 85000,
      currency: "USD",
      benefits: ["Health Insurance", "Flexible Hours"]
    },
    jobType: "full-time",
    tags: ["Frontend", "React", "UI/UX"]
  },
  {
    title: "Backend Engineer",
    description:
      "We're seeking a Backend Engineer to build scalable server-side applications and APIs. Experience with cloud platforms preferred.",
    requirements: {
      skills: [
        { name: "Python", required: true },
        { name: "Django", required: true },
        { name: "PostgreSQL", required: true },
        { name: "AWS", required: false },
        { name: "Docker", required: false }
      ],
      education: {
        degree: "Bachelor's",
        field: "Computer Science",
        required: true
      },
      experience: { minYears: 3, maxYears: 7 }
    },
    compensation: {
      salaryMin: 85000,
      salaryMax: 120000,
      currency: "USD",
      benefits: ["Health Insurance", "Stock Options", "Remote Work"]
    },
    jobType: "full-time",
    tags: ["Python", "Backend", "API", "Cloud"]
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    await connectDB();

    // Create sample company
    let company = await User.findOne({ email: sampleCompany.email });
    if (!company) {
      console.log('👤 Creating sample company...');
      company = new User(sampleCompany);
      await company.save();
      console.log('✅ Sample company created');
    } else {
      console.log('👤 Sample company already exists');
    }

    // Create sample jobs
    const existingJobs = await Job.find({});
    if (existingJobs.length === 0) {
      console.log('💼 Creating sample jobs...');
      const jobsWithCompany = sampleJobs.map(job => ({
        ...job,
        companyId: company._id
      }));
      await Job.insertMany(jobsWithCompany);
      console.log('✅ Sample jobs created');
    } else {
      console.log('💼 Jobs already exist in database');
    }

    // Summary
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

// Run seeder directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
