import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';

/**
 * Get video metadata using ffprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<Object>} Video metadata
 */
async function getVideoMetadata(filePath) {
    try {
        const ffprobe = promisify(ffmpeg.ffprobe);
        const data = await ffprobe(filePath);

        const videoStream = data.streams.find(stream => stream.codec_type === 'video');
        const audioStream = data.streams.find(stream => stream.codec_type === 'audio');

        if (!videoStream) {
            throw new Error('No video stream found');
        }

        return {
            // Video properties
            width: videoStream.width,
            height: videoStream.height,
            duration: parseFloat(data.format.duration),
            bitrate: parseInt(data.format.bit_rate),
            size: parseInt(data.format.size),
            codec: videoStream.codec_name,
            fps: eval(videoStream.r_frame_rate),
            pixelFormat: videoStream.pix_fmt,
            
            // Audio properties (if available)
            audio: audioStream ? {
                codec: audioStream.codec_name,
                channels: audioStream.channels,
                sampleRate: audioStream.sample_rate,
                bitrate: audioStream.bit_rate
            } : null,

            // Container format
            format: data.format.format_name,
            
            // Additional metadata
            tags: data.format.tags || {},
            
            // Raw stream data for advanced usage
            videoStream,
            audioStream
        };
    } catch (error) {
        logger.error('Error getting video metadata:', error);
        throw new Error(`Failed to get video metadata: ${error.message}`);
    }
}

/**
 * Calculate optimal bitrate based on resolution and target quality
 * @param {number} width - Video width
 * @param {number} height - Video height
 * @param {string} quality - Target quality (low, medium, high)
 * @param {number} fps - Frames per second
 * @returns {number} Recommended bitrate in bits per second
 */
function calculateOptimalBitrate(width, height, quality = 'medium', fps = 30) {
    const pixelCount = width * height;
    const qualityFactors = {
        low: 0.1,
        medium: 0.15,
        high: 0.2
    };

    const qualityFactor = qualityFactors[quality] || qualityFactors.medium;
    const fpsAdjustment = fps / 30;

    // Base calculation: pixels * quality factor * fps adjustment
    let bitrate = Math.round(pixelCount * qualityFactor * fpsAdjustment);

    // Apply resolution-specific adjustments
    if (pixelCount <= 409920) { // 854x480 or smaller
        bitrate = Math.min(bitrate, 1000000); // Cap at 1 Mbps
    } else if (pixelCount <= 921600) { // 1280x720
        bitrate = Math.min(bitrate, 2500000); // Cap at 2.5 Mbps
    } else if (pixelCount <= 2073600) { // 1920x1080
        bitrate = Math.min(bitrate, 5000000); // Cap at 5 Mbps
    } else if (pixelCount <= 8294400) { // 4K (3840x2160)
        bitrate = Math.min(bitrate, 15000000); // Cap at 15 Mbps
    } else { // 8K or higher
        bitrate = Math.min(bitrate, 40000000); // Cap at 40 Mbps
    }

    return bitrate;
}

/**
 * Generate compression settings based on target size or quality
 * @param {Object} metadata - Video metadata
 * @param {Object} target - Target constraints
 * @param {number} target.size - Target file size in bytes
 * @param {string} target.quality - Target quality level
 * @returns {Object} Compression settings
 */
function generateCompressionSettings(metadata, target) {
    const settings = {
        codec: 'h264', // Default to h264 for best compatibility
        preset: 'medium',
        audioOptions: {
            codec: 'aac',
            bitrate: '128k'
        }
    };

    if (target.size) {
        // Calculate target bitrate based on desired file size
        const durationSeconds = metadata.duration;
        const targetBitsPerSecond = (target.size * 8) / durationSeconds;
        
        // Reserve 10% for audio
        const videoBitrate = Math.floor(targetBitsPerSecond * 0.9);
        
        settings.bitrate = videoBitrate;
        settings.maxBitrate = Math.floor(videoBitrate * 1.5);
        settings.bufsize = Math.floor(videoBitrate * 2);
    } else if (target.quality) {
        // Use CRF-based quality settings
        const crfValues = {
            low: 28,
            medium: 23,
            high: 18,
            veryhigh: 15
        };

        settings.crf = crfValues[target.quality] || crfValues.medium;
        settings.preset = target.quality === 'veryhigh' ? 'slow' : 'medium';
    }

    return settings;
}

/**
 * Check if a codec is supported by the current ffmpeg installation
 * @param {string} codec - Codec name
 * @returns {Promise<boolean>} Whether the codec is supported
 */
async function isCodecSupported(codec) {
    try {
        const ffprobe = promisify(ffmpeg.ffprobe);
        const data = await ffprobe('-codecs');
        return data.includes(codec);
    } catch (error) {
        logger.error('Error checking codec support:', error);
        return false;
    }
}

export {
    getVideoMetadata,
    calculateOptimalBitrate,
    generateCompressionSettings,
    isCodecSupported
}; 