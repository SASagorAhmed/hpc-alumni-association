ALTER TABLE achievements
ADD COLUMN banner_theme VARCHAR(32) NULL DEFAULT 'default';

UPDATE achievements
SET banner_theme = 'default'
WHERE banner_theme IS NULL OR TRIM(banner_theme) = '';
