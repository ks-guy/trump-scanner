const zlib = require('zlib');
const { promisify } = require('util');
const { logger } = require('../../utils/logger');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class CompressionService {
    constructor() {
        this.compressionThreshold = 1024; // 1KB threshold for compression
    }

    async compress(data) {
        try {
            const serializedData = JSON.stringify(data);
            
            // Only compress if data size exceeds threshold
            if (serializedData.length <= this.compressionThreshold) {
                return {
                    data: serializedData,
                    isCompressed: false
                };
            }

            const compressedData = await gzip(serializedData);
            return {
                data: compressedData.toString('base64'),
                isCompressed: true
            };
        } catch (error) {
            logger.error('Error compressing data:', error);
            throw error;
        }
    }

    async decompress(data, isCompressed) {
        try {
            if (!isCompressed) {
                return JSON.parse(data);
            }

            const buffer = Buffer.from(data, 'base64');
            const decompressedData = await gunzip(buffer);
            return JSON.parse(decompressedData.toString());
        } catch (error) {
            logger.error('Error decompressing data:', error);
            throw error;
        }
    }

    setCompressionThreshold(bytes) {
        this.compressionThreshold = bytes;
        logger.info(`Compression threshold set to ${bytes} bytes`);
    }
}

module.exports = new CompressionService(); 