-- Adds public landing grouping for committee posts (4 sections).
-- Safe to run once on existing DBs; matches ensureCommitteeTables.js.

ALTER TABLE `committee_posts`
  ADD COLUMN `board_section` VARCHAR(40) NULL
  AFTER `display_order`;
