/**
 * Video Frame Extractor
 * Downloads video from S3 and extracts frames for analysis
 */

const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Extract frames from video URL
 * @param {string} videoUrl - S3 URL or local path
 * @param {number} fps - Frames per second to extract (default: 0.5 = 1 frame every 2 seconds)
 * @returns {Promise<Array<string>>} Array of base64 encoded frames
 */
const extractFramesFromVideo = async (videoUrl, fps = 0.5) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎬 EXTRACTING VIDEO FRAMES`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   Video URL: ${videoUrl}`);
  console.log(`   Target FPS: ${fps} (1 frame every ${Math.round(1/fps)}s)`);
  console.log(`${'='.repeat(70)}\n`);

  const tempDir = path.join(__dirname, '../../temp/frame-extraction');
  const sessionId = uuidv4();
  const sessionDir = path.join(tempDir, sessionId);
  const videoPath = path.join(sessionDir, 'video.mp4');
  const framesDir = path.join(sessionDir, 'frames');

  try {
    // Create temp directories
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.mkdir(framesDir, { recursive: true });

    // Download video from S3
    console.log('📥 Downloading video from S3...');
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: 60000 // 1 minute timeout
    });

    // Save video to temp file
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('✅ Video downloaded successfully');

    // Extract frames using ffmpeg
    console.log('🎞️  Extracting frames with ffmpeg...');
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps}`,  // Extract at specified FPS
          '-vf scale=640:480',  // Resize to standard size
          '-q:v 2'  // High quality
        ])
        .output(path.join(framesDir, 'frame-%04d.jpg'))
        .on('end', () => {
          console.log('✅ Frame extraction complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });

    // Read extracted frames and convert to base64
    console.log('📦 Converting frames to base64...');
    const frameFiles = await fs.promises.readdir(framesDir);
    const sortedFrames = frameFiles
      .filter(f => f.endsWith('.jpg'))
      .sort();

    console.log(`   Found ${sortedFrames.length} frames`);

    const base64Frames = [];
    for (const frameFile of sortedFrames) {
      const framePath = path.join(framesDir, frameFile);
      const frameBuffer = await fs.promises.readFile(framePath);
      const base64 = frameBuffer.toString('base64');
      base64Frames.push(base64);
    }

    console.log(`\n✅ EXTRACTION COMPLETE`);
    console.log(`   Total frames: ${base64Frames.length}`);
    console.log(`   Average frame size: ${Math.round(base64Frames[0]?.length / 1024) || 0} KB`);
    console.log(`${'='.repeat(70)}\n`);

    // Cleanup temp files
    await cleanupTempDir(sessionDir);

    return base64Frames;

  } catch (error) {
    console.error(`\n❌ FRAME EXTRACTION FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`${'='.repeat(70)}\n`);

    // Cleanup on error
    try {
      await cleanupTempDir(sessionDir);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }

    throw error;
  }
};

/**
 * Cleanup temporary directory
 */
const cleanupTempDir = async (dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      console.log('🗑️  Temp files cleaned up');
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

/**
 * Extract audio from video URL
 * @param {string} videoUrl - S3 URL or local path
 * @returns {Promise<string>} Base64 encoded audio (WAV format)
 */
const extractAudioFromVideo = async (videoUrl) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎤 EXTRACTING AUDIO FROM VIDEO`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   Video URL: ${videoUrl}`);
  console.log(`${'='.repeat(70)}\n`);

  const tempDir = path.join(__dirname, '../../temp/audio-extraction');
  const sessionId = uuidv4();
  const sessionDir = path.join(tempDir, sessionId);
  const videoPath = path.join(sessionDir, 'video.mp4');
  const audioPath = path.join(sessionDir, 'audio.wav');

  try {
    // Create temp directory
    await fs.promises.mkdir(sessionDir, { recursive: true });

    // Download video from S3
    console.log('📥 Downloading video from S3...');
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: 60000
    });

    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('✅ Video downloaded successfully');

    // Extract audio using ffmpeg
    console.log('🎵 Extracting audio with ffmpeg...');
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-vn',  // No video
          '-acodec pcm_s16le',  // PCM codec
          '-ar 16000',  // 16kHz sample rate
          '-ac 1'  // Mono
        ])
        .output(audioPath)
        .on('end', () => {
          console.log('✅ Audio extraction complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });

    // Read audio file and convert to base64
    console.log('📦 Converting audio to base64...');
    const audioBuffer = await fs.promises.readFile(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    console.log(`\n✅ AUDIO EXTRACTION COMPLETE`);
    console.log(`   Audio size: ${Math.round(base64Audio.length / 1024)} KB`);
    console.log(`${'='.repeat(70)}\n`);

    // Cleanup temp files
    await cleanupTempDir(sessionDir);

    return base64Audio;

  } catch (error) {
    console.error(`\n❌ AUDIO EXTRACTION FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`${'='.repeat(70)}\n`);

    // Cleanup on error
    try {
      await cleanupTempDir(sessionDir);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }

    throw error;
  }
};

module.exports = {
  extractFramesFromVideo,
  extractAudioFromVideo
};
