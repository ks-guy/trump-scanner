import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function extractDate(text = '', url = '') {
    // Try to extract from URL first (most reliable)
    const urlMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (urlMatch) {
        const [_, year, month, day] = urlMatch;
        return `${year}-${month}-${day}`;
    }
    
    if (!text) return '';
    
    // Try to find a date in format MM/DD/YYYY
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match = text.match(dateRegex);
    if (match) {
        const [_, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try to find a date in format Month DD, YYYY
    const monthRegex = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/;
    const monthMatch = text.match(monthRegex);
    if (monthMatch) {
        const [_, month, day, year] = monthMatch;
        const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
        return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try to find a date in format YYYY-MM-DD
    const isoRegex = /(\d{4})-(\d{1,2})-(\d{1,2})/;
    const isoMatch = text.match(isoRegex);
    if (isoMatch) {
        const [_, year, month, day] = isoMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return '';
}

function extractDocumentNumber(text = '', url = '') {
    // Try to extract from URL first
    const urlMatch = url.match(/\/(\d{4}-\d+)\//);
    if (urlMatch) {
        return urlMatch[1];
    }
    
    // Try to find in text
    const docNumberRegex = /Document Number\s+(\d{4}-\d+)/;
    const match = text.match(docNumberRegex);
    if (match) {
        return match[1];
    }
    
    return '';
}

function extractTitle(text = '', url = '') {
    // Try to extract from URL first
    const urlMatch = url.match(/\/([^/]+)$/);
    if (urlMatch) {
        return urlMatch[1]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }
    
    // Try to find in text
    if (text) {
        const titleRegex = /<h1[^>]*>([^<]+)<\/h1>/;
        const match = text.match(titleRegex);
        if (match) {
            return match[1].trim();
        }
    }
    
    return 'Presidential Document';
}

function cleanText(text = '') {
    if (!text) return '';
    
    // Remove common boilerplate and navigation text
    const boilerplatePatterns = [
        /Legal Status.*?archives\.gov\./s,
        /The OFR\/GPO partnership.*?courts\./s,
        /Document Details.*?Document Details/s,
        /Enhanced Content.*?Enhanced Content/s,
        /This table of contents.*?legal effect\./s,
        /This feature is not available.*?document\./s,
        /Additional information.*?document\./s,
        /Document page views.*?EDT/s,
        /This document is also.*?formats:/s,
        /This PDF is.*?here\./s,
        /Published Document:.*?format\./s,
        /If you are using.*?here\./s,
        /Enter a search term.*?guide\./s,
        /New folder.*?Clipboard/s,
        /View printed version.*?PDF/s,
        /Email this document.*?friend/s,
        /Print this document/s,
        /Page views.*?EDT/s,
        /Shorter Document URL.*$/s,
        /Document Number.*$/m,
        /Document Citation.*$/m,
        /Document Type.*$/m,
        /Pages.*$/m,
        /Publication Date.*$/m,
        /Agency.*$/m,
        /Presidential Document Type.*$/m,
        /EO Citation.*$/m,
        /EO Notes.*$/m,
        /President.*$/m,
        /Signing Date.*$/m,
        /Table of Contents.*$/m,
        /Public Comments.*$/m,
        /Regulations\.gov Data.*$/m,
        /Sharing.*$/m,
        /Legal Status.*$/m,
        /Presidential Document.*$/m,
        /Published Content.*$/m,
        /Reader Aids.*$/m,
        /Executive Order Details.*$/m,
    ];
    
    let cleanedText = text;
    for (const pattern of boilerplatePatterns) {
        cleanedText = cleanedText.replace(pattern, '');
    }
    
    return cleanedText
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\( print page \d+\)/g, '')  // Remove page numbers
        .replace(/Filed \d{2}-\d{2}-\d{2};.*$/m, '')  // Remove filing info
        .replace(/Billing code.*$/m, '')  // Remove billing codes
        .replace(/\[FR Doc\..*$/m, '')  // Remove FR Doc line
        .replace(/A Presidential Document by.*$/m, '')  // Remove document type line
        .trim();
}

function extractTextContent(html = '') {
    if (!html) return '';
    
    try {
        const root = parse(html);
        
        // Remove unwanted elements
        root.querySelectorAll('.legal-status, .navigation, .disclaimer, .metadata').forEach(el => el.remove());
        
        // Try different content selectors in order of preference
        const contentSelectors = [
            '#fulltext_content_area',
            '.executive-order-content',
            '.document-content',
            '.fr-box-full',
            '#document-content',
            '.body',
            '.document'
        ];
        
        for (const selector of contentSelectors) {
            const content = root.querySelector(selector);
            if (content) {
                return cleanText(content.textContent);
            }
        }
        
        // If no specific content area found, try to get text from the whole document
        return cleanText(root.textContent);
    } catch (err) {
        console.error('Error parsing HTML:', err.message);
        return cleanText(html);
    }
}

async function cleanDocuments() {
    console.log('Cleaning document storage...');
    try {
        const files = await fs.readdir(path.join('documents', 'executive_orders'));
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        let cleaned = 0;
        let errors = 0;

        for (const file of jsonFiles) {
            try {
                const filePath = path.join('documents', 'executive_orders', file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Extract and clean text content
                data.text = extractTextContent(data.text);

                // Extract title from URL or text
                data.title = extractTitle(data.text, data.url);
                
                // Extract and normalize dates
                const publishDate = extractDate(data.text, data.url);
                
                // Extract document number
                const documentNumber = extractDocumentNumber(data.text, data.url);
                
                // Consolidate metadata
                data.metadata = {
                    documentNumber,
                    publishDate,
                    documentType: 'Executive Order',
                    signedBy: 'Donald J. Trump',
                    source: 'federal_register',
                    format: 'pdf',
                    url: data.url || '',
                    pdfUrl: data.metadata?.pdfUrl || ''
                };

                // Normalize PDF paths
                if (data.pdfPath) {
                    data.pdfPath = data.pdfPath.replace(/\\/g, '/');
                }

                // Remove redundant fields
                delete data.source;
                delete data.format;
                delete data.documentNumber;
                delete data.publishDate;
                delete data.documentType;
                delete data.signedBy;
                delete data.date;

                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                cleaned++;
                
                console.log(`Cleaned document: ${file}`);
            } catch (err) {
                console.error(`Error cleaning document ${file}: ${err.message}`);
                errors++;
            }
        }

        console.log(`Document cleaning complete. Cleaned: ${cleaned}, Errors: ${errors}`);
    } catch (err) {
        console.error(`Document cleaning failed: ${err.message}`);
        throw err;
    }
}

cleanDocuments().catch(err => {
    console.error('Fatal error during document cleaning:', err);
    process.exit(1);
}); 