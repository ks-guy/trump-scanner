const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../utils/logger');
const { getVideoMetadata } = require('./mediaUtils');

class VideoCompressionService {
    constructor() {
        // Supported codecs and their configurations
        this.codecConfigs = {
            'h264': {
                codec: 'libx264',
                presets: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'],
                profiles: ['baseline', 'main', 'high'],
                tune: ['film', 'animation', 'grain', 'stillimage', 'fastdecode', 'zerolatency']
            },
            'h265': {
                codec: 'libx265',
                presets: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'],
                profiles: ['main', 'main10', 'main12'],
                tune: ['grain', 'fastdecode', 'zerolatency']
            },
            'vp9': {
                codec: 'libvpx-vp9',
                speed: [0, 1, 2, 3, 4, 5, 6],
                quality: ['good', 'best', 'realtime']
            },
            'av1': {
                codec: 'libaom-av1',
                speed: [0, 1, 2, 3, 4, 5, 6, 7, 8],
                quality: ['good', 'best', 'realtime']
            }
        };

        // Output format configurations
        this.formatConfigs = {
            'mp4': {
                preferredCodecs: ['h264', 'h265'],
                container: 'mp4',
                mimeType: 'video/mp4'
            },
            'webm': {
                preferredCodecs: ['vp9', 'av1'],
                container: 'webm',
                mimeType: 'video/webm'
            },
            'mkv': {
                preferredCodecs: ['h264', 'h265', 'vp9', 'av1'],
                container: 'matroska',
                mimeType: 'video/x-matroska'
            }
        };
    }

    /**
     * Compress a video with advanced options
     * @param {string} inputPath - Path to input video file
     * @param {string} outputPath - Path for compressed output
     * @param {Object} options - Compression options
     * @param {string} options.codec - Codec to use (h264, h265, vp9, av1)
     * @param {string} options.preset - Compression preset (ultrafast to veryslow)
     * @param {string} options.profile - Codec profile
     * @param {string} options.tune - Codec tuning
     * @param {number} options.crf - Constant Rate Factor (0-51, lower is better quality)
     * @param {Object} options.resolution - Output resolution { width, height }
     * @param {number} options.bitrate - Target bitrate in bits per second
     * @param {number} options.maxBitrate - Maximum bitrate for VBR encoding
     * @param {string} options.outputFormat - Output container format (mp4, webm, mkv)
     * @param {boolean} options.twoPass - Use two-pass encoding for better quality
     * @param {Object} options.audioOptions - Audio compression options
     */
    async compressVideo(inputPath, outputPath, options) {
        try {
            // Validate input file exists
            await fs.access(inputPath);

            // Get input video metadata
            const metadata = await getVideoMetadata(inputPath);
            
            // Prepare compression options
            const compressionOptions = await this.prepareCompressionOptions(metadata, options);
            
            // Create FFmpeg command
            let command = ffmpeg(inputPath);

            // Apply video codec and compression settings
            command = this.applyVideoSettings(command, compressionOptions);

            // Apply audio settings
            command = this.applyAudioSettings(command, compressionOptions.audioOptions);

            // Apply filters (resolution, etc.)
            command = this.applyFilters(command, compressionOptions);

            if (compressionOptions.twoPass) {
                // Perform two-pass encoding
                await this.performTwoPassEncoding(command, outputPath, compressionOptions);
            } else {
                // Perform single-pass encoding
                await this.performSinglePassEncoding(command, outputPath);
            }

            return {
                success: true,
                outputPath,
                compressionRatio: await this.calculateCompressionRatio(inputPath, outputPath),
                metadata: await getVideoMetadata(outputPath)
            };
        } catch (error) {
            logger.error('Video compression failed:', error);
            throw new Error(`Video compression failed: ${error.message}`);
        }
    }

    async prepareCompressionOptions(metadata, options) {
        const defaultOptions = {
            codec: 'h264',
            preset: 'medium',
            crf: 23,
            twoPass: false,
            audioOptions: {
                codec: 'aac',
                bitrate: '128k',
                channels: 2,
                sampleRate: 44100
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        // Validate and adjust resolution
        if (finalOptions.resolution) {
            finalOptions.resolution = this.calculateOptimalResolution(
                metadata.width,
                metadata.height,
                finalOptions.resolution
            );
        }

        // Validate codec configuration
        if (!this.codecConfigs[finalOptions.codec]) {
            throw new Error(`Unsupported codec: ${finalOptions.codec}`);
        }

        // Validate and adjust bitrate
        if (finalOptions.bitrate) {
            finalOptions.maxBitrate = finalOptions.maxBitrate || finalOptions.bitrate * 1.5;
        }

        return finalOptions;
    }

    applyVideoSettings(command, options) {
        const codecConfig = this.codecConfigs[options.codec];

        command.videoCodec(codecConfig.codec);

        if (options.preset && codecConfig.presets?.includes(options.preset)) {
            command.addOption('-preset', options.preset);
        }

        if (options.profile && codecConfig.profiles?.includes(options.profile)) {
            command.addOption('-profile:v', options.profile);
        }

        if (options.tune && codecConfig.tune?.includes(options.tune)) {
            command.addOption('-tune', options.tune);
        }

        if (options.crf !== undefined) {
            command.addOption('-crf', options.crf);
        }

        if (options.bitrate) {
            command.videoBitrate(options.bitrate);
            if (options.maxBitrate) {
                command.addOption('-maxrate', options.maxBitrate)
                       .addOption('-bufsize', options.maxBitrate * 2);
            }
        }

        return command;
    }

    applyAudioSettings(command, audioOptions) {
        if (audioOptions.codec) {
            command.audioCodec(audioOptions.codec);
        }
        if (audioOptions.bitrate) {
            command.audioBitrate(audioOptions.bitrate);
        }
        if (audioOptions.channels) {
            command.audioChannels(audioOptions.channels);
        }
        if (audioOptions.sampleRate) {
            command.audioFrequency(audioOptions.sampleRate);
        }
        return command;
    }

    applyFilters(command, options) {
        const filters = [];

        if (options.resolution) {
            filters.push(`scale=${options.resolution.width}:${options.resolution.height}`);
        }

        if (filters.length > 0) {
            command.videoFilters(filters);
        }

        return command;
    }

    async performTwoPassEncoding(command, outputPath, options) {
        const passLogFile = path.join(path.dirname(outputPath), 'ffmpeg2pass');

        // First pass
        await new Promise((resolve, reject) => {
            command.clone()
                .addOption('-pass', 1)
                .addOption('-passlogfile', passLogFile)
                .addOption('-f', 'null')
                .output('/dev/null')
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Second pass
        await new Promise((resolve, reject) => {
            command.clone()
                .addOption('-pass', 2)
                .addOption('-passlogfile', passLogFile)
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Clean up pass log files
        const logFiles = ['.log', '-0.log', '-0.log.mbtree'];
        for (const ext of logFiles) {
            try {
                await fs.unlink(passLogFile + ext);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }

    async performSinglePassEncoding(command, outputPath) {
        return new Promise((resolve, reject) => {
            command.output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
    }

    calculateOptimalResolution(sourceWidth, sourceHeight, targetRes) {
        const aspectRatio = sourceWidth / sourceHeight;

        if (targetRes.width && targetRes.height) {
            // Both dimensions specified
            return {
                width: Math.min(targetRes.width, sourceWidth),
                height: Math.min(targetRes.height, sourceHeight)
            };
        } else if (targetRes.width) {
            // Width specified, calculate height
            return {
                width: Math.min(targetRes.width, sourceWidth),
                height: Math.round(Math.min(targetRes.width, sourceWidth) / aspectRatio)
            };
        } else if (targetRes.height) {
            // Height specified, calculate width
            return {
                width: Math.round(Math.min(targetRes.height, sourceHeight) * aspectRatio),
                height: Math.min(targetRes.height, sourceHeight)
            };
        }

        // No resolution specified, return source dimensions
        return { width: sourceWidth, height: sourceHeight };
    }

    async calculateCompressionRatio(inputPath, outputPath) {
        const [inputStats, outputStats] = await Promise.all([
            fs.stat(inputPath),
            fs.stat(outputPath)
        ]);

        return inputStats.size / outputStats.size;
    }

    /**
     * Get supported compression options
     * @returns {Object} Object containing supported codecs, presets, profiles, etc.
     */
    getSupportedOptions() {
        return {
            codecs: this.codecConfigs,
            formats: this.formatConfigs
        };
    }
}

module.exports = new VideoCompressionService(); 