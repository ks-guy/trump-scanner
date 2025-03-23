# Trump Scanner - Document Processing Service

This service provides advanced document processing capabilities for the Trump Scanner project, including OCR, signature verification, and document authenticity checks.

## Features

### Document Processing
- Support for multiple document types (PDF, Word, Images)
- OCR processing using Tesseract.js
- Document structure analysis
- Table and image extraction
- Metadata extraction

### Image Processing
- Image quality enhancement
- Denoising
- Contrast adjustment
- Gamma correction
- Image hash generation for duplicate detection

### Signature Verification
- Signature detection
- Signature verification
- Handwriting analysis
- Comparison with known signatures

### Document Authenticity
- Digital signature verification
- Hash verification
- Metadata validation
- Content integrity checks

### Document Analysis
- Text extraction and analysis
- Structure analysis
- Key information identification
- Report generation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
npm start
```

## Usage

### Basic Document Processing
```javascript
const documentService = require('./src/services/documentProcessingService');

// Process a document
const result = await documentService.processDocument('path/to/document.pdf', {
  ocr: true,
  verifySignatures: true
});
```

### Image Enhancement
```javascript
const enhancedImage = await documentService.enhanceImageQuality('path/to/image.jpg', {
  denoise: true,
  enhance: true,
  contrast: true
});
```

### Document Verification
```javascript
const verification = await documentService.verifyDocumentAuthenticity(document);
```

### Report Generation
```javascript
const report = await documentService.generateDocumentReport(document);
```

## API Reference

### processDocument(documentPath, options)
Processes a document with specified options.

**Parameters:**
- `documentPath` (string): Path to the document
- `options` (object):
  - `ocr` (boolean): Enable OCR processing
  - `verifySignatures` (boolean): Enable signature verification
  - `extractMetadata` (boolean): Enable metadata extraction

**Returns:** Processed document object

### enhanceImageQuality(imagePath, options)
Enhances image quality with specified options.

**Parameters:**
- `imagePath` (string): Path to the image
- `options` (object):
  - `denoise` (boolean): Enable denoising
  - `enhance` (boolean): Enable enhancement
  - `contrast` (boolean): Enable contrast adjustment

**Returns:** Path to enhanced image

### verifyDocumentAuthenticity(document)
Verifies document authenticity.

**Parameters:**
- `document` (object): Document object

**Returns:** Verification result object

### generateDocumentReport(document)
Generates a detailed report for a document.

**Parameters:**
- `document` (object): Document object

**Returns:** Report object

## Dependencies

- tesseract.js: OCR processing
- pdf-parse: PDF parsing
- mammoth: Word document parsing
- jimp: Image processing
- image-hash: Image hash generation
- exifr: EXIF data extraction
- pdf-lib: PDF manipulation
- node-signpdf: PDF signature verification
- node-forge: Cryptographic operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 