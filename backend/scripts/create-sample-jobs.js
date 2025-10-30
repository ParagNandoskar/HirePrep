const mongoose = require('mongoose');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
require('dotenv').config();

async function createSampleJob() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the employee@gmail.com user
    const user = await User.findOne({ email: 'employee@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    // Delete existing sample jobs for this user
    await Job.deleteMany({ companyId: user._id, title: { $regex: /^(Senior Full Stack Developer|Frontend Developer|Backend Engineer)$/ } });
    
    const sampleJobs = [
      {
        companyId: user._id,
        title: 'Senior Full Stack Developer',
        description: `We are seeking a highly skilled Senior Full Stack Developer to join our growing development team at TechNova Solutions. 

**About the Role:**
You will be responsible for developing and maintaining both frontend and backend components of our web applications. You'll work with cutting-edge technologies and collaborate with cross-functional teams to deliver high-quality software solutions.

**Key Responsibilities:**
• Design and develop scalable web applications using React, Node.js, and modern JavaScript frameworks
• Build robust backend APIs and services using Express.js and MongoDB
• Collaborate with UI/UX designers to implement responsive and intuitive user interfaces
• Write clean, maintainable, and well-documented code
• Participate in code reviews and contribute to technical decisions
• Mentor junior developers and contribute to team knowledge sharing
• Optimize application performance and ensure security best practices

**What You'll Do:**
• Lead development of new features from conception to deployment
• Participate in agile development processes and sprint planning
• Troubleshoot and resolve technical issues
• Stay up-to-date with latest technology trends and best practices`,
        
        requirements: {
          skills: [
            { name: 'JavaScript', level: 'Advanced', isRequired: true, weight: 9 },
            { name: 'React', level: 'Advanced', isRequired: true, weight: 9 },
            { name: 'Node.js', level: 'Advanced', isRequired: true, weight: 8 },
            { name: 'Python', level: 'Intermediate', isRequired: false, weight: 6 },
            { name: 'MongoDB', level: 'Intermediate', isRequired: true, weight: 7 },
            { name: 'Express.js', level: 'Advanced', isRequired: true, weight: 8 },
            { name: 'TypeScript', level: 'Intermediate', isRequired: false, weight: 7 },
            { name: 'Git', level: 'Intermediate', isRequired: true, weight: 6 }
          ],
          education: {
            minimumLevel: 'Bachelor',
            field: 'Computer Science',
            isRequired: true
          },
          experience: {
            minimumYears: 5,
            maximumYears: 10,
            industries: ['Technology', 'Software Development']
          }
        },
        
        additionalRequirements: [
          'Strong problem-solving and analytical skills',
          'Experience with RESTful API design and development',
          'Knowledge of database design and optimization',
          'Familiarity with cloud platforms (AWS, Azure, or GCP)',
          'Experience with version control systems (Git)',
          'Strong communication and teamwork skills'
        ],
        
        jobDetails: {
          type: 'full-time',
          level: 'senior',
          department: 'Engineering',
          team: 'Full Stack Development'
        },
        
        location: {
          type: 'hybrid',
          city: 'San Francisco',
          state: 'CA',
          country: 'United States',
          address: '123 Tech Park Drive, Suite 500'
        },
        
        compensation: {
          salaryRange: {
            min: 120000,
            max: 180000,
            currency: 'USD'
          },
          period: 'yearly',
          benefits: [
            'Comprehensive health insurance (medical, dental, vision)',
            '401(k) retirement plan with company matching up to 6%',
            'Flexible work hours and hybrid work options',
            'Annual learning and development budget ($2,000)',
            'Unlimited PTO policy',
            'Free snacks, coffee, and catered lunches',
            'Modern office equipment and ergonomic workspace',
            'Annual team retreats and company events'
          ],
          bonuses: {
            performance: true,
            signing: true,
            annual: true
          },
          equity: {
            offered: true,
            percentage: 0.5
          }
        },
        
        applicationProcess: {
          applicationDeadline: new Date('2025-12-31'),
          expectedHires: 2,
          applicationMethod: 'platform'
        },
        
        status: 'active',
        tags: ['JavaScript', 'React', 'Node.js', 'Full Stack', 'Senior', 'Hybrid'],
        category: 'Engineering',
        subCategory: 'Software Development',
        isPremium: true,
        isFeatured: true
      },
      
      {
        companyId: user._id,
        title: 'Frontend Developer',
        description: `Join our frontend team and help create amazing user experiences! We're looking for a talented Frontend Developer to build responsive, interactive web applications.

**About the Role:**
You'll work closely with our design and backend teams to implement beautiful, functional user interfaces using modern frontend technologies.

**Key Responsibilities:**
• Develop responsive web applications using React and modern CSS
• Collaborate with designers to implement pixel-perfect UI/UX designs
• Optimize applications for maximum speed and scalability
• Write clean, maintainable code with proper testing
• Participate in code reviews and technical discussions`,
        
        requirements: {
          skills: [
            { name: 'JavaScript', level: 'Intermediate', isRequired: true, weight: 8 },
            { name: 'React', level: 'Intermediate', isRequired: true, weight: 9 },
            { name: 'HTML', level: 'Advanced', isRequired: true, weight: 7 },
            { name: 'CSS', level: 'Advanced', isRequired: true, weight: 8 },
            { name: 'TypeScript', level: 'Beginner', isRequired: false, weight: 5 }
          ],
          education: {
            minimumLevel: 'Associate',
            field: 'Computer Science',
            isRequired: false
          },
          experience: {
            minimumYears: 2,
            maximumYears: 5
          }
        },
        
        additionalRequirements: [
          'Experience with responsive web design',
          'Knowledge of CSS preprocessors (Sass/SCSS)',
          'Familiarity with modern build tools (Webpack, Vite)',
          'Understanding of web accessibility standards',
          'Portfolio of previous work'
        ],
        
        jobDetails: {
          type: 'full-time',
          level: 'mid'
        },
        
        location: {
          type: 'remote',
          country: 'United States'
        },
        
        compensation: {
          salaryRange: {
            min: 70000,
            max: 100000,
            currency: 'USD'
          },
          period: 'yearly',
          benefits: [
            'Health insurance',
            'Remote work setup allowance',
            'Professional development budget',
            'Flexible working hours'
          ]
        },
        
        applicationProcess: {
          expectedHires: 1,
          applicationMethod: 'platform'
        },
        
        status: 'active',
        tags: ['Frontend', 'React', 'CSS', 'Remote', 'Mid-Level']
      },
      
      {
        companyId: user._id,
        title: 'Backend Engineer',
        description: `We're seeking a Backend Engineer to build and maintain robust server-side applications and APIs that power our products.

**About the Role:**
You'll design and implement scalable backend systems, work with databases, and ensure our applications can handle growth.

**Key Responsibilities:**
• Design and develop RESTful APIs using Node.js and Express
• Work with databases (MongoDB, PostgreSQL) for data modeling and optimization
• Implement authentication and authorization systems
• Optimize application performance and scalability
• Collaborate with frontend teams for seamless integration`,
        
        requirements: {
          skills: [
            { name: 'Node.js', level: 'Advanced', isRequired: true, weight: 9 },
            { name: 'Express.js', level: 'Advanced', isRequired: true, weight: 8 },
            { name: 'MongoDB', level: 'Intermediate', isRequired: true, weight: 7 },
            { name: 'PostgreSQL', level: 'Intermediate', isRequired: false, weight: 6 },
            { name: 'Docker', level: 'Intermediate', isRequired: false, weight: 6 },
            { name: 'AWS', level: 'Beginner', isRequired: false, weight: 5 }
          ],
          education: {
            minimumLevel: 'Bachelor',
            field: 'Computer Science',
            isRequired: true
          },
          experience: {
            minimumYears: 3,
            maximumYears: 7
          }
        },
        
        additionalRequirements: [
          'Strong understanding of RESTful API design',
          'Experience with database design and optimization',
          'Knowledge of authentication and security best practices',
          'Familiarity with cloud platforms',
          'Experience with testing frameworks'
        ],
        
        jobDetails: {
          type: 'full-time',
          level: 'mid'
        },
        
        location: {
          type: 'on-site',
          city: 'San Francisco',
          state: 'CA',
          country: 'United States'
        },
        
        compensation: {
          salaryRange: {
            min: 90000,
            max: 130000,
            currency: 'USD'
          },
          period: 'yearly',
          benefits: [
            'Health, dental, and vision insurance',
            '401(k) with company matching',
            'Commuter benefits',
            'Learning and development budget'
          ]
        },
        
        applicationProcess: {
          expectedHires: 1,
          applicationMethod: 'platform'
        },
        
        status: 'active',
        tags: ['Backend', 'Node.js', 'API', 'Database', 'On-site']
      }
    ];
    
    const createdJobs = await Job.insertMany(sampleJobs);
    
    console.log('✅ Sample jobs created successfully:');
    createdJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title} (ID: ${job._id})`);
      console.log(`   - Type: ${job.jobDetails.type}, Level: ${job.jobDetails.level}`);
      console.log(`   - Location: ${job.location.type} in ${job.location.city || 'Remote'}`);
      console.log(`   - Salary: $${job.compensation.salaryRange.min.toLocaleString()} - $${job.compensation.salaryRange.max.toLocaleString()}`);
      console.log(`   - Skills: ${job.requirements.skills.map(s => s.name).join(', ')}`);
      console.log('');
    });
    
    console.log(`🎉 Total jobs created: ${createdJobs.length}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating sample jobs:', err);
    process.exit(1);
  }
}

createSampleJob();