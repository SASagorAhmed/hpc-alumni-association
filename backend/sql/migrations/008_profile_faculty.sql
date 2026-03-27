-- Faculty / stream: Science, Arts, Commerce (section letter A–J remains in `department`)

ALTER TABLE profiles ADD COLUMN faculty VARCHAR(32) NULL AFTER department;
