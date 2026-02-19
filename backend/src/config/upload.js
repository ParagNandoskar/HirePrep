const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadProfileImageToS3 } = require('./aws');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/profile-images'); // Fixed path - go up to backend root
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Local storage configuration as fallback
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const fileName = `profile-${timestamp}-${randomString}${fileExtension}`;
    cb(null, fileName);
  }
});

// Local upload configuration
const uploadProfileImageLocal = multer({
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

// Smart upload middleware that tries S3 first, falls back to local
const smartUploadMiddleware = (req, res, next) => {
  // Check if AWS credentials are available
  const hasAWSConfig = process.env.AWS_S3_BUCKET && 
                      process.env.AWS_REGION && 
                      process.env.AWS_ACCESS_KEY_ID && 
                      process.env.AWS_SECRET_ACCESS_KEY;

  if (hasAWSConfig) {
    console.log('📸 Using S3 upload (like resume uploads)');
    // Try S3 upload first - using same strategy as resume uploads
    uploadProfileImageToS3.single('profileImage')(req, res, (err) => {
      if (err) {
        console.error('❌ S3 upload failed, falling back to local storage:', err.message);
        // Fall back to local storage
        uploadProfileImageLocal.single('profileImage')(req, res, (localErr) => {
          if (localErr) {
            console.error('❌ Local upload also failed:', localErr.message);
            return res.status(500).json({ error: 'File upload failed: ' + localErr.message });
          }
          // Mark as local upload for controller
          req.isLocalUpload = true;
          next();
        });
      } else {
        // S3 upload successful
        req.isLocalUpload = false;
        next();
      }
    });
  } else {
    console.log('📸 AWS not configured, using local storage');
    // Use local storage directly
    uploadProfileImageLocal.single('profileImage')(req, res, (err) => {
      if (err) {
        console.error('❌ Local upload failed:', err.message);
        return res.status(500).json({ error: 'File upload failed: ' + err.message });
      }
      req.isLocalUpload = true;
      next();
    });
  }
};

module.exports = {
  smartUploadMiddleware,
  uploadProfileImageLocal,
  uploadDir
};