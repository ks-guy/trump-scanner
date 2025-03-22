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