const databaseConfig = {
  // Main application database
  app: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'trump_scanner',
    password: process.env.DB_PASSWORD || 'trump_scanner_password',
    database: process.env.DB_NAME || 'trump_scanner',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  },
  
  // Redis cache database
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || 'trump_scanner_redis_password',
    db: parseInt(process.env.REDIS_DB) || 0
  },
  
  // Elasticsearch for full-text search
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USER || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || 'trump_scanner_elastic_password'
    }
  }
};

module.exports = databaseConfig; 