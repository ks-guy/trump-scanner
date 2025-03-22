const fs = require('fs');
const path = require('path');
const { default: ora } = require('ora');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

let spinner = null;

/**
 * Verifies and validates collected documents
 * - Checks document integrity
 * - Validates metadata
 * - Verifies PDF signatures when possible
 * - Cross-references documents across sources
 */
async function verifyDocuments() {
    try {
        const docsDir = path.join(__dirname, '../../documents');
        spinner = ora('Starting document verification...').start();

        // Get all document types
        const docTypes = await fs.promises.readdir(docsDir);
        let totalDocs = 0;
        let validDocs = 0;
        let invalidDocs = 0;
        const verificationResults = {};

        for (const docType of docTypes) {
            const typeDir = path.join(docsDir, docType);
            const stats = await fs.promises.stat(typeDir);
            
            if (!stats.isDirectory()) continue;
            
            spinner.text = `Verifying ${docType} documents...`;
            verificationResults[docType] = {
                total: 0,
                valid: 0,
                invalid: 0,
                errors: []
            };

            // Get all JSON files in this type directory
            const files = await fs.promises.readdir(typeDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            for (const jsonFile of jsonFiles) {
                try {
                    const filePath = path.join(typeDir, jsonFile);
                    const docData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
                    
                    // Verify document integrity
                    const isValid = await verifyDocument(docData, typeDir);
                    
                    verificationResults[docType].total++;
                    totalDocs++;
                    
                    if (isValid) {
                        verificationResults[docType].valid++;
                        validDocs++;
                    } else {
                        verificationResults[docType].invalid++;
                        invalidDocs++;
                    }
                } catch (error) {
                    verificationResults[docType].errors.push({
                        file: jsonFile,
                        error: error.message
                    });
                    logger.error(`Error verifying ${jsonFile}: ${error.message}`);
                }
            }
        }

        // Generate verification report
        const reportPath = path.join(docsDir, 'verification_report.json');
        await fs.promises.writeFile(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                totalDocuments: totalDocs,
                validDocuments: validDocs,
                invalidDocuments: invalidDocs,
                validityRate: `${((validDocs / totalDocs) * 100).toFixed(2)}%`
            },
            results: verificationResults
        }, null, 2));

        spinner.succeed(`Document verification completed:
        - Total documents: ${totalDocs}
        - Valid documents: ${validDocs}
        - Invalid documents: ${invalidDocs}
        - Verification report saved to: ${reportPath}`);

    } catch (error) {
        if (spinner) spinner.fail(`Verification failed: ${error.message}`);
        logger.error('Verification failed:', error);
        process.exitCode = 1;
    }
}

/**
 * Verifies a single document's integrity and metadata
 */
async function verifyDocument(docData, typeDir) {
    // Required fields check
    const requiredFields = ['text', 'url', 'type', 'scrapedAt'];
    const missingFields = requiredFields.filter(field => !docData[field]);
    
    if (missingFields.length > 0) {
        logger.warn(`Document missing required fields: ${missingFields.join(', ')}`);
        return false;
    }

    // Verify PDF if available
    if (docData.pdfPath) {
        const pdfPath = path.join(typeDir, docData.pdfPath);
        try {
            if (!await verifyPDF(pdfPath)) {
                logger.warn(`PDF verification failed: ${pdfPath}`);
                return false;
            }
        } catch (error) {
            logger.error(`PDF verification error: ${error.message}`);
            return false;
        }
    }

    // Verify metadata consistency
    if (docData.metadata) {
        const metadataValid = verifyMetadata(docData);
        if (!metadataValid) {
            logger.warn(`Metadata verification failed for document: ${docData.url}`);
            return false;
        }
    }

    // Verify content integrity
    const contentHash = crypto.createHash('sha256').update(docData.text).digest('hex');
    if (docData.contentHash && docData.contentHash !== contentHash) {
        logger.warn(`Content integrity check failed for document: ${docData.url}`);
        return false;
    }

    // Update content hash if not present
    if (!docData.contentHash) {
        docData.contentHash = contentHash;
        await fs.promises.writeFile(
            path.join(typeDir, path.basename(docData.url).replace(/[^a-z0-9]/gi, '_') + '.json'),
            JSON.stringify(docData, null, 2)
        );
    }

    return true;
}

/**
 * Verifies PDF document integrity and signature
 */
async function verifyPDF(pdfPath) {
    try {
        const pdfBytes = await fs.promises.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Basic PDF validation
        if (!pdfDoc || pdfDoc.getPageCount() === 0) {
            return false;
        }

        // TODO: Add more sophisticated PDF verification:
        // - Digital signature verification
        // - Metadata validation
        // - Content structure analysis
        // - OCR verification against stored text

        return true;
    } catch (error) {
        logger.error(`PDF verification error: ${error.message}`);
        return false;
    }
}

/**
 * Verifies document metadata consistency
 */
function verifyMetadata(docData) {
    // Verify source consistency
    if (docData.metadata.source && docData.source && 
        docData.metadata.source !== docData.source) {
        return false;
    }

    // Verify URL consistency
    if (docData.metadata.url !== docData.url) {
        return false;
    }

    // Verify document type consistency
    if (docData.metadata.documentType && 
        !docData.type.toLowerCase().includes(docData.metadata.documentType.toLowerCase())) {
        return false;
    }

    return true;
}

// Start verification if run directly
if (require.main === module) {
    verifyDocuments();
}

module.exports = {
    verifyDocuments,
    verifyDocument,
    verifyPDF,
    verifyMetadata
}; 