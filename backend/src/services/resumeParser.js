const axios = require('axios'); // NEW: Add Axios for microservice communication
const { getGeminiFlashLite, getEmbeddingsModel, getGeminiFlash } = require('../config/gemini');

const PYTHON_NLP_SERVICE_URL = 'http://localhost:5001'; // NEW: Python NLP microservice URL

// NEW: Function to delegate resume parsing to Python NLP service
async function parseResumeWithPythonNLP(filePath) {
  try {
    // Create FormData for file upload
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Call Python NLP service
    const response = await axios.post(`${PYTHON_NLP_SERVICE_URL}/parse-resume`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30 second timeout
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Python NLP service returned unsuccessful response');
    }
  } catch (error) {
    console.error('Error calling Python NLP service:', error.message);
    // Fallback: if Python service fails, still attempt basic parsing
    throw new Error(`Python NLP service unavailable: ${error.message}`);
  }
}

class ResumeParserService {
  // NEW: Main parsing method that delegates to Python NLP service
  async parseResume(filePath, fileBuffer, fileType) {
    try {
      // Use Python NLP service for parsing
      const pythonResult = await parseResumeWithPythonNLP(filePath);
      
      // Generate embeddings using Gemini (retained from original)
      const embeddings = await this.generateResumeEmbeddings(pythonResult);
      
      // Combine Python NLP results with Gemini embeddings
      return {
        ...pythonResult,
        embeddings
      };
    } catch (error) {
      console.error('Error in parseResume:', error);
      throw new Error(`Resume parsing failed: ${error.message}`);
    }
  }

  // RETAINED: Keep text extraction methods for compatibility/fallback
  async extractPdfText(buffer) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  }

  async extractDocxText(buffer) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to extract text from DOCX: ' + error.message);
    }
  }

  async extractText(buffer, fileType) {
    switch (fileType) {
      case 'pdf':
        return await this.extractPdfText(buffer);
      case 'docx':
        return await this.extractDocxText(buffer);
      default:
        throw new Error('Unsupported file type');
    }
  }

  // Parse resume using Gemini Flash Lite
  async parseResumeWithAI(resumeText) {
    try {
      const model = getGeminiFlashLite();
      
      const prompt = `
        Parse the following resume text and extract structured information in JSON format.
        
        Resume Text:
        ${resumeText}
        
        Please extract and return ONLY a JSON object with the following structure (no additional text):
        {
          "personalInfo": {
            "name": "Full Name",
            "email": "email@example.com",
            "phone": "phone number",
            "address": "address",
            "linkedin": "LinkedIn URL",
            "github": "GitHub URL",
            "portfolio": "Portfolio URL"
          },
          "summary": "Professional summary or objective",
          "skills": [
            {
              "name": "Skill name",
              "category": "technical|soft|language",
              "proficiency": "beginner|intermediate|advanced|expert"
            }
          ],
          "education": [
            {
              "institution": "School/University name",
              "degree": "Degree name",
              "field": "Field of study",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM or Present",
              "gpa": "GPA if mentioned",
              "achievements": ["Achievement 1", "Achievement 2"]
            }
          ],
          "experience": [
            {
              "company": "Company name",
              "position": "Job title",
              "location": "Location",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM or Present",
              "description": "Job description",
              "achievements": ["Achievement 1", "Achievement 2"],
              "skills": ["Skill 1", "Skill 2"]
            }
          ],
          "projects": [
            {
              "name": "Project name",
              "description": "Project description",
              "technologies": ["Tech 1", "Tech 2"],
              "url": "Project URL if available",
              "githubUrl": "GitHub URL if available"
            }
          ],
          "certifications": [
            {
              "name": "Certification name",
              "issuer": "Issuing organization",
              "issueDate": "YYYY-MM",
              "expiryDate": "YYYY-MM if applicable",
              "credentialId": "Credential ID if available"
            }
          ],
          "languages": [
            {
              "name": "Language name",
              "proficiency": "native|fluent|advanced|intermediate|beginner"
            }
          ]
        }
        
        Instructions:
        - Extract only the information that is clearly present in the resume
        - Use null or empty arrays for missing information
        - Categorize skills appropriately (technical, soft, language)
        - Estimate proficiency levels based on context clues
        - Format dates consistently as YYYY-MM
        - Clean and normalize the extracted data
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean the response to extract just the JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      return parsedData;
    } catch (error) {
      console.error('AI parsing error:', error);
      throw new Error('Failed to parse resume with AI: ' + error.message);
    }
  }

  // REMOVED: parseResumeWithAI method - now delegated to Python NLP service
  // All parsing logic is handled by the Python microservice at localhost:5001

  // Generate embeddings for resume
  async generateResumeEmbeddings(parsedData) {
    try {
      const model = getEmbeddingsModel();
      
      // Create a comprehensive text representation of the resume
      const resumeText = this.createResumeEmbeddingText(parsedData);
      
      const result = await model.embedContent(resumeText);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate resume embeddings: ' + error.message);
    }
  }

  // Create text representation for embeddings
  createResumeEmbeddingText(parsedData) {
    const parts = [];
    
    if (parsedData.summary) {
      parts.push(parsedData.summary);
    }
    
    if (parsedData.skills && parsedData.skills.length > 0) {
      const skillsText = parsedData.skills.map(skill => skill.name).join(', ');
      parts.push(`Skills: ${skillsText}`);
    }
    
    if (parsedData.experience && parsedData.experience.length > 0) {
      const experienceText = parsedData.experience.map(exp => 
        `${exp.position} at ${exp.company}: ${exp.description}`
      ).join('. ');
      parts.push(experienceText);
    }
    
    if (parsedData.education && parsedData.education.length > 0) {
      const educationText = parsedData.education.map(edu => 
        `${edu.degree} in ${edu.field} from ${edu.institution}`
      ).join('. ');
      parts.push(educationText);
    }
    
    if (parsedData.projects && parsedData.projects.length > 0) {
      const projectsText = parsedData.projects.map(proj => 
        `${proj.name}: ${proj.description}`
      ).join('. ');
      parts.push(projectsText);
    }
    
    return parts.join('. ');
  }

  // Analyze resume quality and provide suggestions
  async analyzeResumeQuality(parsedData) {
    try {
      const model = getGeminiFlashLite();
      
      const prompt = `
        Analyze the following parsed resume data and provide quality assessment and improvement suggestions.
        
        Resume Data:
        ${JSON.stringify(parsedData, null, 2)}
        
        Please provide analysis in the following JSON format (no additional text):
        {
          "overallScore": 85,
          "strengths": [
            "Strong technical skills in modern technologies",
            "Good project portfolio",
            "Clear career progression"
          ],
          "improvements": [
            "Add more quantified achievements",
            "Include relevant certifications",
            "Improve summary section"
          ],
          "careerSuggestions": [
            "Consider pursuing cloud certifications",
            "Focus on leadership roles",
            "Expand full-stack development skills"
          ]
        }
        
        Scoring criteria:
        - Completeness of information (25%)
        - Quality of experience descriptions (25%)
        - Skills relevance and depth (20%)
        - Education alignment (15%)
        - Projects and achievements (15%)
        
        Score scale: 0-100
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Resume analysis error:', error);
      throw new Error('Failed to analyze resume quality: ' + error.message);
    }
  }
}

module.exports = new ResumeParserService();
