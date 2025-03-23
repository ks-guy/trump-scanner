import { PDFDocument } from 'pdf-lib';
import { logger } from './logger.js';

export async function parsePDF(buffer) {
    try {
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(buffer);
        
        // Get metadata
        const metadata = {
            title: pdfDoc.getTitle() || '',
            author: pdfDoc.getAuthor() || '',
            subject: pdfDoc.getSubject() || '',
            keywords: pdfDoc.getKeywords() || '',
            creationDate: pdfDoc.getCreationDate()?.toString() || '',
            modificationDate: pdfDoc.getModificationDate()?.toString() || '',
            pageCount: pdfDoc.getPageCount()
        };

        // Extract text from each page
        let text = '';
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
            const page = pdfDoc.getPage(i);
            const { width, height } = page.getSize();
            
            // Extract text from the page
            const textContent = await page.getTextContent();
            if (textContent) {
                text += textContent + '\n';
            }
            
            // Add page break if not the last page
            if (i < pdfDoc.getPageCount() - 1) {
                text += '\n--- Page Break ---\n\n';
            }
        }

        return {
            text: text.trim(),
            numpages: pdfDoc.getPageCount(),
            metadata
        };
    } catch (error) {
        logger.error('Error parsing PDF:', error);
        return {
            text: '',
            numpages: 0,
            metadata: {}
        };
    }
} 