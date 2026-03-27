-- Canonical governing-body secretary post title: মহাসচিব (replaces legacy সেক্রেটারি).
-- Backend also runs equivalent UPDATEs on startup (renameCommitteeSecretaryPostTitles).
-- Run manually if you cannot restart the server.

UPDATE `committee_posts`
SET `title` = 'মহাসচিব'
WHERE `title` = 'সেক্রেটারি';

UPDATE `committee_posts`
SET `title` = 'সাধারণ সম্পাদক / মহাসচিব'
WHERE `title` = 'সাধারণ সম্পাদক / সেক্রেটারি';
