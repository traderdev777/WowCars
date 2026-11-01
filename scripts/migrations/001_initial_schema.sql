-- =====================================================================
-- WowCars Production Relational Database Schema Migration 001
-- Target: MySQL 8.0+ / MariaDB 10.3+ (Standard cPanel Hosting)
-- Strict ₹0 Additional Cost — Uses Included Hosting Database
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DEALERS TABLE
CREATE TABLE IF NOT EXISTS `dealers` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(128) NOT NULL,
  `locality` VARCHAR(255) NOT NULL,
  `address` TEXT NOT NULL,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 4.50,
  `reviews_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `whatsapp_number` VARCHAR(32) NOT NULL,
  `established_year` INT UNSIGNED NOT NULL DEFAULT 2020,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `avatar_emoji` VARCHAR(16) NOT NULL DEFAULT '🏢',
  `speciality` VARCHAR(255) NOT NULL DEFAULT 'Multi-brand Pre-owned Cars',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dealers_slug` (`slug`),
  KEY `idx_dealers_locality` (`locality`),
  KEY `idx_dealers_verified` (`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SELLERS TABLE (Private seller contact details)
CREATE TABLE IF NOT EXISTS `sellers` (
  `id` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `whatsapp` VARCHAR(32) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `locality` VARCHAR(255) NOT NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Bengaluru',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sellers_phone` (`phone`),
  KEY `idx_sellers_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ADMINISTRATORS TABLE
CREATE TABLE IF NOT EXISTS `admins` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `token_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `password_changed_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_username` (`username`),
  KEY `idx_admins_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CARS TABLE (Vehicles with strict pre-moderation status)
CREATE TABLE IF NOT EXISTS `cars` (
  `id` VARCHAR(64) NOT NULL,
  `listing_code` VARCHAR(32) NOT NULL,
  `seller_id` VARCHAR(64) DEFAULT NULL,
  `dealer_id` VARCHAR(64) DEFAULT NULL,
  `seller_type` ENUM('Individual', 'Verified Dealer') NOT NULL DEFAULT 'Individual',
  `dealer_name` VARCHAR(255) DEFAULT NULL,
  `make` VARCHAR(64) NOT NULL,
  `model` VARCHAR(64) NOT NULL,
  `variant` VARCHAR(128) NOT NULL,
  `year` INT UNSIGNED NOT NULL,
  `price_inr` INT UNSIGNED NOT NULL,
  `km_driven` INT UNSIGNED NOT NULL,
  `fuel_type` ENUM('Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid') NOT NULL,
  `transmission` ENUM('Manual', 'Automatic') NOT NULL,
  `body_type` ENUM('Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury') NOT NULL,
  `color` VARCHAR(64) NOT NULL,
  `num_owners` INT UNSIGNED NOT NULL DEFAULT 1,
  `rto_code` VARCHAR(16) NOT NULL,
  `rto_area` VARCHAR(128) NOT NULL,
  `insurance_type` VARCHAR(64) NOT NULL DEFAULT 'Comprehensive',
  `insurance_validity` VARCHAR(64) DEFAULT NULL,
  `hypothecation_status` VARCHAR(128) DEFAULT NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Bengaluru',
  `locality` VARCHAR(255) NOT NULL,
  `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SOLD') NOT NULL DEFAULT 'PENDING_APPROVAL',
  `rejection_reason` TEXT DEFAULT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_seed_data` TINYINT(1) NOT NULL DEFAULT 0,
  `overview` TEXT DEFAULT NULL,
  `features_json` JSON DEFAULT NULL,
  `inspection_score` DECIMAL(3, 1) DEFAULT NULL,
  `engine_displacement` VARCHAR(32) DEFAULT NULL,
  `mileage_arai` VARCHAR(32) DEFAULT NULL,
  `seating_capacity` INT UNSIGNED DEFAULT 5,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cars_listing_code` (`listing_code`),
  KEY `idx_cars_status` (`status`),
  KEY `idx_cars_city_status` (`city`, `status`),
  KEY `idx_cars_price` (`price_inr`),
  KEY `idx_cars_dealer` (`dealer_id`),
  KEY `idx_cars_seller` (`seller_id`),
  KEY `idx_cars_seed` (`is_seed_data`),
  CONSTRAINT `fk_cars_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cars_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CAR IMAGES TABLE
CREATE TABLE IF NOT EXISTS `car_images` (
  `id` VARCHAR(64) NOT NULL,
  `car_id` VARCHAR(64) NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `display_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_cover` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_car_images_car` (`car_id`),
  CONSTRAINT `fk_car_images_car` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BUYER ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` VARCHAR(64) NOT NULL,
  `car_id` VARCHAR(64) NOT NULL,
  `car_title` VARCHAR(255) DEFAULT NULL,
  `car_listing_code` VARCHAR(32) DEFAULT NULL,
  `dealer_id` VARCHAR(64) DEFAULT NULL,
  `seller_id` VARCHAR(64) DEFAULT NULL,
  `buyer_name` VARCHAR(255) NOT NULL,
  `buyer_phone` VARCHAR(32) NOT NULL,
  `buyer_email` VARCHAR(255) DEFAULT NULL,
  `enquiry_type` VARCHAR(64) NOT NULL DEFAULT 'CALLBACK_REQUEST',
  `preferred_date` VARCHAR(32) DEFAULT NULL,
  `preferred_slot` VARCHAR(32) DEFAULT NULL,
  `preferred_time` VARCHAR(32) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'NEW',
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enquiries_dealer` (`dealer_id`),
  KEY `idx_enquiries_car` (`car_id`),
  KEY `idx_enquiries_status` (`status`),
  KEY `idx_enquiries_created` (`created_at`),
  CONSTRAINT `fk_enquiries_car` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enquiries_dealer` FOREIGN KEY (`dealer_id`) REFERENCES `dealers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enquiries_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. AUDIT & MODERATION EVENTS TABLE (Tamper-evident log)
CREATE TABLE IF NOT EXISTS `moderation_events` (
  `id` VARCHAR(64) NOT NULL,
  `car_id` VARCHAR(64) NOT NULL,
  `car_listing_code` VARCHAR(32) NOT NULL,
  `admin_id` VARCHAR(64) NOT NULL,
  `admin_name` VARCHAR(255) NOT NULL,
  `action` ENUM('APPROVED', 'REJECTED', 'MARKED_SOLD', 'RESTORED') NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mod_car` (`car_id`),
  KEY `idx_mod_admin` (`admin_id`),
  KEY `idx_mod_created` (`created_at`),
  CONSTRAINT `fk_mod_car` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
