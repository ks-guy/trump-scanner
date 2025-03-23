const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Custom metrics
const documentsScrapeCounter = new client.Counter({
    name: 'scraper_documents_total',
    help: 'Total number of documents scraped',
    labelNames: ['status']
});

const scrapeTimeHistogram = new client.Histogram({
    name: 'scraper_document_processing_duration_seconds',
    help: 'Time spent processing each document',
    buckets: [1, 2, 5, 10, 20, 30, 60]
});

const documentSizeGauge = new client.Gauge({
    name: 'scraper_document_size_bytes',
    help: 'Size of scraped documents in bytes'
});

const errorCounter = new client.Counter({
    name: 'scraper_errors_total',
    help: 'Total number of scraping errors',
    labelNames: ['type']
});

const activeScrapesGauge = new client.Gauge({
    name: 'scraper_active_scrapes',
    help: 'Number of currently active scraping operations'
});

// Register custom metrics
register.registerMetric(documentsScrapeCounter);
register.registerMetric(scrapeTimeHistogram);
register.registerMetric(documentSizeGauge);
register.registerMetric(errorCounter);
register.registerMetric(activeScrapesGauge);

module.exports = {
    register,
    metrics: {
        documentsScrapeCounter,
        scrapeTimeHistogram,
        documentSizeGauge,
        errorCounter,
        activeScrapesGauge
    }
}; 