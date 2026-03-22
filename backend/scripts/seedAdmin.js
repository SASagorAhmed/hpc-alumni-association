require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

async function main() {
  const email = "admin@gmail.com";
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 12);

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
      await conn.query(
        "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, true)",
        [userId, email, passwordHash]
      );
    } else {
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

    console.log("ADMIN_READY", userId);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("SEED_ADMIN_FAILED", e.message || e);
  process.exit(1);
});

