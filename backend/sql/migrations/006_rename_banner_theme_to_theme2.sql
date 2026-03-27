UPDATE achievement_settings
SET banner_theme = 'theme2'
WHERE LOWER(TRIM(COALESCE(banner_theme, ''))) = 'tomato';

UPDATE achievements
SET banner_theme = 'theme2'
WHERE LOWER(TRIM(COALESCE(banner_theme, ''))) = 'tomato';

UPDATE achievement_settings
SET banner_theme = 'default'
WHERE LOWER(TRIM(COALESCE(banner_theme, ''))) = 'theme3';

UPDATE achievements
SET banner_theme = 'default'
WHERE LOWER(TRIM(COALESCE(banner_theme, ''))) = 'theme3';
