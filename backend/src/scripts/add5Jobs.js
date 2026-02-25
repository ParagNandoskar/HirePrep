/**
 * Add 5 Additional Jobs to Database
 * Based on existing job patterns
 * 
 * Usage: node backend/src/scripts/add5Jobs.js
 */

const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    console.log('✅ MongoDB connected successfully\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// 5 new jobs with diverse roles
const newJobs = [
  {
    title: 'Senior Full Stack Engineer',
    description: `We are seeking a high-caliber Senior Full Stack Engineer to join our team. This role is key to advancing our FinTech initiatives and requires a passion for clean code and problem-solving.

Key Responsibilities:
- Design and develop scalable web applications using React and Node.js
- Build and maintain RESTful APIs and microservices
- Optimize database performance (MongoDB, PostgreSQL)
- Lead code reviews and mentor junior developers
- Collaborate with product team on feature development
- Implement CI/CD pipelines and automated testing

What We Offer:
- Competitive salary with performance bonuses
- Stock options
- Remote-first culture with flexible hours
- Health insurance and wellness benefits
- Professional development budget`,

    requirements: {
      skills: [
        { name: 'React', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'Node.js', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'MongoDB', level: 'Intermediate', isRequired: true, weight: 8 },
        { name: 'TypeScript', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'REST APIs', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'Git', level: 'Advanced', isRequired: true, weight: 7 }
      ],
      education: {
        minimumLevel: 'Bachelor',
        field: 'Computer Science or related field',
        isRequired: false
      },
      experience: {
        minimumYears: 5,
        maximumYears: 8,
        industries: ['FinTech', 'Software Development']
      },
      languages: [
        { name: 'English', proficiency: 'Professional' }
      ]
    },

    additionalRequirements: [
      'Strong problem-solving and analytical skills',
      'Experience with microservices architecture',
      'Knowledge of cloud platforms (AWS/GCP)',
      'Excellent communication and mentorship abilities'
    ],

    jobDetails: {
      type: 'full-time',
      level: 'senior',
      department: 'Engineering',
      team: 'Platform'
    },

    location: {
      type: 'remote',
      city: undefined,
      state: undefined,
      country: 'India',
      isRemote: true
    },

    compensation: {
      salaryRange: {
        min: 850000,
        max: 1200000,
        currency: 'INR'
      },
      period: 'yearly',
      benefits: [
        'Health Insurance',
        'Work from Home Allowance',
        'Learning & Development Budget',
        'Flexible Hours'
      ],
      bonuses: {
        performance: true,
        signing: false,
        annual: true
      }
    },

    applicationProcess: {
      applicationDeadline: new Date('2025-10-31'),
      expectedHires: 1,
      applicationMethod: 'platform'
    },

    interviewQuestions: [
      {
        question: 'Describe your experience building scalable microservices architectures.',
        timeLimit: 3,
        type: 'technical'
      },
      {
        question: 'How do you approach optimizing database queries for high-traffic applications?',
        timeLimit: 3,
        type: 'technical'
      }
    ],

    status: 'active',
    tags: ['Full Stack', 'React', 'Node.js', 'FinTech', 'Senior'],
    category: 'Information Technology',
    subCategory: 'FinTech',
    isPremium: false,
    isUrgent: true,
    isFeatured: true,
    isPublic: true
  },

  {
    title: 'DevOps Engineer',
    description: `We are seeking a high-caliber DevOps Engineer to join our team. This role is key to advancing our Cloud Infrastructure initiatives and requires expertise in automation and system reliability.

Key Responsibilities:
- Design and maintain CI/CD pipelines
- Manage cloud infrastructure (AWS/GCP/Azure)
- Implement infrastructure as code (Terraform, CloudFormation)
- Monitor system performance and implement improvements
- Ensure security best practices across all environments
- Collaborate with development teams on deployment strategies

What We Offer:
- Competitive compensation package
- Remote work flexibility
- Cutting-edge tools and technologies
- Certification sponsorship
- Career growth opportunities`,

    requirements: {
      skills: [
        { name: 'Docker', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'Kubernetes', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'AWS', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'Terraform', level: 'Intermediate', isRequired: true, weight: 8 },
        { name: 'Python', level: 'Intermediate', isRequired: true, weight: 7 },
        { name: 'Linux', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'Git', level: 'Advanced', isRequired: true, weight: 7 }
      ],
      education: {
        minimumLevel: 'Bachelor',
        field: 'Computer Science or related field',
        isRequired: false
      },
      experience: {
        minimumYears: 3,
        maximumYears: 6,
        industries: ['Cloud Services', 'Software Development']
      },
      languages: [
        { name: 'English', proficiency: 'Professional' }
      ]
    },

    additionalRequirements: [
      'Experience with monitoring tools (Prometheus, Grafana)',
      'Strong scripting skills (Bash, Python)',
      'Knowledge of security best practices',
      'Excellent troubleshooting abilities'
    ],

    jobDetails: {
      type: 'full-time',
      level: 'mid',
      department: 'Engineering',
      team: 'Infrastructure'
    },

    location: {
      type: 'remote',
      city: undefined,
      state: undefined,
      country: 'India',
      isRemote: true
    },

    compensation: {
      salaryRange: {
        min: 720000,
        max: 950000,
        currency: 'INR'
      },
      period: 'yearly',
      benefits: [
        'Health Insurance',
        'Equipment Allowance',
        'Certification Support',
        'Flexible Schedule'
      ],
      bonuses: {
        performance: true,
        signing: false,
        annual: true
      }
    },

    applicationProcess: {
      applicationDeadline: new Date('2025-10-31'),
      expectedHires: 2,
      applicationMethod: 'platform'
    },

    interviewQuestions: [
      {
        question: 'Explain your experience with container orchestration and Kubernetes.',
        timeLimit: 3,
        type: 'technical'
      },
      {
        question: 'How do you handle incident response and system outages?',
        timeLimit: 3,
        type: 'behavioral'
      }
    ],

    status: 'active',
    tags: ['DevOps', 'AWS', 'Kubernetes', 'Docker', 'Cloud'],
    category: 'Information Technology',
    subCategory: 'Cloud Infrastructure',
    isPremium: false,
    isUrgent: true,
    isFeatured: false,
    isPublic: true
  },

  {
    title: 'Machine Learning Engineer',
    description: `We are seeking a high-caliber Machine Learning Engineer to join our team. This role is key to advancing our AI/ML initiatives and requires strong algorithmic thinking and model development skills.

Key Responsibilities:
- Develop and deploy machine learning models for production
- Work with large datasets using Python (Pandas, NumPy)
- Build data pipelines and feature engineering workflows
- Optimize model performance and implement A/B testing
- Collaborate with data scientists and engineers
- Monitor and maintain ML systems in production

What We Offer:
- Competitive salary with equity
- Work on cutting-edge ML projects
- Flexible remote work
- Conference and training budget
- Collaborative team environment`,

    requirements: {
      skills: [
        { name: 'Python', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'TensorFlow', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'PyTorch', level: 'Intermediate', isRequired: false, weight: 8 },
        { name: 'SQL', level: 'Advanced', isRequired: true, weight: 8 },
        { name: 'Python (Pandas)', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'Machine Learning', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'Git', level: 'Intermediate', isRequired: true, weight: 6 }
      ],
      education: {
        minimumLevel: 'Master',
        field: 'Computer Science, Statistics, or related field',
        isRequired: true
      },
      experience: {
        minimumYears: 3,
        maximumYears: 7,
        industries: ['AI/ML', 'Data Science', 'Technology']
      },
      languages: [
        { name: 'English', proficiency: 'Professional' }
      ]
    },

    additionalRequirements: [
      'Strong mathematical and statistical background',
      'Experience with deep learning frameworks',
      'Knowledge of MLOps practices',
      'Published research or contributions to open source (preferred)'
    ],

    jobDetails: {
      type: 'full-time',
      level: 'mid',
      department: 'Engineering',
      team: 'AI/ML'
    },

    location: {
      type: 'remote',
      city: undefined,
      state: undefined,
      country: 'India',
      isRemote: true
    },

    compensation: {
      salaryRange: {
        min: 950000,
        max: 1400000,
        currency: 'INR'
      },
      period: 'yearly',
      benefits: [
        'Health Insurance',
        'GPU Workstation Provided',
        'Conference Sponsorship',
        'Flexible Hours',
        'Learning Budget'
      ],
      bonuses: {
        performance: true,
        signing: true,
        annual: true
      }
    },

    applicationProcess: {
      applicationDeadline: new Date('2025-10-31'),
      expectedHires: 1,
      applicationMethod: 'platform'
    },

    interviewQuestions: [
      {
        question: 'Describe a machine learning project you built from scratch including data collection, model training, and deployment.',
        timeLimit: 4,
        type: 'technical'
      },
      {
        question: 'How do you handle class imbalance in datasets?',
        timeLimit: 3,
        type: 'technical'
      }
    ],

    status: 'active',
    tags: ['Machine Learning', 'Python', 'AI', 'Deep Learning', 'TensorFlow'],
    category: 'Information Technology',
    subCategory: 'AI/ML',
    isPremium: true,
    isUrgent: false,
    isFeatured: true,
    isPublic: true
  },

  {
    title: 'Mobile App Developer (React Native)',
    description: `We are seeking a high-caliber Mobile App Developer to join our team. This role is key to advancing our Mobile initiatives and requires expertise in cross-platform mobile development.

Key Responsibilities:
- Develop and maintain mobile applications using React Native
- Implement responsive and intuitive user interfaces
- Integrate with backend APIs and handle data synchronization
- Optimize app performance for both iOS and Android
- Conduct code reviews and maintain code quality
- Collaborate with designers and product managers

What We Offer:
- Competitive salary package
- Remote work with flexible hours
- Latest devices for testing
- Professional development support
- Dynamic startup environment`,

    requirements: {
      skills: [
        { name: 'React Native', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'JavaScript', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'React', level: 'Advanced', isRequired: true, weight: 9 },
        { name: 'TypeScript', level: 'Intermediate', isRequired: false, weight: 7 },
        { name: 'REST APIs', level: 'Advanced', isRequired: true, weight: 8 },
        { name: 'Git', level: 'Intermediate', isRequired: true, weight: 6 }
      ],
      education: {
        minimumLevel: 'Bachelor',
        field: 'Computer Science or related field',
        isRequired: false
      },
      experience: {
        minimumYears: 2,
        maximumYears: 5,
        industries: ['Mobile Development', 'E-commerce', 'Technology']
      },
      languages: [
        { name: 'English', proficiency: 'Professional' }
      ]
    },

    additionalRequirements: [
      'Experience with native modules and platform-specific code',
      'Knowledge of mobile app deployment (App Store, Play Store)',
      'Understanding of mobile UI/UX best practices',
      'Strong debugging and optimization skills'
    ],

    jobDetails: {
      type: 'contract',
      level: 'mid',
      department: 'Engineering',
      team: 'Mobile'
    },

    location: {
      type: 'remote',
      city: undefined,
      state: undefined,
      country: 'India',
      isRemote: true
    },

    compensation: {
      salaryRange: {
        min: 620000,
        max: 850000,
        currency: 'INR'
      },
      period: 'yearly',
      benefits: [
        'Health Insurance',
        'Device Allowance',
        'Flexible Schedule'
      ],
      bonuses: {
        performance: true,
        signing: false,
        annual: false
      }
    },

    applicationProcess: {
      applicationDeadline: new Date('2025-10-31'),
      expectedHires: 1,
      applicationMethod: 'platform'
    },

    interviewQuestions: [
      {
        question: 'Describe your experience building cross-platform mobile apps with React Native.',
        timeLimit: 3,
        type: 'technical'
      },
      {
        question: 'How do you handle state management in large React Native applications?',
        timeLimit: 3,
        type: 'technical'
      }
    ],

    status: 'active',
    tags: ['React Native', 'Mobile', 'JavaScript', 'iOS', 'Android'],
    category: 'Information Technology',
    subCategory: 'Mobile Development',
    isPremium: false,
    isUrgent: false,
    isFeatured: false,
    isPublic: true
  },

  {
    title: 'QA Automation Engineer',
    description: `We are seeking a high-caliber QA Automation Engineer to join our team. This role is key to advancing our Quality Assurance initiatives and requires expertise in test automation frameworks.

Key Responsibilities:
- Design and implement automated test frameworks
- Write and maintain test scripts using Selenium, Cypress, or similar tools
- Perform API testing and integration testing
- Collaborate with developers on test-driven development
- Identify, document, and track bugs
- Ensure code quality through continuous testing

What We Offer:
- Competitive compensation
- Remote-first culture
- Modern testing tools and infrastructure
- Learning and certification opportunities
- Collaborative team environment`,

    requirements: {
      skills: [
        { name: 'Selenium', level: 'Advanced', isRequired: true, weight: 10 },
        { name: 'JavaScript', level: 'Intermediate', isRequired: true, weight: 8 },
        { name: 'Python', level: 'Intermediate', isRequired: false, weight: 7 },
        { name: 'Cypress', level: 'Intermediate', isRequired: false, weight: 8 },
        { name: 'REST APIs', level: 'Intermediate', isRequired: true, weight: 7 },
        { name: 'SQL', level: 'Intermediate', isRequired: true, weight: 6 },
        { name: 'Git', level: 'Intermediate', isRequired: true, weight: 6 }
      ],
      education: {
        minimumLevel: 'Bachelor',
        field: 'Computer Science or related field',
        isRequired: false
      },
      experience: {
        minimumYears: 2,
        maximumYears: 5,
        industries: ['Software Testing', 'Quality Assurance', 'Technology']
      },
      languages: [
        { name: 'English', proficiency: 'Professional' }
      ]
    },

    additionalRequirements: [
      'Experience with CI/CD integration',
      'Knowledge of testing methodologies and best practices',
      'Strong analytical and problem-solving skills',
      'Attention to detail and quality-focused mindset'
    ],

    jobDetails: {
      type: 'full-time',
      level: 'mid',
      department: 'Engineering',
      team: 'Quality Assurance'
    },

    location: {
      type: 'remote',
      city: undefined,
      state: undefined,
      country: 'India',
      isRemote: true
    },

    compensation: {
      salaryRange: {
        min: 550000,
        max: 780000,
        currency: 'INR'
      },
      period: 'yearly',
      benefits: [
        'Health Insurance',
        'Work from Home Setup',
        'Certification Support',
        'Flexible Hours'
      ],
      bonuses: {
        performance: true,
        signing: false,
        annual: true
      }
    },

    applicationProcess: {
      applicationDeadline: new Date('2025-10-31'),
      expectedHires: 2,
      applicationMethod: 'platform'
    },

    interviewQuestions: [
      {
        question: 'Describe your experience with test automation frameworks and tools.',
        timeLimit: 3,
        type: 'technical'
      },
      {
        question: 'How do you prioritize test cases and ensure test coverage?',
        timeLimit: 3,
        type: 'technical'
      }
    ],

    status: 'active',
    tags: ['QA', 'Automation', 'Testing', 'Selenium', 'Cypress'],
    category: 'Information Technology',
    subCategory: 'Quality Assurance',
    isPremium: false,
    isUrgent: false,
    isFeatured: false,
    isPublic: true
  }
];

const seedJobs = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding company user...\n');
    
    // Find a company user to assign jobs to
    const companyUser = await User.findOne({ role: 'company' });
    
    if (!companyUser) {
      console.error('❌ No company user found in database.');
      console.log('   Please create a company user first or provide a company ID.');
      process.exit(1);
    }

    console.log(`✅ Found company: ${companyUser.companyDetails?.companyName || 'Company'}`);
    console.log(`   Company ID: ${companyUser._id}\n`);

    // Assign company ID to all jobs
    const jobsWithCompany = newJobs.map(job => ({
      ...job,
      companyId: companyUser._id
    }));

    console.log('📝 Adding 5 new jobs to database...\n');
    console.log('='.repeat(60));

    // Insert jobs one by one to show progress
    let successCount = 0;
    for (const [index, jobData] of jobsWithCompany.entries()) {
      try {
        const job = new Job(jobData);
        await job.save();
        successCount++;
        
        console.log(`✅ ${index + 1}. ${jobData.title}`);
        console.log(`   Category: ${jobData.category} - ${jobData.subCategory}`);
        console.log(`   Type: ${jobData.jobDetails.type} | Level: ${jobData.jobDetails.level}`);
        console.log(`   Salary: ₹${jobData.compensation.salaryRange.min.toLocaleString()}-${jobData.compensation.salaryRange.max.toLocaleString()} ${jobData.compensation.period}`);
        console.log(`   Location: ${jobData.location.type}`);
        console.log(`   Featured: ${jobData.isFeatured ? 'Yes' : 'No'} | Urgent: ${jobData.isUrgent ? 'Yes' : 'No'}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Failed to add ${jobData.title}:`, error.message);
      }
    }

    console.log('='.repeat(60));
    console.log(`\n✅ Successfully added ${successCount}/${newJobs.length} jobs!`);
    
    // Show summary
    const totalJobs = await Job.countDocuments();
    console.log(`\n📊 Database now contains ${totalJobs} total jobs\n`);

  } catch (error) {
    console.error('❌ Error seeding jobs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeder
seedJobs();
