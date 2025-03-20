-- Drop existing source categories
TRUNCATE TABLE source_categories;

-- Insert updated source categories with verification levels
INSERT INTO source_categories (name, description, verification_level) VALUES
-- Primary Sources (Direct Quotes)
('Official Government', 'Official government websites, press releases, and documents', 'primary'),
('Press Conferences', 'Official press conferences and media briefings', 'primary'),
('Court Documents', 'Official court documents and legal proceedings', 'primary'),
('Official Statements', 'Official statements and announcements', 'primary'),
('Direct Interviews', 'Direct interviews with Trump or his representatives', 'primary'),
('Official Social Media', 'Official social media accounts and verified channels', 'primary'),
('Campaign Materials', 'Official campaign materials and communications', 'primary'),

-- International News Sources (By Region)
('North American News', 'News sources from North America', 'secondary'),
('European News', 'News sources from Europe', 'secondary'),
('Asian News', 'News sources from Asia', 'secondary'),
('Middle Eastern News', 'News sources from the Middle East', 'secondary'),
('African News', 'News sources from Africa', 'secondary'),
('Latin American News', 'News sources from Latin America', 'secondary'),
('Oceania News', 'News sources from Oceania', 'secondary'),

-- Specialized Sources
('Business News', 'Business and financial news sources', 'secondary'),
('Political News', 'Political news and analysis sources', 'secondary'),
('Local News', 'Local and regional news sources', 'secondary'),
('Alternative News', 'Alternative and independent news sources', 'secondary'),
('Archived Content', 'Content from archive.org and other archival sources', 'secondary'),

-- Tertiary Sources (For Context Only)
('Analysis & Commentary', 'Analysis and commentary on Trump-related content', 'tertiary'),
('Blog Posts', 'Blog posts and opinion pieces', 'tertiary'),
('Social Media Discussion', 'Social media discussions and reactions', 'tertiary');

-- Add verification_level column to sources table if it doesn't exist
ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS verification_level ENUM('primary', 'secondary', 'tertiary') DEFAULT 'secondary',
ADD COLUMN IF NOT EXISTS region VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_official_source BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT TRUE;

-- Add source verification rules
CREATE TABLE IF NOT EXISTS source_verification_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT NOT NULL,
    verification_type ENUM('manual', 'automated', 'hybrid') NOT NULL,
    verification_frequency ENUM('daily', 'weekly', 'monthly', 'on_update') NOT NULL,
    required_checks JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add source verification history
CREATE TABLE IF NOT EXISTS source_verification_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT NOT NULL,
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status ENUM('passed', 'failed', 'pending') NOT NULL,
    verification_notes TEXT,
    verified_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 