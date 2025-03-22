-- Set the character set and collation
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create source_categories table
CREATE TABLE IF NOT EXISTS source_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(768) NOT NULL,
    category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_proxy BOOLEAN DEFAULT FALSE,
    rate_limit_per_hour INT DEFAULT 100,
    last_scraped TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES source_categories(id),
    UNIQUE KEY unique_source_url (url(768))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create archive_sources table
CREATE TABLE IF NOT EXISTS archive_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_url VARCHAR(768) NOT NULL,
    archive_url VARCHAR(768) NOT NULL,
    archive_date TIMESTAMP NULL,
    snapshot_id VARCHAR(255),
    is_accessible BOOLEAN DEFAULT TRUE,
    last_checked TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_archive_url (archive_url(768)),
    INDEX idx_original_url (original_url(768))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    archive_source_id INT,
    url VARCHAR(768) NOT NULL,
    title VARCHAR(512),
    content TEXT,
    author VARCHAR(255),
    published_date TIMESTAMP NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (archive_source_id) REFERENCES archive_sources(id),
    UNIQUE KEY unique_article_url (url(768))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT,
    quote_text TEXT NOT NULL,
    context TEXT,
    timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FULLTEXT INDEX idx_quote_text (quote_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create scraping_logs table
CREATE TABLE IF NOT EXISTS scraping_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    archive_source_id INT,
    url VARCHAR(768) NOT NULL,
    status_code INT,
    error_message TEXT,
    error_type VARCHAR(50),
    retry_count INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (archive_source_id) REFERENCES archive_sources(id),
    INDEX idx_url (url(768)),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    domain VARCHAR(255) NOT NULL,
    last_request TIMESTAMP NULL,
    request_count INT DEFAULT 0,
    hour_start TIMESTAMP NULL,
    PRIMARY KEY (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create robots_cache table
CREATE TABLE IF NOT EXISTS robots_cache (
    domain VARCHAR(255) NOT NULL,
    rules TEXT,
    last_updated TIMESTAMP NULL,
    PRIMARY KEY (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create proxy_pool table
CREATE TABLE IF NOT EXISTS proxy_pool (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proxy_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP NULL,
    success_rate FLOAT DEFAULT 0,
    total_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_proxy_url (proxy_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create media_content table
CREATE TABLE IF NOT EXISTS media_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT,
    source_url VARCHAR(768) NOT NULL,
    media_type ENUM('video', 'audio', 'image') NOT NULL,
    title VARCHAR(512),
    description TEXT,
    duration INT,
    thumbnail_url VARCHAR(768),
    storage_path VARCHAR(768),
    file_size BIGINT,
    format VARCHAR(50),
    resolution VARCHAR(50),
    bitrate INT,
    is_downloaded BOOLEAN DEFAULT FALSE,
    download_status VARCHAR(50),
    last_attempted_download TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_source_url (source_url(768)),
    INDEX idx_media_type (media_type),
    INDEX idx_download_status (download_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quote_media table
CREATE TABLE IF NOT EXISTS quote_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    media_content_id INT NOT NULL,
    timestamp_start INT,
    timestamp_end INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (media_content_id) REFERENCES media_content(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create scraping_stats table
CREATE TABLE IF NOT EXISTS scraping_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    archive_source_id INT,
    date DATE NOT NULL,
    articles_scraped INT DEFAULT 0,
    quotes_found INT DEFAULT 0,
    errors_count INT DEFAULT 0,
    avg_response_time FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (archive_source_id) REFERENCES archive_sources(id),
    UNIQUE KEY unique_source_date (source_id, archive_source_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create media_download_queue table
CREATE TABLE IF NOT EXISTS media_download_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    media_content_id INT NOT NULL,
    priority INT DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    last_attempt TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (media_content_id) REFERENCES media_content(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create media_storage table
CREATE TABLE IF NOT EXISTS media_storage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    storage_type VARCHAR(50) NOT NULL,
    base_path VARCHAR(768) NOT NULL,
    max_storage_size BIGINT,
    current_usage BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_storage_type (storage_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create media_processing_logs table
CREATE TABLE IF NOT EXISTS media_processing_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    media_content_id INT NOT NULL,
    process_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processing_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_content_id) REFERENCES media_content(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    url VARCHAR(768) NOT NULL,
    title VARCHAR(512),
    case_number VARCHAR(255),
    court VARCHAR(255),
    filing_date TIMESTAMP NULL,
    content TEXT,
    metadata JSON,
    pdf_urls JSON,
    downloaded_pdfs JSON,
    pdf_content JSON,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    UNIQUE KEY unique_document_url (url(768)),
    INDEX idx_case_number (case_number),
    INDEX idx_court (court),
    INDEX idx_filing_date (filing_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default source categories
INSERT IGNORE INTO source_categories (name, description) VALUES
('Mainstream News', 'Traditional mainstream news sources'),
('Conservative News', 'Conservative-leaning news sources'),
('Liberal News', 'Liberal-leaning news sources'),
('Business News', 'Business and financial news sources'),
('International News', 'International news sources'),
('Political News', 'Political news and analysis sources'),
('Local News', 'Local and regional news sources'),
('Alternative News', 'Alternative and independent news sources'),
('Social Media', 'Social media platforms and content'),
('Archived Content', 'Content from archive.org and other archival sources');

-- Insert default media storage location
INSERT IGNORE INTO media_storage (storage_type, base_path, max_storage_size) VALUES
('local', './media_storage', 10737418240); -- 10GB default storage limit

SET FOREIGN_KEY_CHECKS = 1; 