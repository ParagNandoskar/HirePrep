/**
 * Speech-to-Text Service
 * Transcribes video/audio recordings to text using Google Cloud Speech-to-Text
 * 
 * Cost: ~$0.024 per minute of audio
 * Processing Time: 30-60 seconds per minute of audio
 */

const axios = require('axios');
const { Storage } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Choose your STT provider (uncomment one):

// Option 1: Google Cloud Speech-to-Text (Recommended - Best accuracy)
// const speech = require('@google-cloud/speech');
// const client = new speech.SpeechClient();

// Option 2: AWS Transcribe
// const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe');

// Option 3: AssemblyAI (Easy to use, good accuracy)
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

// Option 4: Deepgram (Cheapest option - $0.0125/min)
// const { Deepgram } = require('@deepgram/sdk');

/**
 * Download video from S3 to temp file
 */
const downloadVideoFromS3 = async (videoUrl) => {
  try {
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const tempFilePath = path.join(os.tmpdir(), `video-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, response.data);
    return tempFilePath;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw new Error('Failed to download video for transcription');
  }
};

/**
 * Extract audio from video file
 * Note: For production, use ffmpeg to extract audio properly
 * For now, we'll send the video directly as most STT services handle it
 */
const extractAudioFromVideo = async (videoPath) => {
  // TODO: Use ffmpeg to extract audio track
  // For now, return video path (STT services can handle video files)
  return videoPath;
};

/**
 * Transcribe using AssemblyAI (Easy Setup)
 */
const transcribeWithAssemblyAI = async (audioUrl) => {
  try {
    // Step 1: Upload audio to AssemblyAI
    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      fs.readFileSync(audioUrl),
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream'
        }
      }
    );

    const uploadUrl = uploadResponse.data.upload_url;

    // Step 2: Request transcription
    const transcriptResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadUrl,
        language_code: 'en',
        punctuate: true,
        format_text: true
      },
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    const transcriptId = transcriptResponse.data.id;

    // Step 3: Poll for completion
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5s intervals)

    while (attempts < maxAttempts) {
      const statusResponse = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'authorization': ASSEMBLYAI_API_KEY
          }
        }
      );

      const status = statusResponse.data.status;

      if (status === 'completed') {
        transcript = statusResponse.data;
        break;
      } else if (status === 'error') {
        throw new Error('Transcription failed: ' + statusResponse.data.error);
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    if (!transcript) {
      throw new Error('Transcription timed out');
    }

    return {
      text: transcript.text,
      confidence: transcript.confidence,
      duration: transcript.audio_duration,
      language: 'en-US',
      words: transcript.words // Word-level timestamps
    };

  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw error;
  }
};

/**
 * Transcribe using Google Cloud Speech-to-Text (Best Quality)
 * Uncomment this if you want to use Google Cloud
 */
/*
const transcribeWithGoogle = async (audioPath) => {
  try {
    const audioBytes = fs.readFileSync(audioPath).toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'video', // Optimized for video content
        useEnhanced: true, // Better quality (slightly more expensive)
      },
    };

    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join(' ');

    const confidence = response.results.length > 0
      ? response.results[0].alternatives[0].confidence
      : 0;

    return {
      text: transcription,
      confidence: confidence,
      language: 'en-US',
      duration: null // Google doesn't return duration in basic API
    };

  } catch (error) {
    console.error('Google transcription error:', error);
    throw error;
  }
};
*/

/**
 * Main transcription function - handles video URL and returns transcript
 */
const transcribeVideo = async (videoUrl) => {
  try {
    console.log('🎤 Starting transcription for:', videoUrl);

    // Download video to temp file
    const videoPath = await downloadVideoFromS3(videoUrl);
    
    // Transcribe (choose your provider)
    let transcription;
    
    if (ASSEMBLYAI_API_KEY) {
      // Using AssemblyAI
      transcription = await transcribeWithAssemblyAI(videoPath);
    } else {
      // Fallback: Return mock data for development
      console.warn('⚠️ No STT API key configured, using mock transcription');
      transcription = {
        text: '[Transcription service not configured. This is a mock transcript for development.]',
        confidence: 0,
        duration: 120,
        language: 'en-US',
        isMock: true
      };
    }

    // Clean up temp file
    fs.unlinkSync(videoPath);

    console.log('✅ Transcription complete:', {
      length: transcription.text.length,
      confidence: transcription.confidence,
      duration: transcription.duration
    });

    return transcription;

  } catch (error) {
    console.error('❌ Transcription failed:', error);
    
    // Return error transcript instead of failing completely
    return {
      text: '[Transcription failed. Please check video quality and try again.]',
      confidence: 0,
      duration: 0,
      language: 'en-US',
      error: error.message
    };
  }
};

/**
 * Batch transcribe multiple videos in parallel
 */
const transcribeMultipleVideos = async (videoUrls) => {
  try {
    console.log(`🎤 Starting batch transcription for ${videoUrls.length} videos`);
    
    // Process in parallel (max 3 at a time to avoid rate limits)
    const batchSize = 3;
    const results = [];
    
    for (let i = 0; i < videoUrls.length; i += batchSize) {
      const batch = videoUrls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => transcribeVideo(url))
      );
      results.push(...batchResults);
    }
    
    console.log(`✅ Batch transcription complete: ${results.length} videos`);
    return results;

  } catch (error) {
    console.error('❌ Batch transcription failed:', error);
    throw error;
  }
};

/**
 * Transcribe audio blob directly (for real-time use)
 */
const transcribeAudioBlob = async (audioBlob) => {
  try {
    // Save blob to temp file
    const tempPath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempPath, audioBlob);
    
    // Transcribe
    const transcription = await transcribeVideo(tempPath);
    
    // Clean up
    fs.unlinkSync(tempPath);
    
    return transcription;

  } catch (error) {
    console.error('Blob transcription error:', error);
    throw error;
  }
};

/**
 * Get estimated transcription time
 */
const estimateTranscriptionTime = (videoDurationSeconds) => {
  // Rule of thumb: 30-60 seconds per minute of video
  const minutes = videoDurationSeconds / 60;
  const estimatedSeconds = minutes * 45; // Average
  return Math.ceil(estimatedSeconds);
};

/**
 * Calculate transcription cost
 */
const estimateTranscriptionCost = (videoDurationSeconds) => {
  const minutes = videoDurationSeconds / 60;
  
  // AssemblyAI: $0.37/hour = $0.00617/min
  // Google: $0.024/min
  // AWS Transcribe: $0.024/min
  // Deepgram: $0.0125/min (cheapest)
  
  const pricePerMinute = 0.0125; // Deepgram pricing
  return (minutes * pricePerMinute).toFixed(4);
};

module.exports = {
  transcribeVideo,
  transcribeMultipleVideos,
  transcribeAudioBlob,
  estimateTranscriptionTime,
  estimateTranscriptionCost,
  downloadVideoFromS3,
  extractAudioFromVideo
};
