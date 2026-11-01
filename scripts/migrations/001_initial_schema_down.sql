-- =====================================================================
-- WowCars Migration 001 Rollback Script
-- Drops all created tables in reverse dependency order
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `moderation_events`;
DROP TABLE IF EXISTS `enquiries`;
DROP TABLE IF EXISTS `car_images`;
DROP TABLE IF EXISTS `cars`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `sellers`;
DROP TABLE IF EXISTS `dealers`;

SET FOREIGN_KEY_CHECKS = 1;
