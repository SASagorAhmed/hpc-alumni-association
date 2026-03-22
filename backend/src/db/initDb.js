const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const env = require("../config/env");

async function initDb() {
  const sqlPath = path.join(__dirname, "../../sql/schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  if (!env.db.host || !env.db.user || !env.db.password) {
    throw new Error("Set DB_HOST, DB_USER, DB_PASSWORD in backend/.env before running initDb.");
  }

  // Connect without specifying a database so `CREATE DATABASE` can run.
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    ssl:
      env.db.sslMode === "REQUIRED" || env.db.sslMode === "VERIFY_CA" || env.db.sslMode === "VERIFY_IDENTITY"
        ? {
            ca: env.db.sslCaPath
              ? fs.readFileSync(env.db.sslCaPath, "utf8")
              : env.db.sslCa || undefined,
            rejectUnauthorized: String(env.db.sslRejectUnauthorized).toLowerCase() !== "false",
          }
        : undefined,
  });

  try {
    await conn.query(sql);
    console.log("[backend] MySQL schema created successfully.");
  } finally {
    await conn.end();
  }
}

initDb().catch((e) => {
  console.error("[backend] initDb failed:", e.message);
  process.exit(1);
});

