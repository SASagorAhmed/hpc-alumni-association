require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

/** Default production admin email (override with ADMIN_EMAIL in .env). */
const DEFAULT_ADMIN_EMAIL = "sagormimmarriage@gmail.com";

async function main() {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const [urows] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    const userId = urows[0]?.id || uuid();

    if (!urows.length) {
      if (!password || !String(password).trim()) {
        console.error(
          "SEED_ADMIN_FAILED: ADMIN_SEED_PASSWORD must be set in .env to create the admin user."
        );
        process.exit(1);
      }
      const passwordHash = await bcrypt.hash(String(password), 12);
      await conn.query(
        "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, true)",
        [userId, email, passwordHash]
      );
    } else if (password && String(password).trim()) {
      const passwordHash = await bcrypt.hash(String(password), 12);
      await conn.query("UPDATE users SET password_hash = ?, email_verified = true WHERE id = ?", [
        passwordHash,
        userId,
      ]);
    }

    const [prows] = await conn.query("SELECT id FROM profiles WHERE id = ? LIMIT 1", [userId]);
    if (!prows.length) {
      await conn.query(
        "INSERT INTO profiles (id, name, phone, batch, department, verified, approved, blocked, profile_pending, social_links) VALUES (?, ?, NULL, ?, ?, true, true, false, false, NULL)",
        [userId, "Admin User", "N/A", "Administration"]
      );
    } else {
      await conn.query(
        "UPDATE profiles SET name = ?, verified = true, approved = true, blocked = false, profile_pending = false WHERE id = ?",
        ["Admin User", userId]
      );
    }

    const [arows] = await conn.query(
      "SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
      [userId]
    );
    if (!arows.length) {
      await conn.query("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')", [uuid(), userId]);
    }

    console.log("ADMIN_READY", userId, email);
    if (!password || !String(password).trim()) {
      console.log(
        "Note: Password unchanged (user already existed). Set ADMIN_SEED_PASSWORD to rotate it."
      );
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("SEED_ADMIN_FAILED", e.message || e);
  process.exit(1);
});
