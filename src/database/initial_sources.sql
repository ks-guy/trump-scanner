-- Insert Official Government Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour) 
SELECT 
    'White House Press Office',
    'https://www.whitehouse.gov/briefing-room/',
    id,
    'primary',
    true,
    'North America',
    50
FROM source_categories WHERE name = 'Official Government';

INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Congress.gov',
    'https://www.congress.gov/',
    id,
    'primary',
    true,
    'North America',
    50
FROM source_categories WHERE name = 'Official Government';

-- Insert Press Conference Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'C-SPAN',
    'https://www.c-span.org/search/?searchtype=Videos&sort=Most+Recent+Event',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Press Conferences';

INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'White House YouTube',
    'https://www.youtube.com/@whitehouse',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Press Conferences';

-- Insert Court Documents Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'PACER',
    'https://pacer.uscourts.gov/',
    id,
    'primary',
    true,
    'North America',
    50
FROM source_categories WHERE name = 'Court Documents';

INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Supreme Court',
    'https://www.supremecourt.gov/',
    id,
    'primary',
    true,
    'North America',
    50
FROM source_categories WHERE name = 'Court Documents';

-- Insert Official Statements Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Trump Campaign Website',
    'https://www.donaldjtrump.com/',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Official Statements';

-- Insert Direct Interviews Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Fox News Interviews',
    'https://www.foxnews.com/category/person/donald-trump',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Direct Interviews';

-- Insert Official Social Media Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Truth Social',
    'https://truthsocial.com/@realDonaldTrump',
    id,
    'primary',
    true,
    'North America',
    200
FROM source_categories WHERE name = 'Official Social Media';

INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Trump Campaign YouTube',
    'https://www.youtube.com/@TrumpCampaign',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Official Social Media';

-- Insert Campaign Materials Sources
INSERT INTO sources (name, url, category_id, verification_level, is_official_source, region, rate_limit_per_hour)
SELECT 
    'Trump Campaign Press',
    'https://www.donaldjtrump.com/press',
    id,
    'primary',
    true,
    'North America',
    100
FROM source_categories WHERE name = 'Campaign Materials';

-- Insert International News Sources (Secondary Sources)
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'BBC News',
    'https://www.bbc.com/news/world/us_and_canada',
    id,
    'secondary',
    'Europe',
    100
FROM source_categories WHERE name = 'European News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Reuters',
    'https://www.reuters.com/world/us/',
    id,
    'secondary',
    'Europe',
    100
FROM source_categories WHERE name = 'European News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Al Jazeera',
    'https://www.aljazeera.com/tag/donald-trump/',
    id,
    'secondary',
    'Middle East',
    100
FROM source_categories WHERE name = 'Middle Eastern News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Xinhua News',
    'http://www.xinhuanet.com/english/world/',
    id,
    'secondary',
    'Asia',
    100
FROM source_categories WHERE name = 'Asian News';

-- Add more European News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Le Monde',
    'https://www.lemonde.fr/international/',
    id,
    'secondary',
    'Europe',
    100
FROM source_categories WHERE name = 'European News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Der Spiegel',
    'https://www.spiegel.de/international/',
    id,
    'secondary',
    'Europe',
    100
FROM source_categories WHERE name = 'European News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'El País',
    'https://english.elpais.com/international/',
    id,
    'secondary',
    'Europe',
    100
FROM source_categories WHERE name = 'European News';

-- Add more Asian News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'The Japan Times',
    'https://www.japantimes.co.jp/news/world/',
    id,
    'secondary',
    'Asia',
    100
FROM source_categories WHERE name = 'Asian News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'The Korea Herald',
    'http://www.koreaherald.com/list.php?ct=020100000000',
    id,
    'secondary',
    'Asia',
    100
FROM source_categories WHERE name = 'Asian News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'The Straits Times',
    'https://www.straitstimes.com/world',
    id,
    'secondary',
    'Asia',
    100
FROM source_categories WHERE name = 'Asian News';

-- Add more Middle Eastern News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Haaretz',
    'https://www.haaretz.com/news/world/',
    id,
    'secondary',
    'Middle East',
    100
FROM source_categories WHERE name = 'Middle Eastern News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Gulf News',
    'https://gulfnews.com/world',
    id,
    'secondary',
    'Middle East',
    100
FROM source_categories WHERE name = 'Middle Eastern News';

-- Add African News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Daily Nation',
    'https://nation.africa/kenya/news/world',
    id,
    'secondary',
    'Africa',
    100
FROM source_categories WHERE name = 'African News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Mail & Guardian',
    'https://mg.co.za/world/',
    id,
    'secondary',
    'Africa',
    100
FROM source_categories WHERE name = 'African News';

-- Add Latin American News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'El Universal',
    'https://www.eluniversal.com.mx/mundo/',
    id,
    'secondary',
    'Latin America',
    100
FROM source_categories WHERE name = 'Latin American News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'Folha de S.Paulo',
    'https://www1.folha.uol.com.br/internacional/en/',
    id,
    'secondary',
    'Latin America',
    100
FROM source_categories WHERE name = 'Latin American News';

-- Add Oceania News Sources
INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'The Sydney Morning Herald',
    'https://www.smh.com.au/world',
    id,
    'secondary',
    'Oceania',
    100
FROM source_categories WHERE name = 'Oceania News';

INSERT INTO sources (name, url, category_id, verification_level, region, rate_limit_per_hour)
SELECT 
    'New Zealand Herald',
    'https://www.nzherald.co.nz/world/',
    id,
    'secondary',
    'Oceania',
    100
FROM source_categories WHERE name = 'Oceania News';

-- Insert verification rules for primary sources
INSERT INTO source_verification_rules (source_id, verification_type, verification_frequency, required_checks)
SELECT 
    s.id,
    'hybrid',
    'daily',
    JSON_ARRAY(
        'check_source_accessibility',
        'validate_content_structure',
        'verify_official_status',
        'check_quote_accuracy'
    )
FROM sources s
JOIN source_categories sc ON s.category_id = sc.id
WHERE sc.verification_level = 'primary';

-- Insert verification rules for secondary sources
INSERT INTO source_verification_rules (source_id, verification_type, verification_frequency, required_checks)
SELECT 
    s.id,
    'hybrid',
    'weekly',
    JSON_ARRAY(
        'check_source_accessibility',
        'validate_content_structure',
        'cross_reference_quotes'
    )
FROM sources s
JOIN source_categories sc ON s.category_id = sc.id
WHERE sc.verification_level = 'secondary';

-- Insert initial verification history for all sources
INSERT INTO source_verification_history (source_id, verification_status, verification_notes, verified_by)
SELECT 
    id,
    'pending',
    'Initial verification pending',
    'system'
FROM sources; 