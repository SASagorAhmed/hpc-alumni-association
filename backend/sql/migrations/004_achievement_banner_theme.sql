ALTER TABLE achievement_settings
ADD COLUMN banner_theme VARCHAR(32) NULL DEFAULT 'default';

UPDATE achievement_settings
SET banner_theme = 'default'
WHERE banner_theme IS NULL OR TRIM(banner_theme) = '';
