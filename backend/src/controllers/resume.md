The architectural shift to a dedicated Python NLP microservice requires three main changes in your Node.js backend code:

1.  **Update `resumeParser.js`** (Service) to change the parsing logic and dependency.
2.  **Update `resumeController.js`** (Controller) to use the new Python-based parsing and analysis.
3.  **Update `jobMatcher.js`** (Service) to offload rule-based scoring to the Python service, keeping only the semantic scoring ($\text{Gemini Embeddings}$) in Node.js.

Here are the specific, line-by-line changes for each file:

-----

## 1\. Changes to `resumeParser.js` (Service)

This file loses the heavy LLM functions and gains the $\text{Axios}$ call to the new Python service.

```javascript
// File: src/services/resumeParser.js

// REMOVE: pdfParse and mammoth are no longer needed here as they are now in the Python service
// const pdfParse = require('pdf-parse'); 
// const mammoth = require('mammoth'); 
const axios = require('axios'); // <-- NEW: Add Axios for microservice communication
const { getGeminiFlashLite, getEmbeddingsModel, getGeminiFlash } = require('../config/gemini');

// The TextProcessor functionality is now fully delegated to the Python service.
// We only keep the wrapper functions for the controller's convenience.

class ResumeParserService {
    // 🛑 REMOVE all three local text extraction functions (Python handles this now)
    /*
    async extractPdfText(buffer) { ... }
    async extractDocxText(buffer) { ... }
    async extractText(buffer, fileType) { ... }
    */

    // 🛑 REMOVE parseResumeWithAI (The Python service replaces this)
    /*
    async parseResumeWithAI(resumeText) { ... }
    */

    // ✅ ADD: New function to delegate the parsing work to the Python microservice
    async parseResumeWithNLP(fileUrl, candidateId) {
        try {
            const pythonNlpUrl = process.env.PYTHON_NLP_SERVICE_URL || 'http://localhost:5001'; 
            
            const response = await axios.post(`${pythonNlpUrl}/parse-resume`, {
                resumeUrl: fileUrl, // Pass the Cloudinary URL to the Python service
                candidateId: candidateId 
            }, {
                timeout: 60000, 
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'NLP parsing failed');
            }

            // Python service returns extractedData and score/analysis
            const parsedData = response.data.extractedData;
            const overallScore = response.data.score;
            
            // Generate basic strengths/improvements based on the score from the Python service
            const aiAnalysis = this.synthesizeAnalysis(overallScore); 

            return { parsedData, aiAnalysis }; 
        } catch (error) {
            console.error('Python NLP parsing error:', error.message);
            throw new Error('Failed to parse resume with NLP service: ' + error.message);
        }
    }
    
    // ✅ ADD: Simple logic to translate Python score into the expected AI Analysis structure
    synthesizeAnalysis(overallScore) {
        return {
            overallScore: Math.round(overallScore),
            strengths: overallScore > 80 ? ["Strong resume content and format (NLP Score: " + Math.round(overallScore) + "%)"] : ["Solid foundation in experience and skills."],
            improvements: overallScore < 60 ? ["Resume structure needs improvement."] : [],
            careerSuggestions: []
        };
    }


    // 🛑 UPDATE: Remove the LLM call from analyzeResumeQuality and use the simple synthesis function instead
    // The previous implementation used LLM for narrative analysis. We now use the score from the Python service.
    // If you need the LLM-driven suggestions, you'd need a new Gemini endpoint for that.
    async analyzeResumeQuality(parsedData) {
        // Since the Python service provides a score, we could either:
        // 1. Call a new Python endpoint for quality analysis, OR
        // 2. Delegate quality analysis to the LLM (using getGeminiFlash) with the structured data.
        // Assuming we keep the LLM narrative analysis for quality for high-quality feedback:
        
        const model = getGeminiFlash(); // Using a more powerful model for narrative analysis
        
        const prompt = `
            Analyze the following structured resume data and provide quality assessment and improvement suggestions...
            ... (use the prompt from the old function, but change the model to getGeminiFlash())
        `;
        
        // ... (rest of the analyzeResumeQuality implementation remains the same, but uses getGeminiFlash)
    }

    // ... (generateResumeEmbeddings and createResumeEmbeddingText functions remain largely the same, 
    // but the final implementation of generateResumeEmbeddings should be verified to use the correct model.)

    // ✅ UPDATE: We will assume we keep the LLM-driven narrative analysis for *quality* (as above)
    // but the core *parsing* is done by Python.
}

module.exports = new ResumeParserService();
```

-----

## 2\. Changes to `resumeController.js` (Controller)

The $\text{uploadResume}$ function's pipeline needs to be completely re-wired for the new architecture.

```javascript
// File: src/controllers/resumeController.js

// ... (existing imports)

// Upload and parse resume
const uploadResume = asyncHandler(async (req, res) => {
    // ... (file validation remains the same)

    // ... (Cloudinary upload logic remains the same, resulting in uploadResult and fileUrl)
    // uploadResult.secure_url is the final fileUrl

    // 🛑 REMOVE: No longer need local text extraction
    // const extractedText = await resumeParserService.extractText(file.buffer, fileExtension);
    // if (!extractedText || extractedText.trim().length === 0) { ... }

    // ✅ NEW ORCHESTRATION: Call Python service using the Cloudinary URL
    const { parsedData, aiAnalysis } = await resumeParserService.parseResumeWithNLP(
        uploadResult.secure_url, // Pass the uploaded file URL
        userId
    );

    // Generate embeddings for job matching (Uses parsedData from Python)
    const embedding = await resumeParserService.generateResumeEmbeddings(parsedData);

    // 🛑 REMOVE: No longer need to call analyzeResumeQuality here if the score/analysis 
    // is received from the Python service OR generated in the service wrapper (as above).
    // If you keep the LLM call for narrative quality:
    // const aiAnalysis = await resumeParserService.analyzeResumeQuality(parsedData); 
    // But for simplicity, we assume the wrapper handles the necessary initial analysis.
    
    // ... (rest of the logic for finding/creating the Resume model remains the same)
    
    // The final Resume model is now populated with:
    // resume.parsedData = parsedData; // From Python NLP
    // resume.embedding = embedding; // From Gemini Embeddings
    // resume.aiAnalysis = aiAnalysis; // Synthesized from Python score OR new LLM call
    
    // ... (rest of the save/response logic remains the same)
});

// 🛑 UPDATE: In updateResumeData, remove the call to analyzeResumeQuality if you decide 
// to fully delegate that to Python or remove it entirely for manual edits. 
// If you keep the LLM analysis, the function remains correct.
/*
const updateResumeData = asyncHandler(async (req, res) => {
    // ...
    // Regenerate embeddings with updated data
    try {
        resume.embedding = await resumeParserService.generateResumeEmbeddings(resume.parsedData);
        
        // resume.aiAnalysis = await resumeParserService.analyzeResumeQuality(resume.parsedData); // <-- OPTIONALLY REMOVE
        
        await resume.save();
    } catch (error) {
    // ...
});
*/
```

-----

## 3\. Changes to `jobMatcher.js` (Service)

The $\text{calculateJobMatchScore}$ function must be updated to use the Python service for the rule-based components ($\text{skills}$, $\text{experience}$, $\text{education}$).

```javascript
// File: src/services/jobMatcher.js

// ... (existing imports)
const axios = require('axios'); // <-- NEW: Add Axios
// REMOVE: utility functions for rule-based scoring are now in Python service
// const { calculateResumeJobMatch, calculateExperienceMatch, calculateEducationMatch } = require('../utils/scoring'); 

class JobMatcherService {
    // ... (generateJobEmbeddings, createJobEmbeddingText, cosineSimilarity remain the same)
    
    // ... (findMatchingJobs remains the same, as it calls calculateJobMatchScore)

    // 🛑 MAJOR UPDATE: Offload rule-based scoring to Python
    async calculateJobMatchScore(resume, job) {
        try {
            const scores = {
                skills: 0,
                experience: 0,
                education: 0,
                semantic: 0
            };

            const weights = {
                skills: 0.4,
                experience: 0.25,
                education: 0.15,
                semantic: 0.2
            };

            // ✅ NEW: Call Python service for rule-based scoring (Skills, Experience, Education)
            const pythonNlpUrl = process.env.PYTHON_NLP_SERVICE_URL || 'http://localhost:5001';
            
            const pythonResponse = await axios.post(`${pythonNlpUrl}/calculate-match`, {
                candidateData: {
                    skills: resume.parsedData?.skills,
                    experience: resume.parsedData?.experience,
                    education: resume.parsedData?.education,
                },
                jobRequirements: job.requirements,
                jobDescription: job.description
            });

            if (!pythonResponse.data.success) {
                throw new Error(pythonResponse.data.error || 'Python match failed');
            }

            const pythonBreakdown = pythonResponse.data.breakdown;
            scores.skills = pythonBreakdown.skills;
            scores.experience = pythonBreakdown.experience;
            scores.education = pythonBreakdown.education;
            // End Python Call

            // ✅ RETAIN: Calculate semantic similarity (Gemini Embeddings logic)
            if (resume.embedding && job.embedding) {
                const similarity = this.cosineSimilarity(resume.embedding, job.embedding);
                scores.semantic = similarity * 100;
            }

            // Calculate weighted overall score (same logic)
            const overall = Math.round(
                scores.skills * weights.skills +
                scores.experience * weights.experience +
                scores.education * weights.education +
                scores.semantic * weights.semantic
            );

            return {
                overall,
                details: {
                    skillsMatch: scores.skills,
                    experienceMatch: scores.experience,
                    educationMatch: scores.education,
                    semanticSimilarity: scores.semantic
                }
            };
        } catch (error) {
            console.error('Match score calculation error:', error);
            throw new Error('Failed to calculate match score: ' + error.message);
        }
    }

    // ... (findMatchingCandidates, getSkillGapAnalysis, generateImprovementSuggestions remain the same)
}

module.exports = new JobMatcherService();
```