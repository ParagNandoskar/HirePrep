const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const STORAGE_TYPE = process.env.STORAGE_TYPE || 's3';
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || 'uploads';

// Initialize S3 client (conditionally)
let s3;
if (STORAGE_TYPE !== 'local') {
    s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
    });
}

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'hireprep-interview-videos';

class VideoUploadService {
    /**
     * Upload video blob to S3 or Local Storage
     * @param {Buffer} videoBuffer - Video file buffer
     * @param {string} candidateId - Candidate ID
     * @param {string} interviewId - Interview ID
     * @param {string} questionNumber - Question number (1-5)
     * @returns {Promise<string>} - URL of uploaded video
     */
    async uploadVideo(videoBuffer, candidateId, interviewId, questionNumber) {
        try {
            const fileName = `interviews/${candidateId}/${interviewId}/question-${questionNumber}-${Date.now()}.webm`;

            if (STORAGE_TYPE === 'local') {
                const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
                const dir = path.dirname(filePath);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(filePath, videoBuffer);
                console.log(`✅ Video saved locally: ${filePath}`);
                // Return relative path for client
                return `/uploads/${fileName}`;
            }

            const params = {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: videoBuffer,
                ContentType: 'video/webm',
                ACL: 'private', // Keep videos private
                Metadata: {
                    candidateId: candidateId.toString(),
                    interviewId: interviewId,
                    questionNumber: questionNumber.toString(),
                    uploadedAt: new Date().toISOString()
                }
            };

            const result = await s3.upload(params).promise();
            console.log(`✅ Video uploaded successfully: ${result.Location}`);

            return result.Location; // Returns full S3 URL
        } catch (error) {
            console.error('❌ Video upload error:', error.message);
            throw new Error(`Failed to upload video: ${error.message}`);
        }
    }

    /**
     * Upload audio blob to S3 or Local Storage
     * @param {Buffer} audioBuffer - Audio file buffer
     * @param {string} candidateId - Candidate ID
     * @param {string} interviewId - Interview ID
     * @param {string} questionNumber - Question number
     * @returns {Promise<string>} - URL of uploaded audio
     */
    async uploadAudio(audioBuffer, candidateId, interviewId, questionNumber) {
        try {
            const fileName = `interviews/${candidateId}/${interviewId}/audio-${questionNumber}-${Date.now()}.webm`;

            if (STORAGE_TYPE === 'local') {
                const filePath = path.join(LOCAL_UPLOAD_DIR, fileName);
                const dir = path.dirname(filePath);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(filePath, audioBuffer);
                console.log(`✅ Audio saved locally: ${filePath}`);
                return `/uploads/${fileName}`;
            }

            const params = {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: audioBuffer,
                ContentType: 'audio/webm',
                ACL: 'private',
                Metadata: {
                    candidateId: candidateId.toString(),
                    interviewId: interviewId,
                    questionNumber: questionNumber.toString(),
                    uploadedAt: new Date().toISOString()
                }
            };

            const result = await s3.upload(params).promise();
            console.log(`✅ Audio uploaded successfully: ${result.Location}`);

            return result.Location;
        } catch (error) {
            console.error('❌ Audio upload error:', error.message);
            throw new Error(`Failed to upload audio: ${error.message}`);
        }
    }

    /**
     * Get signed URL for video access (temporary access) or local path
     * @param {string} videoUrl - S3 video URL or local path
     * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
     * @returns {Promise<string>} - Signed URL or local path
     */
    async getSignedUrl(videoUrl, expiresIn = 3600) {
        try {
            if (STORAGE_TYPE === 'local') {
                return videoUrl; // Already a relative path served statically
            }

            // Extract key from full S3 URL
            const key = videoUrl.split('.com/')[1];

            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
                Expires: expiresIn
            };

            const signedUrl = await s3.getSignedUrlPromise('getObject', params);
            return signedUrl;
        } catch (error) {
            console.error('❌ Signed URL generation error:', error.message);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    /**
     * Delete video from S3 or Local Storage
     * @param {string} videoUrl - S3 video URL or local path
     * @returns {Promise<boolean>} - Success status
     */
    async deleteVideo(videoUrl) {
        try {
            if (STORAGE_TYPE === 'local') {
                // Remove '/uploads/' prefix if present to get relative path from upload dir
                const relativePath = videoUrl.replace(/^\/uploads\//, '');
                const filePath = path.join(LOCAL_UPLOAD_DIR, relativePath);

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`✅ Video deleted locally: ${filePath}`);
                }
                return true;
            }

            const key = videoUrl.split('.com/')[1];

            const params = {
                Bucket: BUCKET_NAME,
                Key: key
            };

            await s3.deleteObject(params).promise();
            console.log(`✅ Video deleted successfully: ${key}`);
            return true;
        } catch (error) {
            console.error('❌ Video deletion error:', error.message);
            return false;
        }
    }

    /**
     * Delete all videos for an interview
     * @param {string} candidateId - Candidate ID
     * @param {string} interviewId - Interview ID
     * @returns {Promise<number>} - Number of deleted videos
     */
    async deleteInterviewVideos(candidateId, interviewId) {
        try {
            const prefix = `interviews/${candidateId}/${interviewId}/`;

            if (STORAGE_TYPE === 'local') {
                const dirPath = path.join(LOCAL_UPLOAD_DIR, prefix);
                if (fs.existsSync(dirPath)) {
                    // Use fs.rm with recursive: true (Node.js 14+)
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    console.log(`✅ Deleted directory locally: ${dirPath}`);
                    return 1; // Count is approximate for directories
                }
                return 0;
            }

            const listParams = {
                Bucket: BUCKET_NAME,
                Prefix: prefix
            };

            const listedObjects = await s3.listObjectsV2(listParams).promise();

            if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
                console.log('No videos found to delete');
                return 0;
            }

            const deleteParams = {
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
                }
            };

            await s3.deleteObjects(deleteParams).promise();
            console.log(`✅ Deleted ${listedObjects.Contents.length} videos for interview ${interviewId}`);

            return listedObjects.Contents.length;
        } catch (error) {
            console.error('❌ Batch video deletion error:', error.message);
            return 0;
        }
    }
}

module.exports = new VideoUploadService();
