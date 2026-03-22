# SQL migrations (existing Aiven / MySQL databases)

## Committee tables missing (`committee_terms`, `committee_posts`, or new `committee_members` columns)

**Easiest (recommended):** from `backend/` with `.env` configured:

```bash
npm run db:committee
```

This runs `scripts/ensureCommitteeTables.js`, which creates missing tables and adds missing columns safely (idempotent).

## Manual SQL (alternative)

If you **already** have the old `committee_members` table only:

```bash
mysql -h HOST -u USER -p DB_NAME < sql/migrations/002_committee_module.sql
```

(or paste the file in Aiven’s query console).  
If `committee_members` **does not exist at all**, prefer `npm run db:committee` — the raw SQL migration assumes that table exists.

**Fresh install:** use the root `sql/schema.sql` only — it already includes the full committee model.
