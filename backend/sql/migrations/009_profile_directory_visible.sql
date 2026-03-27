-- Alumni directory listing: default visible (1); admin can set 0 to hide from public directory.
ALTER TABLE `profiles`
  ADD COLUMN `directory_visible` TINYINT(1) NOT NULL DEFAULT 1;
