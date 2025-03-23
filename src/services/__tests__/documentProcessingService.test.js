const documentService = require('../documentProcessingService');
const fs = require('fs');
const path = require('path');

describe('DocumentProcessingService', () => {
  const testDir = path.join(__dirname, '../../../test/documents');
  
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('processDocument', () => {
    it('should process a PDF document', async () => {
      const testPdf = path.join(testDir, 'test.pdf');
      // Create a test PDF file
      fs.writeFileSync(testPdf, 'Test PDF content');

      const result = await documentService.processDocument(testPdf, {
        ocr: true,
        verifySignatures: true
      });

      expect(result).toBeDefined();
      expect(result.path).toBe(testPdf);
      expect(result.type).toBe('.pdf');
      expect(result.metadata).toBeDefined();
    });

    it('should process an image document', async () => {
      const testImage = path.join(testDir, 'test.jpg');
      // Create a test image file
      fs.writeFileSync(testImage, 'Test image content');

      const result = await documentService.processDocument(testImage, {
        ocr: true
      });

      expect(result).toBeDefined();
      expect(result.path).toBe(testImage);
      expect(result.type).toBe('.jpg');
      expect(result.metadata).toBeDefined();
    });

    it('should handle unsupported document types', async () => {
      const testFile = path.join(testDir, 'test.xyz');
      fs.writeFileSync(testFile, 'Test content');

      await expect(documentService.processDocument(testFile))
        .rejects
        .toThrow('Unsupported document type');
    });
  });

  describe('enhanceImageQuality', () => {
    it('should enhance image quality with specified options', async () => {
      const testImage = path.join(testDir, 'test.jpg');
      fs.writeFileSync(testImage, 'Test image content');

      const result = await documentService.enhanceImageQuality(testImage, {
        denoise: true,
        enhance: true,
        contrast: true
      });

      expect(result).toBeDefined();
      expect(fs.existsSync(result)).toBe(true);
      expect(path.basename(result)).toContain('enhanced_');
    });
  });

  describe('verifyDocumentAuthenticity', () => {
    it('should verify document authenticity', async () => {
      const testDoc = {
        path: path.join(testDir, 'test.pdf'),
        type: '.pdf',
        content: 'Test content',
        metadata: {
          size: 1000,
          created: new Date(),
          modified: new Date()
        }
      };

      const result = await documentService.verifyDocumentAuthenticity(testDoc);

      expect(result).toBeDefined();
      expect(result.documentId).toBe(testDoc.path);
      expect(result.timestamp).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.result).toBeDefined();
    });
  });

  describe('generateDocumentReport', () => {
    it('should generate a document report', async () => {
      const testDoc = {
        path: path.join(testDir, 'test.pdf'),
        type: '.pdf',
        content: 'Test content',
        metadata: {
          size: 1000,
          created: new Date(),
          modified: new Date()
        }
      };

      const result = await documentService.generateDocumentReport(testDoc);

      expect(result).toBeDefined();
      expect(result.documentId).toBe(testDoc.path);
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
}); 