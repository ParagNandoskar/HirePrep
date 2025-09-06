const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resumeUpload, handleUploadError, deleteLocalFile } = require('../middleware/upload');
const Candidate = require('../models/Candidate');
const axios = require('axios');

const router = express.Router();

// @route   GET /api/resumes
// @desc    Get candidate's resumes
// @access  Private (Candidate only)
router.get('/', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id });
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    // For now, return resume info if it exists and has actual file data
    const resumes = [];
    if (candidate.resume && candidate.resume.originalName && candidate.resume.uploadDate) {
      resumes.push({
        _id: candidate._id,
        filename: candidate.resume.originalName || candidate.resume.filename || 'Resume',
        fileUrl: candidate.resume.localPath ? `/api/resumes/view/${candidate._id}` : candidate.resume.s3Url,
        uploadDate: candidate.resume.uploadDate || candidate.createdAt,
        parsedData: candidate.resume.parsedData,
        size: candidate.resume.size
      });
    }

    res.json({
      success: true,
      resumes: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resumes' });
  }
});

// @route   DELETE /api/resumes/:id
// @desc    Delete candidate's resume
// @access  Private (Candidate only)
router.delete('/:id', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the candidate
    const candidate = await Candidate.findOne({ user: req.user._id });
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    // Check if the candidate has a resume and if the ID matches
    if (!candidate.resume || candidate._id.toString() !== id) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Delete the local file if it exists
    if (candidate.resume.localPath || candidate.resume.filename) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Try to delete using the full localPath first
        if (candidate.resume.localPath && fs.existsSync(candidate.resume.localPath)) {
          fs.unlinkSync(candidate.resume.localPath);
          console.log('Deleted file:', candidate.resume.localPath);
        } 
        // Fallback to constructing path from filename
        else if (candidate.resume.filename) {
          const fallbackPath = path.join(__dirname, '../uploads/resumes', candidate.resume.filename);
          if (fs.existsSync(fallbackPath)) {
            fs.unlinkSync(fallbackPath);
            console.log('Deleted file:', fallbackPath);
          }
        }
      } catch (fileError) {
        console.log('File deletion error (non-critical):', fileError.message);
      }
    }

    // Remove resume from candidate - clear all resume fields
    candidate.resume.originalName = undefined;
    candidate.resume.filename = undefined;
    candidate.resume.mimeType = undefined;
    candidate.resume.size = undefined;
    candidate.resume.localPath = undefined;
    candidate.resume.s3Key = undefined;
    candidate.resume.s3Url = undefined;
    candidate.resume.uploadDate = undefined;
    candidate.resume.extractedData = {
      skills: [],
      certifications: [],
      experience: [],
      education: []
    };
    candidate.resume.nlpScore = undefined;
    candidate.markModified('resume');
    await candidate.save();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete resume' });
  }
});

// @route   POST /api/resumes/upload
// @desc    Upload candidate's resume
// @access  Private (Candidate only)
router.post('/upload', authenticateToken, authorizeRole('candidate'), (req, res) => {
  // Use multer middleware for file upload
  resumeUpload.single('resume')(req, res, async (err) => {
    // Handle multer errors
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No resume file uploaded' });
      }

      // Find or create candidate profile
      let candidate = await Candidate.findOne({ user: req.user._id });
      
      if (!candidate) {
        // Create basic candidate profile if it doesn't exist
        candidate = new Candidate({
          user: req.user._id,
          firstName: req.user.firstName || 'User',
          lastName: req.user.lastName || '',
          email: req.user.email
        });
      }

      // Update resume information
      if (!candidate.resume) {
        candidate.resume = {};
      }
      
      candidate.resume.filename = req.file.filename;
      candidate.resume.originalName = req.file.originalname;
      candidate.resume.mimeType = req.file.mimetype;
      candidate.resume.size = req.file.size;
      candidate.resume.localPath = req.file.path;
      candidate.resume.uploadDate = new Date();
      
      // Initialize extractedData if it doesn't exist
      if (!candidate.resume.extractedData) {
        candidate.resume.extractedData = {
          skills: [],
          certifications: [],
          experience: [],
          education: []
        };
      }
      
      candidate.resume.nlpScore = 0;
      candidate.markModified('resume');

      await candidate.save();

      res.status(201).json({
        success: true,
        message: 'Resume uploaded successfully',
        resume: {
          _id: candidate._id,
          filename: candidate.resume.filename,
          originalName: candidate.resume.originalName,
          uploadDate: candidate.resume.uploadDate,
          size: candidate.resume.size
        }
      });

    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload resume' });
    }
  });
});

// @route   POST /api/resumes/reprocess/:candidateId
// @desc    Reprocess resume with NLP service
// @access  Private (Admin or Candidate owner)
router.post('/reprocess/:candidateId', authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Check if user can access this candidate's resume
    let candidate;
    if (req.user.role === 'candidate') {
      candidate = await Candidate.findOne({ user: req.user._id, _id: candidateId });
    } else {
      // Allow companies to reprocess for their job applications
      candidate = await Candidate.findById(candidateId);
    }

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found or access denied' });
    }

    if (!candidate.resume || !candidate.resume.s3Url) {
      return res.status(400).json({ message: 'No resume found for processing' });
    }

    // Send to NLP service for reprocessing
    try {
      const nlpResponse = await axios.post(`${process.env.NLP_SERVICE_URL}/parse-resume`, {
        resumeUrl: candidate.resume.s3Url,
        candidateId: candidate._id.toString(),
        forceReprocess: true
      }, {
        timeout: 30000
      });

      if (nlpResponse.data.success) {
        // Update candidate with new extracted data
        candidate.resume.extractedData = nlpResponse.data.extractedData;
        candidate.resume.nlpScore = nlpResponse.data.score;
        candidate.resume.lastAnalyzed = new Date();
        
        await candidate.save();

        res.json({
          message: 'Resume reprocessed successfully',
          extractedData: candidate.resume.extractedData,
          nlpScore: candidate.resume.nlpScore,
          lastAnalyzed: candidate.resume.lastAnalyzed
        });
      } else {
        throw new Error(nlpResponse.data.error || 'NLP processing failed');
      }
    } catch (nlpError) {
      console.error('NLP reprocessing error:', nlpError.message);
      res.status(500).json({ 
        message: 'Failed to reprocess resume', 
        error: nlpError.message 
      });
    }
  } catch (error) {
    console.error('Resume reprocess error:', error);
    res.status(500).json({ message: 'Failed to reprocess resume' });
  }
});

// @route   GET /api/resumes/view/:id
// @desc    View/download resume file
// @access  Private (Candidate only)
router.get('/view/:id', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the candidate
    const candidate = await Candidate.findOne({ user: req.user._id });
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    // Check if the candidate has a resume and if the ID matches
    if (!candidate.resume || candidate._id.toString() !== id) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // If we have a local file, serve it
    if (candidate.resume.localPath) {
      const path = require('path');
      const fs = require('fs');
      
      const filePath = path.resolve(candidate.resume.localPath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Resume file not found on disk' });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', candidate.resume.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${candidate.resume.originalName || candidate.resume.filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      return;
    }

    // If we have S3 URL, redirect to it
    if (candidate.resume.s3Url) {
      return res.redirect(candidate.resume.s3Url);
    }

    res.status(404).json({ success: false, message: 'Resume file not available' });
  } catch (error) {
    console.error('View resume error:', error);
    res.status(500).json({ success: false, message: 'Failed to view resume' });
  }
});

// @route   GET /api/resumes/download/:candidateId
// @desc    Get resume download URL
// @access  Private (Candidate owner or Companies with applications)
router.get('/download/:candidateId', authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Check access permissions
    let hasAccess = false;
    
    if (req.user.role === 'candidate' && candidate.user.toString() === req.user._id.toString()) {
      hasAccess = true;
    } else if (req.user.role === 'company') {
      // Check if company has received application from this candidate
      const Company = require('../models/Company');
      const Job = require('../models/Job');
      
      const company = await Company.findOne({ user: req.user._id });
      if (company) {
        const jobsWithApplication = await Job.findOne({
          company: company._id,
          'applications.candidate': candidateId
        });
        
        if (jobsWithApplication) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!candidate.resume || !candidate.resume.s3Url) {
      return res.status(404).json({ message: 'No resume found' });
    }

    // Generate presigned URL for download
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: candidate.resume.s3Key,
      Expires: 3600, // 1 hour
      ResponseContentDisposition: `attachment; filename="${candidate.resume.originalName}"`
    };

    const downloadUrl = s3.getSignedUrl('getObject', params);

    res.json({
      downloadUrl,
      fileName: candidate.resume.originalName,
      fileSize: candidate.resume.fileSize,
      uploadDate: candidate.resume.uploadDate
    });
  } catch (error) {
    console.error('Resume download error:', error);
    res.status(500).json({ message: 'Failed to generate download URL' });
  }
});

// @route   GET /api/resumes/stats
// @desc    Get resume processing statistics
// @access  Private (Admin)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // This route could be restricted to admin users in a full implementation
    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: null,
          totalCandidates: { $sum: 1 },
          candidatesWithResumes: {
            $sum: {
              $cond: [{ $ifNull: ['$resume.s3Url', false] }, 1, 0]
            }
          },
          processedResumes: {
            $sum: {
              $cond: [{ $ifNull: ['$resume.extractedData', false] }, 1, 0]
            }
          },
          averageScore: {
            $avg: '$resume.nlpScore'
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalCandidates: 0,
      candidatesWithResumes: 0,
      processedResumes: 0,
      averageScore: 0
    };

    // Get score distribution
    const scoreDistribution = await Candidate.aggregate([
      { $match: { 'resume.nlpScore': { $exists: true } } },
      {
        $bucket: {
          groupBy: '$resume.nlpScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      ...result,
      scoreDistribution,
      processingRate: result.totalCandidates > 0 
        ? ((result.processedResumes / result.candidatesWithResumes) * 100).toFixed(1)
        : 0
    });
  } catch (error) {
    console.error('Resume stats error:', error);
    res.status(500).json({ message: 'Failed to fetch resume statistics' });
  }
});

module.exports = router;
