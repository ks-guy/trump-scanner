import client from 'prom-client';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'trump-scanner'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const documentProcessingDuration = new client.Histogram({
  name: 'document_processing_duration_seconds',
  help: 'Duration of document processing in seconds',
  labelNames: ['type', 'status'],
  buckets: [1, 5, 15, 30, 60]
});

const quotesScraped = new client.Counter({
  name: 'quotes_scraped_total',
  help: 'Total number of quotes scraped'
});

const documentsProcessed = new client.Counter({
  name: 'documents_processed_total',
  help: 'Total number of documents processed',
  labelNames: ['type', 'status']
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(documentProcessingDuration);
register.registerMetric(quotesScraped);
register.registerMetric(documentsProcessed);

export const promClient = {
  register,
  httpRequestDurationMicroseconds,
  documentProcessingDuration,
  quotesScraped,
  documentsProcessed
}; 