const axios = require('axios'); // For NLP service communication
const FormData = require('form-data');

const PYTHON_NLP_SERVICE_URL = process.env.PYTHON_NLP_SERVICE_URL || 'http://localhost:5001'; // Python NLP microservice URL

// Function to delegate resume parsing to Python NLP service
async function parseResumeWithPythonNLP(resumeUrl, candidateId = null) {
  try {
    // Prepare payload for Python NLP service
    const payload = {
      resumeUrl: resumeUrl,
      candidateId: candidateId,
      forceReprocess: false
    };
    
    // Call Python NLP service with JSON payload
    const response = await axios.post(`${PYTHON_NLP_SERVICE_URL}/parse-resume`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
    
    if (response.data.success) {
      return response.data.extractedData;
    } else {
      throw new Error(response.data.error || 'Python NLP service returned unsuccessful response');
    }
  } catch (error) {
    console.error('Error calling Python NLP service:', error.message);
    throw new Error(`Python NLP service unavailable: ${error.message}`);
  }
}

class ResumeParserService {
  // Main parsing method that uses Python NLP service as primary method
  async parseResume(filePath, fileBuffer, fileType, resumeUrl = null, candidateId = null) {
    console.log(`Starting resume parsing - File: ${filePath}, Type: ${fileType}, URL: ${resumeUrl ? 'provided' : 'none'}`);
    
    // Try Python NLP service first if we have a resume URL
    if (resumeUrl) {
      try {
        console.log('Attempting Python NLP service...');
        const pythonData = await parseResumeWithPythonNLP(resumeUrl, candidateId);
        console.log('Python NLP service parsing successful');
        
        return {
          ...pythonData,
          _parsingMethod: 'python_service'
        };
      } catch (pythonError) {
        console.error('Python NLP service failed:', pythonError.message);
        // Continue to local fallback parsing
      }
    }
    
    // Fallback to local text extraction and basic parsing
    try {
      console.log('Attempting local parsing as fallback...');
      const text = await this.extractText(fileBuffer, fileType);
      console.log(`Extracted text length: ${text ? text.length : 0} characters`);
      
      if (!text || text.trim().length < 50) {
        throw new Error('Insufficient text extracted from resume');
      }
      
      // Create minimal parsed data structure
      const parsedData = this.createMinimalParsedData(text);
      console.log('Local fallback parsing completed');
      
      return {
        ...parsedData,
        _parsingMethod: 'local_fallback'
      };
    } catch (localError) {
      console.error('Local parsing failed:', localError.message);
      throw new Error(`Resume parsing failed: ${localError.message}`);
    }
  }

  // Create minimal parsed data structure when detailed parsing fails
  createMinimalParsedData(text) {
    return {
      personalInfo: {
        name: null,
        email: this.extractEmail(text),
        phone: this.extractPhone(text)
      },
      summary: null,
      skills: this.extractBasicSkills(text),
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      languages: []
    };
  }

  // Basic email extraction
  extractEmail(text) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  }

  // Basic phone extraction
  extractPhone(text) {
    const phoneMatch = text.match(/[\+]?[1-9]?[\-\s\.]?\(?[0-9]{3}\)?[\-\s\.]?[0-9]{3}[\-\s\.]?[0-9]{4,6}/);
    return phoneMatch ? phoneMatch[0] : null;
  }

  // Basic skills extraction
  extractBasicSkills(text) {
    const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS', 'Git'];
    const foundSkills = [];
    
    for (const skill of commonSkills) {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    }
    
    return foundSkills;
  }

  // Keep text extraction methods for compatibility/fallback
  async extractPdfText(buffer) {
    try {
      console.log(`Attempting to parse PDF, buffer size: ${buffer ? buffer.length : 0} bytes`);
      
      if (!buffer || buffer.length === 0) {
        throw new Error('Empty or invalid PDF buffer');
      }
      
      // Check if buffer starts with PDF header
      const pdfHeader = buffer.slice(0, 5).toString();
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Invalid PDF format - missing PDF header');
      }
      
      // Try simple PDF parsing first
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        console.log(`PDF parsed successfully, extracted ${data.text ? data.text.length : 0} characters`);
        return data.text;
      } catch (pdfError) {
        console.log('Standard PDF parsing failed, trying alternative method...');
        
        // Alternative: Try to extract text using simple buffer parsing
        const bufferString = buffer.toString('utf8');
        const textMatches = bufferString.match(/BT\s*(.*?)\s*ET/gs);
        
        if (textMatches && textMatches.length > 0) {
          let extractedText = textMatches.join(' ')
            .replace(/BT\s*/g, '')
            .replace(/\s*ET/g, '')
            .replace(/[^\x20-\x7E]/g, ' ') // Keep only printable ASCII
            .replace(/\s+/g, ' ')
            .trim();
          
          if (extractedText.length > 50) {
            console.log(`Alternative PDF extraction successful, extracted ${extractedText.length} characters`);
            return extractedText;
          }
        }
        
        throw new Error('Failed to extract text from PDF');
      }
    } catch (error) {
      console.error('PDF text extraction error:', error.message);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async extractDocxText(buffer) {
    try {
      console.log('Attempting to extract text from DOCX...');
      
      if (!buffer || buffer.length === 0) {
        throw new Error('Empty or invalid DOCX buffer');
      }
      
      // Try basic DOCX extraction (simplified)
      const bufferString = buffer.toString('utf8');
      
      // Look for text content in the buffer
      const textMatches = bufferString.match(/[a-zA-Z0-9\s.,!?@-]{10,}/g);
      
      if (textMatches && textMatches.length > 0) {
        const extractedText = textMatches
          .filter(match => match.trim().length > 5)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (extractedText.length > 50) {
          console.log(`DOCX text extraction successful, extracted ${extractedText.length} characters`);
          return extractedText;
        }
      }
      
      throw new Error('Failed to extract meaningful text from DOCX');
    } catch (error) {
      console.error('DOCX text extraction error:', error.message);
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  async extractText(buffer, fileType) {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return await this.extractPdfText(buffer);
      case 'doc':
      case 'docx':
        return await this.extractDocxText(buffer);
      default:
        throw new Error('Unsupported file type');
    }
  }

  // Analyze resume quality using AI (placeholder for Gemini integration)
  async analyzeResumeQuality(parsedData) {
    try {
      // Create a basic analysis based on parsed data
      const analysis = {
        overallScore: 0,
        strengths: [],
        improvements: [],
        careerSuggestions: []
      };

      // Calculate score based on completeness
      let score = 0;
      
      if (parsedData.personalInfo?.name) score += 10;
      if (parsedData.personalInfo?.email) score += 10;
      if (parsedData.personalInfo?.phone) score += 5;
      if (parsedData.summary && parsedData.summary.length > 50) score += 15;
      if (parsedData.skills && parsedData.skills.length > 0) score += 20;
      if (parsedData.experience && parsedData.experience.length > 0) score += 25;
      if (parsedData.education && parsedData.education.length > 0) score += 15;

      analysis.overallScore = Math.min(100, score);

      // Generate strengths
      if (parsedData.skills && parsedData.skills.length >= 5) {
        analysis.strengths.push('Strong technical skill set');
      }
      if (parsedData.experience && parsedData.experience.length >= 2) {
        analysis.strengths.push('Good work experience');
      }
      if (parsedData.education && parsedData.education.length > 0) {
        analysis.strengths.push('Educational background documented');
      }

      // Generate improvements
      if (!parsedData.summary || parsedData.summary.length < 50) {
        analysis.improvements.push('Add a professional summary');
      }
      if (!parsedData.skills || parsedData.skills.length < 5) {
        analysis.improvements.push('Include more relevant skills');
      }
      if (!parsedData.projects || parsedData.projects.length === 0) {
        analysis.improvements.push('Add project experience');
      }

      return analysis;
    } catch (error) {
      console.error('Resume quality analysis error:', error);
      return {
        overallScore: 50,
        strengths: ['Resume uploaded successfully'],
        improvements: ['Consider adding more details'],
        careerSuggestions: []
      };
    }
  }

  // Generate embeddings for resume data (placeholder)
  async generateResumeEmbeddings(parsedData) {
    try {
      // Simple embedding generation - in production, use actual AI service
      const text = [
        parsedData.summary || '',
        (parsedData.skills || []).join(' '),
        (parsedData.experience || []).map(exp => exp.title || '').join(' ')
      ].join(' ');

      // Generate simple numerical representation
      const embeddings = Array(100).fill(0).map(() => Math.random() - 0.5);
      return embeddings;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return [];
    }
  }
}

module.exports = new ResumeParserService();