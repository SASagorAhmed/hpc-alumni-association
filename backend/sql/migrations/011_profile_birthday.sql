-- Optional date of birth for alumni profiles (registration + editable in profile; visible to admins).
ALTER TABLE profiles ADD COLUMN `birthday` DATE NULL AFTER `blood_group`;
