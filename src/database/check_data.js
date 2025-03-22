import sqlite3 from 'sqlite3';

// Initialize SQLite database
const db = new sqlite3.Database('trump_scanner.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
});

// Get sources
db.all('SELECT * FROM sources', [], (err, sources) => {
    if (err) {
        console.error('Error querying sources:', err);
        db.close();
        process.exit(1);
    }

    console.log(`Found ${sources.length} source(s):`);
    sources.forEach(source => {
        console.log(`  - ${source.name} (${source.url})`);
    });

    // Get legal documents
    db.all('SELECT * FROM legal_documents', [], (err, docs) => {
        if (err) {
            console.error('Error querying legal documents:', err);
            db.close();
            process.exit(1);
        }

        console.log(`\nFound ${docs.length} legal document(s):`);
        docs.forEach(doc => {
            console.log('\nDocument:');
            console.log(`  Title: ${doc.title || 'Untitled'}`);
            console.log(`  Case Number: ${doc.case_number || 'N/A'}`);
            console.log(`  Court: ${doc.court || 'N/A'}`);
            console.log(`  Filing Date: ${doc.filing_date || 'N/A'}`);
            console.log(`  Content Length: ${doc.content ? doc.content.length : 0} characters`);

            console.log('\n  Raw JSON Data:');
            console.log('  metadata:', doc.metadata);
            console.log('  pdf_urls:', doc.pdf_urls);
            console.log('  downloaded_pdfs:', doc.downloaded_pdfs);
            console.log('  pdf_content:', doc.pdf_content);

            try {
                const pdfUrls = JSON.parse(doc.pdf_urls || '[]');
                console.log(`  PDF URLs: ${pdfUrls.length} found`);
            } catch (error) {
                console.log('  Error parsing PDF URLs');
            }

            try {
                const metadata = JSON.parse(doc.metadata || '{}');
                console.log('  Metadata:', metadata);
            } catch (error) {
                console.log('  Error parsing metadata');
            }

            try {
                const downloadedPdfs = JSON.parse(doc.downloaded_pdfs || '[]');
                console.log(`  Downloaded PDFs: ${downloadedPdfs.length} found`);
            } catch (error) {
                console.log('  Error parsing downloaded PDFs');
            }

            try {
                const pdfContent = JSON.parse(doc.pdf_content || '[]');
                console.log(`  PDF Content: ${pdfContent.length} entries`);
            } catch (error) {
                console.log('  Error parsing PDF content');
            }
        });

        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
                process.exit(1);
            }
        });
    });
}); 