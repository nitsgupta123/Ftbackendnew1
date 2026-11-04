-- Promotions module — offers that can apply to selected packages, or to all packages
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  booking_from DATE NULL COMMENT 'Customer must book on or after this date',
  booking_to DATE NULL COMMENT 'Customer must book on or before this date',
  travel_from DATE NULL COMMENT 'Travel date this offer applies from',
  travel_to DATE NULL COMMENT 'Travel date this offer applies to',
  discount_type ENUM('percentage', 'fixed_amount') NOT NULL DEFAULT 'percentage',
  value DECIMAL(12, 2) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_promotions_status (status),
  KEY idx_promotions_booking (booking_from, booking_to),
  KEY idx_promotions_travel (travel_from, travel_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promotion_packages (
  promotion_id BIGINT UNSIGNED NOT NULL,
  package_key VARCHAR(64) NOT NULL COMMENT 'wizard:{id} or legacy:{id}. No rows means all packages.',
  PRIMARY KEY (promotion_id, package_key),
  KEY idx_promotion_packages_key (package_key),
  CONSTRAINT fk_promotion_packages_promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
