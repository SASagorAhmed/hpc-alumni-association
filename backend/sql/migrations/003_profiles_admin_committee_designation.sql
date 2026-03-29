-- Committee designation shown on alumni profile + directory (admin-maintained; recomputed from current published term).
ALTER TABLE profiles
  ADD COLUMN `admin_committee_designation` VARCHAR(600) NULL;
