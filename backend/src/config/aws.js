const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Storage Configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 's3';
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || 'uploads';

// Ensure local upload directory exists
if (STORAGE_TYPE === 'local') {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

// Configure S3 Client (AWS SDK v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
  }
});

// Custom multer storage engine for S3 using AWS SDK v3
const s3StorageEngine = (options = {}) => {
  const { folder = 'uploads', allowedTypes = [], maxSize = 10 * 1024 * 1024 } = options;

  return {
    _handleFile: async (req, file, cb) => {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${timestamp}-${randomString}${fileExtension}`;

        // Buffer the file stream
        const chunks = [];
        file.stream.on('data', (chunk) => chunks.push(chunk));
        file.stream.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);

            // Create upload parameters
            const uploadParams = {
              Bucket: process.env.AWS_S3_BUCKET,
              Key: fileName,
              Body: buffer,
              ContentType: file.mimetype,
              // Add cache control for better performance
              CacheControl: 'max-age=31536000', // 1 year cache
              Metadata: {
                fieldName: file.fieldname,
                uploadTime: new Date().toISOString(),
                userId: req.user ? req.user.id : 'anonymous',
                originalName: file.originalname,
                publicAccess: folder === 'profile-images' ? 'true' : 'false'
              }
            };

            // Upload to S3 using PutObjectCommand
            const command = new PutObjectCommand(uploadParams);
            const result = await s3Client.send(command);

            // Generate file URL
            const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

            // Return file info in multer format
            cb(null, {
              bucket: process.env.AWS_S3_BUCKET,
              key: fileName,
              location: fileUrl,
              etag: result.ETag,
              size: buffer.length
            });
          } catch (error) {
            console.error('❌ S3 Upload Error:', {
              message: error.message,
              code: error.code,
              statusCode: error.$metadata?.httpStatusCode,
              requestId: error.$metadata?.requestId,
              bucket: process.env.AWS_S3_BUCKET,
              region: process.env.AWS_REGION
            });
            cb(error);
          }
        });

        file.stream.on('error', (error) => {
          cb(error);
        });
      } catch (error) {
        cb(error);
      }
    },
    _removeFile: async (req, file, cb) => {
      try {
        if (file.key) {
          const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: file.key
          };
          const command = new DeleteObjectCommand(deleteParams);
          await s3Client.send(command);
        }
        cb(null);
      } catch (error) {
        cb(error);
      }
    }
  };
};

// Configurable Storage Factory
const getStorage = (options = {}) => {
  const { folder = 'uploads' } = options;

  if (STORAGE_TYPE === 'local') {
    // Ensure folder exists inside uploads/
    const targetDir = path.join(LOCAL_UPLOAD_DIR, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    return multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, targetDir);
      },
      filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = path.extname(file.originalname);
        const fileName = `${timestamp}-${randomString}${fileExtension}`;
        cb(null, fileName);
      }
    });
  } else {
    return s3StorageEngine(options);
  }
};

// Multer configuration for S3/Local
const uploadToS3 = multer({
  storage: getStorage({
    folder: 'resumes',
    allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024 // 10MB
  }),
  fileFilter: (req, file, cb) => {
    // Allow only PDF and DOCX files
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Multer configuration for profile image upload
const uploadProfileImageToS3 = multer({
  storage: getStorage({
    folder: 'profile-images',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024 // 5MB
  }),
  fileFilter: (req, file, cb) => {
    // Allow only image files
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

// Multer configuration for interview video upload
const uploadInterviewVideoToS3 = multer({
  storage: getStorage({
    folder: 'interview-videos',
    allowedTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024 // 100MB
  }),
  fileFilter: (req, file, cb) => {
    // Allow video files
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (WebM, MP4, MOV) are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
});

// Helper function to delete file from S3 or Local
const deleteFromS3 = async (fileKey) => {
  try {
    if (STORAGE_TYPE === 'local') {
      const filePath = path.join(LOCAL_UPLOAD_DIR, fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } else {
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileKey
      };

      const command = new DeleteObjectCommand(deleteParams);
      const result = await s3Client.send(command);
      return result;
    }
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// Helper function to get signed URL for secure file access (S3) or relative path (Local)
const getSignedFileUrl = async (fileKey, expiresIn = 3600) => {
  try {
    if (STORAGE_TYPE === 'local') {
      // Return local static path
      // construct full URL based on request if possible, but here we return relative path
      // Consumers should append base URL
      return `/uploads/${fileKey}`;
    } else {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileKey
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    }
  } catch (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// Helper function to get public file URL (for public files)
const getS3FileUrl = (fileKey) => {
  if (STORAGE_TYPE === 'local') {
    return `/uploads/${fileKey}`;
  }
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
};

// Helper function to extract file key from URL
const extractFileKeyFromUrl = (fileUrl) => {
  if (!fileUrl) return null;

  if (STORAGE_TYPE === 'local') {
    // Assuming URL format: .../uploads/folder/filename
    const parts = fileUrl.split('/uploads/');
    if (parts.length > 1) {
      return parts[1];
    }
    return null;
  }

  // Extract key from S3 URL
  const urlParts = fileUrl.split('/');
  const bucketIndex = urlParts.findIndex(part => part.includes(process.env.AWS_S3_BUCKET));

  if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
    return urlParts.slice(bucketIndex + 1).join('/');
  }

  return null;
};

// Helper function to check if S3 bucket exists and is accessible using SDK v3
const checkS3Connection = async () => {
  if (STORAGE_TYPE === 'local') {
    return { success: true, message: 'Local storage configured' };
  }
  try {
    const command = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET
    });

    await s3Client.send(command);
    return { success: true, message: 'S3 bucket is accessible' };
  } catch (error) {
    return {
      success: false,
      message: `S3 connection failed: ${error.message}`,
      error: error
    };
  }
};

// Helper function to set bucket policy for public read access to profile images
const setS3BucketPolicy = async () => {
  if (STORAGE_TYPE === 'local') {
    return { success: true, message: 'Skipped for local storage' };
  }
  try {
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${process.env.AWS_S3_BUCKET}/profile-images/*`
        }
      ]
    };

    const command = new PutBucketPolicyCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Policy: JSON.stringify(bucketPolicy)
    });

    await s3Client.send(command);
    return { success: true, message: 'Bucket policy updated for public profile images' };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update bucket policy: ${error.message}`,
      error: error
    };
  }
};

module.exports = {
  s3Client,
  uploadToS3,
  uploadProfileImageToS3,
  uploadInterviewVideoToS3,
  deleteFromS3,
  getSignedFileUrl,
  getS3FileUrl,
  extractFileKeyFromUrl,
  checkS3Connection,
  setS3BucketPolicy
};