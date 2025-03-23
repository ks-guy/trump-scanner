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

    // Legal proceedings and court transcripts (prioritized)
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
        'https://www.documentcloud.org/documents/24383796-trump-dc-indictment',   // DC Indictment
        
        // Additional Legal Sources
        'https://www.justice.gov/archives/doj/trump-related-cases',              // DOJ Trump Cases
        'https://www.supremecourt.gov/search.aspx?filename=/docket/docketfiles/html/public/23-624.html', // SCOTUS Trump Case
        'https://www.nycourts.gov/courts/1jd/supctmanh/cases/trump.html',        // NY Courts Trump Cases
        'https://www.gasupreme.us/cases/trump/',                                 // GA Supreme Court Trump Cases
        'https://www.dcd.uscourts.gov/criminal-cases/trump',                     // DC District Court Trump Cases
        'https://www.flmd.uscourts.gov/civil-cases/trump',                       // FL District Court Trump Cases
        'https://www.pacourts.us/courts/supreme-court/cases/trump',              // PA Supreme Court Trump Cases
        'https://www.maine.gov/courts/supreme/opinions/trump',                   // ME Supreme Court Trump Cases
        'https://www.courts.illinois.gov/SupremeCourt/Opinions/trump.html'       // IL Supreme Court Trump Cases
    ],

    // Official documents signed by Trump (prioritized)
    official_documents: {
        // Legal and Court Documents (prioritized)
        legal_documents: [
            'https://www.courtlistener.com/docket/?q=&type=r&order_by=score+desc&case_name=trump',
            'https://www.documentcloud.org/app/search?q=project%3Atrump-signed-documents',
            'https://www.justice.gov/archives/doj/trump-related-cases',
            'https://www.supremecourt.gov/search.aspx?filename=/docket/docketfiles/html/public/23-624.html',
            'https://www.nycourts.gov/courts/1jd/supctmanh/cases/trump.html',
            'https://www.gasupreme.us/cases/trump/',
            'https://www.dcd.uscourts.gov/criminal-cases/trump',
            'https://www.flmd.uscourts.gov/civil-cases/trump',
            'https://www.pacourts.us/courts/supreme-court/cases/trump',
            'https://www.maine.gov/courts/supreme/opinions/trump',
            'https://www.courts.illinois.gov/SupremeCourt/Opinions/trump.html'
        ],
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
        ]
    }
};

// Configuration for scraping behavior
const config = {
    maxConcurrent: 2,  // Reduced for more reliable scraping of legal documents
    requestDelay: {
        min: 10000,    // Increased minimum delay (10 seconds)
        max: 20000     // Increased maximum delay (20 seconds)
    },
    maxRequestsPerDomain: 25,   // Reduced for better rate limiting
    userAgentRotation: true,    
    proxyRotation: true,        
    retryAttempts: 5,          
    followRedirects: true,      
    respectRobotsTxt: true,     
    maxQuotesPerPage: 50,       // Reduced for legal documents
    minQuoteLength: 50,         // Increased for legal documents
    maxQuoteLength: 10000,      // Increased for legal documents
    
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
            'indictments',       // Prioritized document types
            'appeals',          
            'rulings',          
            'orders',           
            'transcripts',
            'legal_filings',
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
            'messages'
        ],
        // Enhanced settings for legal documents
        legal_documents: {
            extractCitations: true,      
            extractParties: true,        
            extractDates: true,          
            extractJudges: true,         
            extractCaseNumbers: true,    
            extractVenues: true,         
            extractCharges: true,        
            extractStatutes: true,       
            extractExhibits: true,       
            extractWitnesses: true,      
            maxPDFSize: 100 * 1024 * 1024, // 100MB max PDF size
            ocrEnabled: true,            
            ocrLanguage: 'eng',          
            pdfTextExtraction: 'hybrid',  // Use both PDF text and OCR
            prioritizeRecent: true,      // Prioritize recent documents
            includeCourtFilings: true,   // Include court filings
            includeExhibits: true,       // Include exhibits
            includeTranscripts: true,    // Include transcripts
            includeOrders: true,         // Include court orders
            includeRulings: true,        // Include court rulings
            includeAppeals: true,        // Include appeals
            includeIndictments: true     // Include indictments
        }
    }
};

export {
    sources,
    config
}; 