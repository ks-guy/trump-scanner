import { createLogger } from '../../utils/logger.js';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const logger = createLogger('MediaProcessing');

async function downloadVideo(url, outputDir) {
    try {
        logger.info(`Starting video download from ${url}`);
        
        // Generate unique filename
        const timestamp = Date.now();
        const outputPath = path.join(outputDir, `video_${timestamp}.mp4`);
        
        // Download video using ytdl-core
        await new Promise((resolve, reject) => {
            ytdl(url, {
                quality: 'highest',
                filter: 'videoandaudio'
            })
            .pipe(fs.createWriteStream(outputPath))
            .on('finish', resolve)
            .on('error', reject);
        });

        // Get video information using ffmpeg
        const videoInfo = await getVideoInfo(outputPath);
        
        logger.info(`Successfully downloaded video to ${outputPath}`);
        return {
            filePath: outputPath,
            fileSize: videoInfo.size,
            format: videoInfo.format,
            resolution: videoInfo.resolution,
            bitrate: videoInfo.bitrate
        };
    } catch (error) {
        logger.error(`Error downloading video: ${error.message}`);
        throw error;
    }
}

async function extractAudio(videoPath) {
    try {
        logger.info(`Starting audio extraction from ${videoPath}`);
        
        const outputPath = videoPath.replace('.mp4', '.mp3');
        
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        logger.info(`Successfully extracted audio to ${outputPath}`);
        return outputPath;
    } catch (error) {
        logger.error(`Error extracting audio: ${error.message}`);
        throw error;
    }
}

async function generateThumbnail(videoPath) {
    try {
        logger.info(`Generating thumbnail for ${videoPath}`);
        
        const outputPath = videoPath.replace('.mp4', '_thumb.jpg');
        
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: ['50%'],
                    filename: path.basename(outputPath),
                    folder: path.dirname(outputPath),
                    size: '320x240'
                })
                .on('end', resolve)
                .on('error', reject);
        });

        logger.info(`Successfully generated thumbnail at ${outputPath}`);
        return outputPath;
    } catch (error) {
        logger.error(`Error generating thumbnail: ${error.message}`);
        throw error;
    }
}

async function getVideoInfo(filePath) {
    try {
        const stats = await fs.stat(filePath);
        
        const ffprobeData = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata);
            });
        });

        const videoStream = ffprobeData.streams.find(s => s.codec_type === 'video');
        
        return {
            size: stats.size,
            format: ffprobeData.format.format_name,
            resolution: `${videoStream.width}x${videoStream.height}`,
            bitrate: Math.round(ffprobeData.format.bit_rate / 1000) // Convert to kbps
        };
    } catch (error) {
        logger.error(`Error getting video info: ${error.message}`);
        throw error;
    }
}

export {
    downloadVideo,
    extractAudio,
    generateThumbnail,
    getVideoInfo
}; 