-- Extra fields for achievement detail page (alumni context + long-form achievement details)
ALTER TABLE achievements ADD COLUMN `alumni_ref_id` VARCHAR(128) NULL;
ALTER TABLE achievements ADD COLUMN `section` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `session` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `department` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `university` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `about` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `profession` TEXT NULL;
ALTER TABLE achievements ADD COLUMN `achievement_details` TEXT NULL;
