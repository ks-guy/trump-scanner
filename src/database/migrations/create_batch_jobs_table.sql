CREATE TABLE IF NOT EXISTS batch_jobs (
    id VARCHAR(36) PRIMARY KEY,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    total_files INT NOT NULL,
    processed_files INT DEFAULT 0,
    successful_files INT DEFAULT 0,
    failed_files INT DEFAULT 0,
    progress FLOAT DEFAULT 0,
    options JSON,
    results JSON,
    error TEXT,
    total_input_size BIGINT DEFAULT 0,
    total_output_size BIGINT DEFAULT 0,
    compression_ratio FLOAT DEFAULT 0,
    processing_time_ms BIGINT DEFAULT 0,
    average_time_per_file_ms BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add compression specific metrics table
CREATE TABLE IF NOT EXISTS compression_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(36),
    file_name VARCHAR(255),
    input_format VARCHAR(10),
    output_format VARCHAR(10),
    input_size BIGINT,
    output_size BIGINT,
    compression_ratio FLOAT,
    processing_time_ms BIGINT,
    codec VARCHAR(10),
    preset VARCHAR(20),
    crf INT,
    resolution VARCHAR(20),
    bitrate VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
    INDEX idx_batch_id (batch_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 