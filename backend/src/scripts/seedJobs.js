const mongoose = require('mongoose');
const Job = require('../models/Job');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Sample jobs matching user's skills: JavaScript, Python, Java, React, Node.js, SQL, HTML, CSS, Git
const sampleJobs = [
    {
        // You'll need to replace this with an actual company user ID from your database
        companyId: null, // Will be set dynamically
        title: 'Full Stack JavaScript Developer',
        description: `We are seeking a talented Full Stack JavaScript Developer to join our dynamic team. You will work on building scalable web applications using modern JavaScript frameworks and technologies.

Key Responsibilities:
- Develop and maintain web applications using React and Node.js
- Design and implement RESTful APIs
- Work with SQL databases to manage application data
- Collaborate with cross-functional teams to define and ship new features
- Write clean, maintainable code following best practices
- Participate in code reviews and contribute to team knowledge sharing

What We Offer:
- Competitive salary and benefits
- Flexible work arrangements
- Professional development opportunities
- Modern tech stack and tools`,

        requirements: {
            skills: [
                { name: 'JavaScript', level: 'Advanced', isRequired: true, weight: 10 },
                { name: 'React', level: 'Advanced', isRequired: true, weight: 9 },
                { name: 'Node.js', level: 'Intermediate', isRequired: true, weight: 9 },
                { name: 'SQL', level: 'Intermediate', isRequired: true, weight: 7 },
                { name: 'HTML', level: 'Advanced', isRequired: true, weight: 8 },
                { name: 'CSS', level: 'Advanced', isRequired: true, weight: 8 },
                { name: 'Git', level: 'Intermediate', isRequired: true, weight: 6 },
            ],
            education: {
                minimumLevel: 'Bachelor',
                field: 'Computer Science or related field',
                isRequired: false
            },
            experience: {
                minimumYears: 2,
                maximumYears: 5,
                industries: ['Technology', 'Software Development']
            },
            languages: [
                { name: 'English', proficiency: 'Professional' }
            ]
        },

        additionalRequirements: [
            'Strong problem-solving skills',
            'Excellent communication abilities',
            'Experience with Agile methodologies',
            'Understanding of web security best practices'
        ],

        jobDetails: {
            type: 'full-time',
            level: 'mid',
            department: 'Engineering',
            team: 'Web Development'
        },

        location: {
            type: 'hybrid',
            city: 'San Francisco',
            state: 'California',
            country: 'United States',
            address: '123 Tech Street',
            pincode: '94102'
        },

        compensation: {
            salaryRange: {
                min: 80000,
                max: 120000,
                currency: 'USD'
            },
            period: 'yearly',
            benefits: [
                'Health Insurance',
                'Dental Insurance',
                'Vision Insurance',
                '401(k) Matching',
                'Paid Time Off',
                'Professional Development Budget'
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
            applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            expectedHires: 2,
            applicationMethod: 'platform'
        },

        interviewQuestions: [
            {
                question: 'Can you describe your experience with React and how you manage state in complex applications?',
                timeLimit: 3
            },
            {
                question: 'Tell us about a challenging bug you encountered and how you resolved it.',
                timeLimit: 3
            }
        ],

        status: 'active',
        tags: ['JavaScript', 'React', 'Node.js', 'Full Stack', 'Web Development'],
        category: 'Software Development',
        subCategory: 'Full Stack Development',
        isPremium: false,
        isUrgent: false,
        isFeatured: true,
        isPublic: true
    },

    {
        companyId: null,
        title: 'Python Backend Developer',
        description: `Join our team as a Python Backend Developer and help us build robust, scalable backend systems. You'll work with cutting-edge technologies and contribute to mission-critical applications.

Key Responsibilities:
- Design and develop RESTful APIs using Python frameworks
- Optimize database queries and manage SQL databases
- Implement automated testing and CI/CD pipelines
- Collaborate with frontend developers to integrate user-facing elements
- Monitor and improve application performance
- Write technical documentation

What We Offer:
- Competitive compensation package
- Remote-first culture
- Learning and development budget
- Health and wellness benefits`,

        requirements: {
            skills: [
                { name: 'Python', level: 'Advanced', isRequired: true, weight: 10 },
                { name: 'SQL', level: 'Advanced', isRequired: true, weight: 9 },
                { name: 'Git', level: 'Intermediate', isRequired: true, weight: 7 },
                { name: 'JavaScript', level: 'Beginner', isRequired: false, weight: 5 },
            ],
            education: {
                minimumLevel: 'Bachelor',
                field: 'Computer Science, Engineering, or related field',
                isRequired: false
            },
            experience: {
                minimumYears: 3,
                maximumYears: 7,
                industries: ['Technology', 'Software Development', 'FinTech']
            },
            languages: [
                { name: 'English', proficiency: 'Professional' }
            ]
        },

        additionalRequirements: [
            'Experience with Django or Flask',
            'Knowledge of RESTful API design principles',
            'Understanding of database optimization',
            'Familiarity with cloud platforms (AWS, GCP, or Azure)'
        ],

        jobDetails: {
            type: 'full-time',
            level: 'mid',
            department: 'Engineering',
            team: 'Backend Development'
        },

        location: {
            type: 'remote',
            city: 'New York',
            state: 'New York',
            country: 'United States',
            pincode: '10001'
        },

        compensation: {
            salaryRange: {
                min: 90000,
                max: 140000,
                currency: 'USD'
            },
            period: 'yearly',
            benefits: [
                'Health Insurance',
                'Dental Insurance',
                'Vision Insurance',
                '401(k) Matching',
                'Unlimited PTO',
                'Home Office Stipend'
            ],
            bonuses: {
                performance: true,
                signing: false,
                annual: true
            },
            equity: {
                offered: true,
                percentage: 0.3
            }
        },

        applicationProcess: {
            applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            expectedHires: 3,
            applicationMethod: 'platform'
        },

        interviewQuestions: [
            {
                question: 'Describe your experience with Python web frameworks and which one you prefer.',
                timeLimit: 3
            },
            {
                question: 'How do you approach database optimization and query performance?',
                timeLimit: 3
            }
        ],

        status: 'active',
        tags: ['Python', 'Backend', 'API Development', 'SQL', 'Django'],
        category: 'Software Development',
        subCategory: 'Backend Development',
        isPremium: true,
        isUrgent: false,
        isFeatured: true,
        isPublic: true
    },

    {
        companyId: null,
        title: 'Junior Java Developer',
        description: `We're looking for an enthusiastic Junior Java Developer to join our growing team. This is an excellent opportunity for recent graduates or developers early in their career to work on enterprise-level applications.

Key Responsibilities:
- Develop and maintain Java-based applications
- Write clean, efficient, and well-documented code
- Participate in code reviews and team meetings
- Learn and apply best practices in software development
- Work with SQL databases
- Collaborate with senior developers on complex features

What We Offer:
- Mentorship from experienced developers
- Structured learning path
- Competitive entry-level salary
- Career growth opportunities`,

        requirements: {
            skills: [
                { name: 'Java', level: 'Intermediate', isRequired: true, weight: 10 },
                { name: 'SQL', level: 'Beginner', isRequired: true, weight: 7 },
                { name: 'Git', level: 'Beginner', isRequired: true, weight: 6 },
                { name: 'HTML', level: 'Beginner', isRequired: false, weight: 4 },
                { name: 'CSS', level: 'Beginner', isRequired: false, weight: 4 },
            ],
            education: {
                minimumLevel: 'Bachelor',
                field: 'Computer Science or related field',
                isRequired: true
            },
            experience: {
                minimumYears: 0,
                maximumYears: 2,
                industries: ['Technology', 'Software Development']
            },
            languages: [
                { name: 'English', proficiency: 'Professional' }
            ]
        },

        additionalRequirements: [
            'Basic understanding of OOP principles',
            'Willingness to learn and grow',
            'Good problem-solving skills',
            'Team player with good communication skills'
        ],

        jobDetails: {
            type: 'full-time',
            level: 'entry',
            department: 'Engineering',
            team: 'Application Development'
        },

        location: {
            type: 'on-site',
            city: 'Austin',
            state: 'Texas',
            country: 'United States',
            address: '456 Innovation Drive',
            pincode: '78701'
        },

        compensation: {
            salaryRange: {
                min: 60000,
                max: 80000,
                currency: 'USD'
            },
            period: 'yearly',
            benefits: [
                'Health Insurance',
                'Dental Insurance',
                '401(k)',
                'Paid Time Off',
                'Training Budget'
            ],
            bonuses: {
                performance: true,
                signing: false,
                annual: false
            },
            equity: {
                offered: false
            }
        },

        applicationProcess: {
            applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            expectedHires: 5,
            applicationMethod: 'platform'
        },

        interviewQuestions: [
            {
                question: 'What interests you about Java development and why did you choose this career path?',
                timeLimit: 2
            },
            {
                question: 'Can you explain the concept of object-oriented programming?',
                timeLimit: 3
            }
        ],

        status: 'active',
        tags: ['Java', 'Entry Level', 'Junior Developer', 'Backend'],
        category: 'Software Development',
        subCategory: 'Java Development',
        isPremium: false,
        isUrgent: true,
        isFeatured: false,
        isPublic: true
    },

    {
        companyId: null,
        title: 'Frontend React Developer',
        description: `We're seeking a passionate Frontend React Developer to create beautiful, responsive user interfaces. You'll work closely with designers and backend developers to deliver exceptional user experiences.

Key Responsibilities:
- Build reusable React components and front-end libraries
- Translate designs and wireframes into high-quality code
- Optimize components for maximum performance
- Implement responsive designs using modern CSS techniques
- Collaborate with backend developers to integrate APIs
- Ensure cross-browser compatibility
- Write unit and integration tests

What We Offer:
- Modern development environment
- Flexible working hours
- Competitive salary and benefits
- Opportunity to work on cutting-edge projects`,

        requirements: {
            skills: [
                { name: 'React', level: 'Advanced', isRequired: true, weight: 10 },
                { name: 'JavaScript', level: 'Advanced', isRequired: true, weight: 10 },
                { name: 'HTML', level: 'Advanced', isRequired: true, weight: 9 },
                { name: 'CSS', level: 'Advanced', isRequired: true, weight: 9 },
                { name: 'Git', level: 'Intermediate', isRequired: true, weight: 7 },
                { name: 'Node.js', level: 'Beginner', isRequired: false, weight: 5 },
            ],
            education: {
                minimumLevel: 'Bachelor',
                field: 'Computer Science, Design, or related field',
                isRequired: false
            },
            experience: {
                minimumYears: 2,
                maximumYears: 5,
                industries: ['Technology', 'E-commerce', 'SaaS']
            },
            languages: [
                { name: 'English', proficiency: 'Professional' }
            ]
        },

        additionalRequirements: [
            'Experience with state management (Redux, Context API)',
            'Knowledge of modern CSS frameworks (Tailwind, Styled Components)',
            'Understanding of responsive design principles',
            'Familiarity with testing frameworks (Jest, React Testing Library)'
        ],

        jobDetails: {
            type: 'full-time',
            level: 'mid',
            department: 'Engineering',
            team: 'Frontend Development'
        },

        location: {
            type: 'hybrid',
            city: 'Seattle',
            state: 'Washington',
            country: 'United States',
            address: '789 Tech Avenue',
            pincode: '98101'
        },

        compensation: {
            salaryRange: {
                min: 85000,
                max: 125000,
                currency: 'USD'
            },
            period: 'yearly',
            benefits: [
                'Health Insurance',
                'Dental Insurance',
                'Vision Insurance',
                '401(k) Matching',
                'Flexible PTO',
                'Stock Options',
                'Gym Membership'
            ],
            bonuses: {
                performance: true,
                signing: true,
                annual: true
            },
            equity: {
                offered: true,
                percentage: 0.4
            }
        },

        applicationProcess: {
            applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            expectedHires: 2,
            applicationMethod: 'platform'
        },

        interviewQuestions: [
            {
                question: 'How do you approach building a complex React application from scratch?',
                timeLimit: 3
            },
            {
                question: 'Describe a challenging UI problem you solved and your approach.',
                timeLimit: 3
            }
        ],

        status: 'active',
        tags: ['React', 'Frontend', 'JavaScript', 'UI/UX', 'Web Development'],
        category: 'Software Development',
        subCategory: 'Frontend Development',
        isPremium: true,
        isUrgent: false,
        isFeatured: true,
        isPublic: true
    },

    {
        companyId: null,
        title: 'Full Stack Web Developer Intern',
        description: `Join our team as a Full Stack Web Developer Intern and gain hands-on experience building real-world applications. This internship offers mentorship, learning opportunities, and potential for full-time employment.

Key Responsibilities:
- Assist in developing web applications using modern technologies
- Learn and apply best practices in software development
- Participate in team meetings and code reviews
- Work on both frontend and backend tasks
- Contribute to documentation and testing
- Collaborate with experienced developers

What We Offer:
- Mentorship from senior developers
- Real-world project experience
- Flexible schedule (part-time or full-time)
- Potential for full-time conversion
- Stipend and learning resources`,

        requirements: {
            skills: [
                { name: 'JavaScript', level: 'Beginner', isRequired: true, weight: 8 },
                { name: 'HTML', level: 'Intermediate', isRequired: true, weight: 7 },
                { name: 'CSS', level: 'Intermediate', isRequired: true, weight: 7 },
                { name: 'Git', level: 'Beginner', isRequired: true, weight: 6 },
                { name: 'React', level: 'Beginner', isRequired: false, weight: 5 },
                { name: 'Node.js', level: 'Beginner', isRequired: false, weight: 5 },
                { name: 'SQL', level: 'Beginner', isRequired: false, weight: 4 },
            ],
            education: {
                minimumLevel: 'High School',
                field: 'Currently pursuing Computer Science or related field',
                isRequired: true
            },
            experience: {
                minimumYears: 0,
                maximumYears: 1,
                industries: ['Technology']
            },
            languages: [
                { name: 'English', proficiency: 'Conversational' }
            ]
        },

        additionalRequirements: [
            'Currently enrolled in a degree program or recent graduate',
            'Passion for learning and technology',
            'Basic understanding of web development',
            'Good communication skills'
        ],

        jobDetails: {
            type: 'internship',
            level: 'entry',
            department: 'Engineering',
            team: 'Web Development'
        },

        location: {
            type: 'remote',
            city: 'Boston',
            state: 'Massachusetts',
            country: 'United States',
            pincode: '02101'
        },

        compensation: {
            salaryRange: {
                min: 20,
                max: 30,
                currency: 'USD'
            },
            period: 'hourly',
            benefits: [
                'Learning Resources',
                'Mentorship Program',
                'Flexible Schedule'
            ],
            bonuses: {
                performance: false,
                signing: false,
                annual: false
            },
            equity: {
                offered: false
            }
        },

        applicationProcess: {
            applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            expectedHires: 4,
            applicationMethod: 'platform'
        },

        interviewQuestions: [
            {
                question: 'What projects have you worked on and what did you learn from them?',
                timeLimit: 3
            },
            {
                question: 'Why are you interested in web development?',
                timeLimit: 2
            }
        ],

        status: 'active',
        tags: ['Internship', 'Full Stack', 'JavaScript', 'Web Development', 'Entry Level'],
        category: 'Software Development',
        subCategory: 'Internship',
        isPremium: false,
        isUrgent: false,
        isFeatured: false,
        isPublic: true
    }
];

// Seed function
const seedJobs = async () => {
    try {
        await connectDB();

        // Get or create a company user from the database to use as companyId
        const User = require('../models/User');
        let companyUser = await User.findOne({ role: 'company' });

        if (!companyUser) {
            console.log('⚠️  No company user found. Creating a demo company user...');

            // Create a demo company user
            companyUser = new User({
                name: 'Demo Tech Company',
                email: 'demo@techcompany.com',
                password: 'password123', // Will be hashed by the pre-save hook
                role: 'company',
                profile: {
                    companyName: 'Demo Tech Company',
                    companySize: '50-200',
                    industry: 'Technology',
                    website: 'https://demotechcompany.com',
                    description: 'A leading technology company focused on innovative solutions'
                },
                isVerified: true
            });

            await companyUser.save();
            console.log(`✅ Created demo company user: ${companyUser.email}`);
        } else {
            console.log(`✅ Found existing company user: ${companyUser.email}`);
        }

        // Set companyId for all jobs
        const jobsToInsert = sampleJobs.map(job => ({
            ...job,
            companyId: companyUser._id
        }));

        // Clear existing jobs (optional - comment out if you want to keep existing jobs)
        // await Job.deleteMany({});
        // console.log('🗑️  Cleared existing jobs');

        // Insert new jobs
        const insertedJobs = await Job.insertMany(jobsToInsert);

        console.log(`\n✅ Successfully added ${insertedJobs.length} jobs to the database!\n`);

        insertedJobs.forEach((job, index) => {
            console.log(`${index + 1}. ${job.title}`);
            console.log(`   - Location: ${job.location.city}, ${job.location.state} (${job.location.type})`);
            console.log(`   - Level: ${job.jobDetails.level}`);
            console.log(`   - Salary: $${job.compensation.salaryRange.min.toLocaleString()} - $${job.compensation.salaryRange.max.toLocaleString()}`);
            console.log(`   - Skills: ${job.requirements.skills.map(s => s.name).join(', ')}`);
            console.log('');
        });

        console.log('✅ Job seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding jobs:', error);
        process.exit(1);
    }
};

// Run the seed function
seedJobs();
