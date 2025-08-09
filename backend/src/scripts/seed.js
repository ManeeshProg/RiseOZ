const bcrypt = require('bcrypt');
const db = require('../../config/db');
const { Producer } = require('../models/producer');
const { Freelancer } = require('../models/freelancer');
const { Job } = require('../models/job');

async function ensureProducer(seedProducer) {
    const existing = await Producer.findOne({ username: seedProducer.username });
    if (existing) return existing;
    const passwordHash = await bcrypt.hash(seedProducer.password, 10);
    const doc = new Producer({
        username: seedProducer.username,
        password: passwordHash,
        email: seedProducer.email,
        companyName: seedProducer.companyName,
        linkedInUrl: seedProducer.linkedInUrl,
        companyWebsite: seedProducer.companyWebsite,
        role: 'PRODUCER',
        hasProfile: true,
    });
    await doc.save();
    return doc;
}

async function ensureFreelancers(seedFreelancers) {
    const created = [];
    for (const f of seedFreelancers) {
        // upsert-like behavior
        let doc = await Freelancer.findOne({ username: f.username });
        if (!doc) {
            const passwordHash = await bcrypt.hash(f.password, 10);
            doc = new Freelancer({
                username: f.username,
                password: passwordHash,
                email: f.email,
                firstName: f.firstName,
                lastName: f.lastName,
                role: 'FREELANCER',
                hasProfile: true,
                bio: f.bio,
                skills: f.skills,
                aiExtractedSkills: f.skills,
            });
            await doc.save();
        }
        created.push(doc);
    }
    return created;
}

function pickApplicants(allFreelancers, min = 2, max = 5) {
    const count = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
    const shuffled = [...allFreelancers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

async function createJobs(producer, freelancers, seedJobs) {
    const createdJobs = [];
    for (const j of seedJobs) {
        const existing = await Job.findOne({ title: j.title, producer: producer._id });
        if (existing) {
            createdJobs.push(existing);
            continue;
        }

        const applicants = pickApplicants(freelancers);
        const job = new Job({
            producer: producer._id,
            title: j.title,
            description: j.description,
            requirements: j.requirements,
            skillsRequired: j.skillsRequired,
            employmentType: j.employmentType,
            location: j.location,
            salary: j.salary,
            type: 'job',
            transactionHash: '0xseeded_tx_hash',
            paymentStatus: 'paid',
            network: 'Ethereum Sepolia',
            tags: j.tags || [],
            applicants: applicants.map((a) => a._id),
        });
        await job.save();
        createdJobs.push(job);

        // Update reverse references
        for (const a of applicants) {
            if (!a.appliedJobs) a.appliedJobs = [];
            if (!a.appliedJobs.find((id) => id.toString() === job._id.toString())) {
                a.appliedJobs.push(job._id);
                await a.save();
            }
        }
    }

    // Update producer jobsCreated
    const jobIds = createdJobs.map((j) => j._id);
    const existingIds = (producer.jobsCreated || []).map((id) => id.toString());
    const toAdd = jobIds.filter((id) => !existingIds.includes(id.toString()));
    if (toAdd.length > 0) {
        producer.jobsCreated = [...(producer.jobsCreated || []), ...toAdd];
        await producer.save();
    }

    return createdJobs;
}

async function run() {
    try {
        const seedProducer = {
            username: 'producer',
            password: 'Password123!',
            email: 'producer@example.com',
            companyName: 'Seeded Studios',
            linkedInUrl: 'https://www.linkedin.com/company/seeded-studios',
            companyWebsite: 'https://seeded.example.com',
        };

        const seedFreelancers = [
            {
                username: 'freelancer01',
                password: 'Password123!',
                email: 'freelancer01@example.com',
                firstName: 'Freelancer01',
                lastName: 'User',
                bio: 'Experienced full stack developer skilled in building scalable web applications with modern technologies.',
                skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'REST API', 'Git'],
            },
            {
                username: 'freelancer02',
                password: 'Password123!',
                email: 'freelancer02@example.com',
                firstName: 'Freelancer02',
                lastName: 'User',
                bio: 'Data scientist with expertise in machine learning, data analysis, and visualization to extract actionable insights.',
                skills: ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'Scikit-learn', 'SQL', 'Tableau'],
            },
            {
                username: 'freelancer03',
                password: 'Password123!',
                email: 'freelancer03@example.com',
                firstName: 'Freelancer03',
                lastName: 'User',
                bio: 'DevOps engineer specializing in cloud infrastructure, container orchestration, and continuous integration pipelines.',
                skills: ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Bash scripting', 'Linux'],
            },
            {
                username: 'freelancer04',
                password: 'Password123!',
                email: 'freelancer04@example.com',
                firstName: 'Freelancer04',
                lastName: 'User',
                bio: 'Machine learning engineer skilled in designing and deploying production-ready ML models using popular frameworks.',
                skills: ['Python', 'TensorFlow', 'PyTorch', 'Data Preprocessing', 'Model Deployment', 'Flask', 'Docker'],
            },
            {
                username: 'freelancer05',
                password: 'Password123!',
                email: 'freelancer05@example.com',
                firstName: 'Freelancer05',
                lastName: 'User',
                bio: 'Frontend developer focused on creating responsive, accessible, and high-performance user interfaces.',
                skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue.js', 'Webpack', 'Git'],
            },
            {
                username: 'freelancer06',
                password: 'Password123!',
                email: 'freelancer06@example.com',
                firstName: 'Freelancer06',
                lastName: 'User',
                bio: 'Backend developer experienced in building robust RESTful APIs and database management systems.',
                skills: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST API', 'JWT', 'Docker'],
            },
            {
                username: 'freelancer07',
                password: 'Password123!',
                email: 'freelancer07@example.com',
                firstName: 'Freelancer07',
                lastName: 'User',
                bio: 'Software engineer with a focus on cloud solutions, automation, and scalable system design.',
                skills: ['AWS', 'Python', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD', 'Git'],
            },
            {
                username: 'freelancer08',
                password: 'Password123!',
                email: 'freelancer08@example.com',
                firstName: 'Freelancer08',
                lastName: 'User',
                bio: 'Data analyst proficient in SQL, Excel, and BI tools to provide detailed reports and insights.',
                skills: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Python', 'Data Visualization', 'Reporting'],
            },
            {
                username: 'freelancer09',
                password: 'Password123!',
                email: 'freelancer09@example.com',
                firstName: 'Freelancer09',
                lastName: 'User',
                bio: 'Mobile app developer with experience building cross-platform applications using React Native and Flutter.',
                skills: ['React Native', 'Flutter', 'JavaScript', 'Dart', 'REST API', 'Firebase', 'Git'],
            },
            {
                username: 'freelancer10',
                password: 'Password123!',
                email: 'freelancer10@example.com',
                firstName: 'Freelancer10',
                lastName: 'User',
                bio: 'QA engineer with expertise in automation testing and performance testing for web applications.',
                skills: ['Selenium', 'Cypress', 'JavaScript', 'Test Automation', 'Performance Testing', 'Jenkins', 'Git'],
            },
        ];

        const seedJobs = [
            {
                title: 'Full Stack Developer',
                description: 'We are looking for a passionate Full Stack Developer to design, develop, and maintain web applications with a focus on seamless user experiences. You will work closely with product managers and designers to build scalable software solutions.',
                requirements: [
                    'Experience with front-end frameworks (React, Angular, or Vue)',
                    'Proficient in back-end development using Node.js, Express, or similar frameworks',
                    'Strong understanding of RESTful APIs and integration',
                    'Experience working with databases like MongoDB or PostgreSQL',
                    'Familiarity with Git, CI/CD pipelines, and agile methodologies',
                ],
                skillsRequired: [
                    'JavaScript (ES6+)',
                    'React.js / Angular / Vue.js',
                    'Node.js and Express',
                    'MongoDB / SQL Databases',
                    'Version control (Git)',
                    'API design and integration',
                    'Problem-solving and debugging',
                ],
                employmentType: 'Full-time',
                location: 'Remote',
                salary: 110000,
                tags: ['fullstack', 'javascript', 'react', 'node'],
            },
            {
                title: 'Data Scientist',
                description: 'Join our data team to analyze and interpret complex datasets to help drive strategic decisions. You will build predictive models, perform data visualization, and communicate insights to stakeholders.',
                requirements: [
                    'Strong background in statistics and machine learning',
                    'Experience with Python, R, or similar languages',
                    'Familiarity with data visualization tools (Matplotlib, Seaborn, Tableau)',
                    'Knowledge of SQL for data querying',
                    'Ability to work with large datasets and clean data effectively',
                ],
                skillsRequired: [
                    'Python (NumPy, pandas, scikit-learn)',
                    'Machine Learning algorithms',
                    'Data visualization and reporting',
                    'SQL and database querying',
                    'Statistical analysis',
                    'Communication skills to present insights',
                ],
                employmentType: 'Full-time',
                location: 'Remote',
                salary: 125000,
                tags: ['data', 'ml', 'python', 'analytics'],
            },
            {
                title: 'DevOps Engineer',
                description: 'We seek a DevOps Engineer to streamline our software delivery lifecycle by automating infrastructure, deploying updates, and ensuring system reliability and scalability.',
                requirements: [
                    'Experience with cloud platforms (AWS, Azure, GCP)',
                    'Knowledge of containerization tools (Docker, Kubernetes)',
                    'Familiarity with CI/CD tools like Jenkins, GitHub Actions, or GitLab CI',
                    'Strong scripting skills (Bash, Python, etc.)',
                    'Monitoring and logging expertise',
                ],
                skillsRequired: [
                    'Cloud services (AWS, Azure, GCP)',
                    'Docker and Kubernetes',
                    'CI/CD pipeline design and automation',
                    'Infrastructure as Code (Terraform, CloudFormation)',
                    'Linux system administration',
                    'Scripting languages',
                ],
                employmentType: 'Full-time',
                location: 'Remote',
                salary: 120000,
                tags: ['devops', 'cloud', 'kubernetes', 'cicd'],
            },
            {
                title: 'Machine Learning Engineer',
                description: 'Design and deploy machine learning models into production to solve real-world problems. Collaborate with data scientists and software engineers to build scalable ML pipelines.',
                requirements: [
                    'Experience in building and deploying ML models',
                    'Proficiency in Python and ML frameworks (TensorFlow, PyTorch)',
                    'Knowledge of model optimization and tuning',
                    'Understanding of cloud deployment and APIs',
                    'Strong problem-solving skills',
                ],
                skillsRequired: [
                    'Python and ML libraries',
                    'TensorFlow / PyTorch',
                    'Data preprocessing and feature engineering',
                    'Model deployment (Docker, Flask, FastAPI)',
                    'Cloud platforms (AWS, GCP, Azure)',
                    'Version control and collaboration tools',
                ],
                employmentType: 'Full-time',
                location: 'Remote',
                salary: 130000,
                tags: ['ml', 'python', 'tensorflow', 'pytorch'],
            },
            {
                title: 'Frontend Developer',
                description: 'We are looking for a Frontend Developer to create engaging and responsive user interfaces. You will translate UI/UX designs into high-quality code that runs efficiently on all devices.',
                requirements: [
                    'Expertise in HTML, CSS, and JavaScript',
                    'Experience with React, Vue, or Angular frameworks',
                    'Understanding of responsive design and cross-browser compatibility',
                    'Familiarity with version control systems',
                    'Ability to optimize applications for maximum speed',
                ],
                skillsRequired: [
                    'HTML5, CSS3, JavaScript (ES6+)',
                    'React.js / Vue.js / Angular',
                    'Responsive and mobile-first design',
                    'Web performance optimization',
                    'Git and collaboration workflows',
                    'Debugging and testing tools',
                ],
                employmentType: 'Full-time',
                location: 'Remote',
                salary: 100000,
                tags: ['frontend', 'javascript', 'react'],
            },
        ];

        const producer = await ensureProducer(seedProducer);
        const freelancers = await ensureFreelancers(seedFreelancers);
        const jobs = await createJobs(producer, freelancers, seedJobs);

        console.log(`Seed complete: producer=${producer.username}, freelancers=${freelancers.length}, jobs=${jobs.length}`);
    } catch (error) {
        console.error('Seed failed:', error);
    } finally {
        // Ensure process exits after mongoose connection established by config/db
        setTimeout(() => process.exit(0), 500);
    }
}

run();


