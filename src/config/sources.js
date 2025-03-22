/**
 * Configuration file containing URLs to scrape for Trump quotes
 */

const sources = {
    // News websites
    news: [
        'https://www.foxnews.com/politics',
        'https://www.breitbart.com/politics',
        'https://nypost.com/tag/donald-trump',
        'https://www.newsmax.com/politics'
    ],

    // Social media archives (since Trump is banned from some platforms)
    social: [
        'https://truthsocial.com/@realDonaldTrump',
        'https://web.archive.org/web/*/twitter.com/realDonaldTrump'
    ],

    // Campaign websites and press releases
    campaign: [
        'https://www.donaldjtrump.com/news',
        'https://www.donaldtrump.com/speeches'
    ],

    // Interview transcripts and speeches
    transcripts: [
        'https://www.rev.com/blog/transcript-category/donald-trump-transcripts',
        'https://www.c-span.org/person/?donaldtrump'
    ],

    // Legal proceedings and court transcripts
    legal: [
        // Criminal Cases
        'https://www.courtlistener.com/docket/63629075/united-states-v-trump/',  // DC Criminal case
        'https://www.courtlistener.com/docket/67639253/united-states-v-trump/',  // GA Criminal case
        'https://www.courtlistener.com/docket/65699140/people-v-trump/',         // NY Criminal case
        'https://www.courtlistener.com/docket/65699141/trump-organization/',     // NY Org case
        
        // Civil Cases
        'https://www.courtlistener.com/docket/64875559/trump-v-united-states/',  // Mar-a-Lago docs
        'https://www.courtlistener.com/docket/65694341/carroll-v-trump/',        // E. Jean Carroll
        'https://www.courtlistener.com/docket/65694342/james-v-trump/',          // NY AG Civil
        
        // Appeals and Supreme Court
        'https://www.courtlistener.com/docket/67639254/trump-v-anderson/',       // CO Ballot case
        'https://www.courtlistener.com/docket/67639255/trump-v-illinois/',       // IL Ballot case
        'https://www.courtlistener.com/docket/67639256/trump-v-maine/',          // ME Ballot case
        
        // Document Cloud Archives
        'https://www.documentcloud.org/documents/24420166-trump-ny-appeal',       // NY Appeal
        'https://www.documentcloud.org/documents/24383794-trump-immunity-ruling', // Immunity ruling
        'https://www.documentcloud.org/documents/24383795-trump-ga-indictment',   // GA Indictment
        'https://www.documentcloud.org/documents/24383796-trump-dc-indictment'    // DC Indictment
    ],

    // Official documents signed by Trump
    official_documents: {
        // Executive Orders
        executive_orders: [
            'https://www.federalregister.gov/presidential-documents/executive-orders/donald-trump/2017',
            'https://www.federalregister.gov/presidential-documents/executive-orders/donald-trump/2018',
            'https://www.federalregister.gov/presidential-documents/executive-orders/donald-trump/2019',
            'https://www.federalregister.gov/presidential-documents/executive-orders/donald-trump/2020',
            'https://www.federalregister.gov/presidential-documents/executive-orders/donald-trump/2021',
            'https://www.archives.gov/federal-register/executive-orders/trump.html',
            'https://www.presidency.ucsb.edu/documents/app-categories/written-presidential-orders/presidential/executive-orders'
        ],
        // Presidential Memoranda
        memoranda: [
            'https://www.federalregister.gov/presidential-documents/memoranda/donald-trump/2017',
            'https://www.federalregister.gov/presidential-documents/memoranda/donald-trump/2018',
            'https://www.federalregister.gov/presidential-documents/memoranda/donald-trump/2019',
            'https://www.federalregister.gov/presidential-documents/memoranda/donald-trump/2020',
            'https://www.federalregister.gov/presidential-documents/memoranda/donald-trump/2021',
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/presidential-memoranda'
        ],
        // Proclamations
        proclamations: [
            'https://www.federalregister.gov/presidential-documents/proclamations/donald-trump/2017',
            'https://www.federalregister.gov/presidential-documents/proclamations/donald-trump/2018',
            'https://www.federalregister.gov/presidential-documents/proclamations/donald-trump/2019',
            'https://www.federalregister.gov/presidential-documents/proclamations/donald-trump/2020',
            'https://www.federalregister.gov/presidential-documents/proclamations/donald-trump/2021',
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/proclamations'
        ],
        // Notices and Determinations
        notices: [
            'https://www.federalregister.gov/presidential-documents/notices/donald-trump/2017',
            'https://www.federalregister.gov/presidential-documents/notices/donald-trump/2018',
            'https://www.federalregister.gov/presidential-documents/notices/donald-trump/2019',
            'https://www.federalregister.gov/presidential-documents/notices/donald-trump/2020',
            'https://www.federalregister.gov/presidential-documents/notices/donald-trump/2021',
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/determinations'
        ],
        // Additional Presidential Documents
        other_documents: [
            // National Security Documents
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/national-security-directives',
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/homeland-security-presidential-directives',
            // Administrative Orders
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/administrative-orders',
            // Reorganization Plans
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/reorganization-plans',
            // Military Orders
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/military-orders',
            // Letters and Messages
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/letters-messages',
            // Signing Statements
            'https://www.presidency.ucsb.edu/documents/app-categories/presidential/signing-statements'
        ],
        // Government Archives and Databases
        archives: [
            'https://www.archives.gov/federal-register/donald-trump',
            'https://www.govinfo.gov/app/collection/CPD/president-45',
            'https://www.govinfo.gov/app/collection/PPP/president-45',
            'https://www.govinfo.gov/app/collection/DCPD/president-45',
            'https://www.congress.gov/presidential-actions/donald-trump'
        ],
        // Legal and Court Documents
        legal_documents: [
            'https://www.courtlistener.com/docket/?q=&type=r&order_by=score+desc&case_name=trump',
            'https://www.documentcloud.org/app/search?q=project%3Atrump-signed-documents'
        ]
    }
};

// Configuration for scraping behavior
const config = {
    maxConcurrent: 3,  // Reduced for more reliable scraping
    requestDelay: {
        min: 5000,     // Increased minimum delay (5 seconds)
        max: 10000     // Increased maximum delay (10 seconds)
    },
    maxRequestsPerDomain: 50,   // Reduced for better rate limiting
    userAgentRotation: true,    
    proxyRotation: true,        
    retryAttempts: 5,          // Increased retry attempts
    followRedirects: true,      
    respectRobotsTxt: true,     
    maxQuotesPerPage: 100,      // Increased for legal documents
    minQuoteLength: 10,         
    maxQuoteLength: 5000,       // Increased for legal documents
    
    // Additional settings for official documents
    official_documents: {
        downloadPDFs: true,     
        extractMetadata: true,  
        categorizeByType: true, 
        storeFullText: true,    
        verifySignatures: true,  
        extractSignedBy: true,  
        includeAttachments: true,
        validateDocuments: true,
        documentTypes: [
            'executive_orders',
            'memoranda',
            'proclamations',
            'notices',
            'determinations',
            'directives',
            'military_orders',
            'administrative_orders',
            'signing_statements',
            'letters',
            'messages',
            'legal_filings',
            'indictments',       // Added document type
            'appeals',           // Added document type
            'rulings',          // Added document type
            'orders',           // Added document type
            'transcripts'       // Added document type
        ],
        // Added specific settings for legal documents
        legal_documents: {
            extractCitations: true,      // Extract legal citations
            extractParties: true,        // Extract party names
            extractDates: true,          // Extract important dates
            extractJudges: true,         // Extract judge information
            extractCaseNumbers: true,    // Extract case numbers
            extractVenues: true,         // Extract court venues
            extractCharges: true,        // Extract criminal charges
            extractStatutes: true,       // Extract referenced statutes
            extractExhibits: true,       // Extract exhibit information
            extractWitnesses: true,      // Extract witness information
            maxPDFSize: 100 * 1024 * 1024, // 100MB max PDF size
            ocrEnabled: true,            // Enable OCR for scanned documents
            ocrLanguage: 'eng',          // OCR language
            pdfTextExtraction: 'hybrid'  // Use both PDF text and OCR
        }
    }
};

export {
    sources,
    config
}; 