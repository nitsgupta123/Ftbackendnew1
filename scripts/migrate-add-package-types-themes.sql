-- Package Type and Package Themes catalogs (Packages → Settings)
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS package_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_types_name (name),
  UNIQUE KEY uq_package_types_slug (slug),
  KEY idx_package_types_status (status),
  KEY idx_package_types_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_themes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_themes_name (name),
  UNIQUE KEY uq_package_themes_slug (slug),
  KEY idx_package_themes_status (status),
  KEY idx_package_themes_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO package_types (name, slug, description, display_order, status, created_by, updated_by)
VALUES
  ('Leisure', 'leisure', 'Relaxed sightseeing and holiday travel.', 1, 'active', 'System', 'System'),
  ('Adventure', 'adventure', 'Active trips built around outdoor experiences.', 2, 'active', 'System', 'System'),
  ('Safari', 'safari', 'Wildlife and safari itineraries.', 3, 'active', 'System', 'System'),
  ('Honeymoon', 'honeymoon', 'Romantic trips for couples.', 4, 'active', 'System', 'System'),
  ('Family', 'family', 'Trips planned for families travelling together.', 5, 'active', 'System', 'System'),
  ('Cruise', 'cruise', 'Ocean or river cruise departures.', 6, 'active', 'System', 'System'),
  ('MICE', 'mice', 'Meetings, incentives, conferences, and events.', 7, 'active', 'System', 'System');

INSERT IGNORE INTO package_themes (name, slug, description, display_order, status, created_by, updated_by)
VALUES
  ('Family Holidays', 'family-holidays', 'Audience theme for family travel.', 1, 'active', 'System', 'System'),
  ('Honeymoon', 'honeymoon', 'Audience theme for couples and honeymoons.', 2, 'active', 'System', 'System'),
  ('Adventure', 'adventure', 'Style theme for active and outdoor trips.', 3, 'active', 'System', 'System'),
  ('Luxury', 'luxury', 'Premium and high-end travel.', 4, 'active', 'System', 'System'),
  ('Beach', 'beach', 'Coastal and island holidays.', 5, 'active', 'System', 'System'),
  ('Wildlife', 'wildlife', 'Safari, nature, and wildlife encounters.', 6, 'active', 'System', 'System'),
  ('Cultural', 'cultural', 'Heritage, cities, and cultural experiences.', 7, 'active', 'System', 'System'),
  ('Wellness', 'wellness', 'Spa, retreat, and wellness travel.', 8, 'active', 'System', 'System'),
  ('City Break', 'city-break', 'Short urban getaways.', 9, 'active', 'System', 'System'),
  ('Festival', 'festival', 'Event and festival-led trips.', 10, 'active', 'System', 'System');
