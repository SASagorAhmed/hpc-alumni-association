/**
 * Creates committee_terms, committee_posts, and ensures committee_members
 * has all required columns — safe for Aiven / existing "defaultdb" that never ran the committee migration.
 *
 * Run:  cd backend && node scripts/ensureCommitteeTables.js
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const env = require("../src/config/env");

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(conn, table, keyName) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, keyName]
  );
  return rows.length > 0;
}

async function fkExists(conn, table, constraintName) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
    [table, constraintName]
  );
  return rows.length > 0;
}

async function addColumn(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`  [skip] ${table}.${column} already exists`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  [ok]   ADD ${table}.${column}`);
}

async function addKey(conn, table, keyName, columns) {
  if (await indexExists(conn, table, keyName)) {
    console.log(`  [skip] KEY ${keyName} on ${table}`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD KEY \`${keyName}\` (${columns})`);
  console.log(`  [ok]   ADD KEY ${keyName} on ${table}`);
}

async function addFk(conn, table, constraintName, column, refTable, refColumn, onDelete) {
  if (await fkExists(conn, table, constraintName)) {
    console.log(`  [skip] FK ${constraintName}`);
    return;
  }
  await conn.query(
    `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\`
     FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\` (\`${refColumn}\`) ON DELETE ${onDelete}`
  );
  console.log(`  [ok]   ADD FK ${constraintName}`);
}

async function main() {
  if (!env.db.host || !env.db.user || !env.db.password || !env.db.name) {
    console.error("Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in backend/.env");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
    ssl:
      env.db.sslMode === "REQUIRED" || env.db.sslMode === "VERIFY_CA" || env.db.sslMode === "VERIFY_IDENTITY"
        ? {
            ca: env.db.sslCaPath ? fs.readFileSync(env.db.sslCaPath, "utf8") : env.db.sslCa || undefined,
            rejectUnauthorized: String(env.db.sslRejectUnauthorized).toLowerCase() !== "false",
          }
        : undefined,
  });

  try {
    console.log(`[ensure-committee] Database: ${env.db.name}`);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`committee_terms\` (
        \`id\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`status\` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
        \`is_current\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`committee_terms_status_idx\` (\`status\`),
        KEY \`committee_terms_current_idx\` (\`is_current\`)
      ) ENGINE=InnoDB
    `);
    console.log("[ensure-committee] committee_terms: OK");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`committee_posts\` (
        \`id\` CHAR(36) NOT NULL,
        \`term_id\` CHAR(36) NOT NULL,
        \`title\` VARCHAR(500) NOT NULL,
        \`allows_multiple\` TINYINT(1) NOT NULL DEFAULT 1,
        \`is_highlight\` TINYINT(1) NOT NULL DEFAULT 0,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`committee_posts_term_order_idx\` (\`term_id\`, \`display_order\`)
      ) ENGINE=InnoDB
    `);
    console.log("[ensure-committee] committee_posts: OK (table created if missing)");

    const cpFk = "committee_posts_term_fk";
    if (!(await fkExists(conn, "committee_posts", cpFk))) {
      try {
        await conn.query(`
          ALTER TABLE \`committee_posts\`
          ADD CONSTRAINT \`${cpFk}\`
          FOREIGN KEY (\`term_id\`) REFERENCES \`committee_terms\` (\`id\`) ON DELETE CASCADE
        `);
        console.log(`[ensure-committee] ${cpFk}: added`);
      } catch (e) {
        console.warn(`[ensure-committee] Could not add ${cpFk}:`, e.message);
      }
    } else {
      console.log(`[ensure-committee] ${cpFk}: already present`);
    }

    await addColumn(
      conn,
      "committee_posts",
      "board_section",
      "VARCHAR(40) NULL COMMENT \"governing_body|executive_committee|committee_heads|committee_members\" AFTER `display_order`"
    );

    const cmExists = await tableExists(conn, "committee_members");

    if (!cmExists) {
      await conn.query(`
        CREATE TABLE \`committee_members\` (
          \`id\` CHAR(36) NOT NULL,
          \`term_id\` CHAR(36) NULL,
          \`post_id\` CHAR(36) NULL,
          \`name\` TEXT NOT NULL,
          \`designation\` TEXT NOT NULL,
          \`category\` VARCHAR(50) NOT NULL,
          \`batch\` TEXT NULL,
          \`alumni_id\` VARCHAR(100) NULL,
          \`phone\` VARCHAR(100) NULL,
          \`email\` VARCHAR(255) NULL,
          \`candidate_number\` VARCHAR(100) NULL,
          \`institution\` TEXT NULL,
          \`job_status\` TEXT NULL,
          \`profession\` TEXT NULL,
          \`location\` TEXT NULL,
          \`expertise\` TEXT NULL,
          \`about\` TEXT NULL,
          \`photo_url\` TEXT NULL,
          \`display_order\` INT NOT NULL DEFAULT 0,
          \`is_active\` BOOLEAN NULL DEFAULT TRUE,
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`committee_members_term_idx\` (\`term_id\`),
          KEY \`committee_members_post_idx\` (\`post_id\`),
          CONSTRAINT \`committee_members_term_fk\`
            FOREIGN KEY (\`term_id\`) REFERENCES \`committee_terms\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`committee_members_post_fk\`
            FOREIGN KEY (\`post_id\`) REFERENCES \`committee_posts\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
      console.log("[ensure-committee] committee_members: created (full table)");
    } else {
      console.log("[ensure-committee] committee_members: exists — adding any missing columns…");
      await addColumn(conn, "committee_members", "term_id", "CHAR(36) NULL AFTER `id`");
      await addColumn(conn, "committee_members", "post_id", "CHAR(36) NULL AFTER `term_id`");
      await addColumn(conn, "committee_members", "alumni_id", "VARCHAR(100) NULL AFTER `batch`");
      await addColumn(conn, "committee_members", "phone", "VARCHAR(100) NULL AFTER `alumni_id`");
      await addColumn(conn, "committee_members", "email", "VARCHAR(255) NULL AFTER `phone`");
      await addColumn(
        conn,
        "committee_members",
        "candidate_number",
        "VARCHAR(100) NULL AFTER `email`"
      );
      await addColumn(conn, "committee_members", "profession", "TEXT NULL AFTER `job_status`");

      await addKey(conn, "committee_members", "committee_members_term_idx", "`term_id`");
      await addKey(conn, "committee_members", "committee_members_post_idx", "`post_id`");

      try {
        await addFk(conn, "committee_members", "committee_members_term_fk", "term_id", "committee_terms", "id", "CASCADE");
      } catch (e) {
        console.warn("  [warn] committee_members_term_fk:", e.message);
      }
      try {
        await addFk(
          conn,
          "committee_members",
          "committee_members_post_fk",
          "post_id",
          "committee_posts",
          "id",
          "SET NULL"
        );
      } catch (e) {
        console.warn("  [warn] committee_members_post_fk:", e.message);
      }
    }

    console.log("[ensure-committee] Done. Restart the backend if it was running.");
  } catch (e) {
    console.error("[ensure-committee] Failed:", e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();