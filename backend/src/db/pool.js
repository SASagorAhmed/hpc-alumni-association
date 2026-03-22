const mysql = require("mysql2/promise");
const env = require("../config/env");
const fs = require("fs");

let pool = null;

function hasDbConfig() {
  return Boolean(env.db.host && env.db.user && env.db.password && env.db.name);
}

function getOrCreatePool() {
  if (pool) return pool;
  if (!hasDbConfig()) return null;

  pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    multipleStatements: true,
    connectionLimit: 10,
    queueLimit: 0,
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

  return pool;
}

async function getConnection() {
  const p = getOrCreatePool();
  if (!p) throw new Error("MySQL is not configured (missing DB_* env vars).");
  return p.getConnection();
}

module.exports = {
  getOrCreatePool,
  getConnection,
};

