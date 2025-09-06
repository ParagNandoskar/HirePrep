const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/resumes'),
    path.join(__dirname, '../uploads/logos')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = file.fieldname === 'logo' 
      ? path.join(__dirname, '../uploads/logos')
      : path.join(__dirname, '../uploads/resumes');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${userId}_${timestamp}_${sanitizedName}`;
    cb(null, filename);
  }
});

// Resume upload configuration
const resumeUpload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Company logo upload configuration
const logoUpload = multer({
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedImageTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Allowed types: jpg, jpeg, png, gif, svg'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for images
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large', 
        maxSize: `${parseInt(process.env.MAX_FILE_SIZE || 10485760) / (1024 * 1024)}MB` 
      });
    }
    return res.status(400).json({ message: error.message });
  }
  
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  
  next();
};

// Helper function to delete local file
const deleteLocalFile = async (filename) => {
  try {
    const resumePath = path.join(__dirname, '../uploads/resumes', filename);
    const logoPath = path.join(__dirname, '../uploads/logos', filename);
    
    if (fs.existsSync(resumePath)) {
      fs.unlinkSync(resumePath);
      return true;
    }
    
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};

module.exports = {
  resumeUpload,
  logoUpload,
  handleUploadError,
  deleteLocalFile
};
