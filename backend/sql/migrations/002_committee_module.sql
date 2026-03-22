-- Committee module: terms, structured posts, members linked to posts
-- REQUIRES existing `committee_members` table (old shape). If that table does NOT exist,
-- use instead:  cd backend && npm run db:committee
-- Run after initial schema (additive migration).

CREATE TABLE IF NOT EXISTS `committee_terms` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `is_current` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `committee_terms_status_idx` (`status`),
  KEY `committee_terms_current_idx` (`is_current`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `committee_posts` (
  `id` CHAR(36) NOT NULL,
  `term_id` CHAR(36) NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `allows_multiple` TINYINT(1) NOT NULL DEFAULT 1,
  `is_highlight` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `committee_posts_term_order_idx` (`term_id`, `display_order`),
  CONSTRAINT `committee_posts_term_fk`
    FOREIGN KEY (`term_id`) REFERENCES `committee_terms` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE `committee_members`
  ADD COLUMN `term_id` CHAR(36) NULL AFTER `id`,
  ADD COLUMN `post_id` CHAR(36) NULL AFTER `term_id`,
  ADD COLUMN `alumni_id` VARCHAR(100) NULL AFTER `batch`,
  ADD COLUMN `phone` VARCHAR(100) NULL AFTER `alumni_id`,
  ADD COLUMN `email` VARCHAR(255) NULL AFTER `phone`,
  ADD COLUMN `candidate_number` VARCHAR(100) NULL AFTER `email`,
  ADD COLUMN `profession` TEXT NULL AFTER `job_status`;

-- Add keys/FKs only when columns were just created (safe re-run: ignore errors manually if needed)
ALTER TABLE `committee_members`
  ADD KEY `committee_members_term_idx` (`term_id`),
  ADD KEY `committee_members_post_idx` (`post_id`);

ALTER TABLE `committee_members`
  ADD CONSTRAINT `committee_members_term_fk`
    FOREIGN KEY (`term_id`) REFERENCES `committee_terms` (`id`)
    ON DELETE CASCADE,
  ADD CONSTRAINT `committee_members_post_fk`
    FOREIGN KEY (`post_id`) REFERENCES `committee_posts` (`id`)
    ON DELETE SET NULL;
