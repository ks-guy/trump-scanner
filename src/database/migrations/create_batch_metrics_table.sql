CREATE TABLE IF NOT EXISTS batch_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_type VARCHAR(50) NOT NULL,
    
    -- System Metrics
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_usage FLOAT,
    disk_io_read FLOAT,
    disk_io_write FLOAT,
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT,
    system_load_1m FLOAT,
    system_load_5m FLOAT,
    system_load_15m FLOAT,
    
    -- Queue Metrics
    queue_name VARCHAR(50),
    active_jobs INT,
    waiting_jobs INT,
    completed_jobs INT,
    failed_jobs INT,
    delayed_jobs INT,
    paused_jobs INT,
    queue_latency FLOAT,
    
    -- Processing Metrics
    total_processed_files INT,
    successful_files INT,
    failed_files INT,
    processing_time_ms BIGINT,
    average_processing_time_ms FLOAT,
    throughput_per_minute FLOAT,
    
    -- File Type Metrics
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    compression_ratio FLOAT,
    
    -- Error Metrics
    error_count INT,
    error_type VARCHAR(100),
    error_details JSON,
    
    -- Resource Usage per Job
    cpu_usage_per_job FLOAT,
    memory_usage_per_job FLOAT,
    disk_io_per_job FLOAT,
    
    -- Cache Metrics
    cache_hits INT,
    cache_misses INT,
    cache_usage_bytes BIGINT,
    
    -- Custom Processing Options
    processing_options JSON,
    
    -- Batch Information
    batch_id VARCHAR(36),
    total_files_in_batch INT,
    batch_priority INT,
    batch_status VARCHAR(50),
    
    -- Additional Metadata
    metadata JSON,
    tags JSON,
    
    -- Indexes
    INDEX idx_timestamp (timestamp),
    INDEX idx_metric_type (metric_type),
    INDEX idx_batch_id (batch_id),
    INDEX idx_file_type (file_type),
    INDEX idx_batch_status (batch_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 