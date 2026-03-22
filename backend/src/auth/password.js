const bcrypt = require("bcryptjs");

async function hashPassword(password) {
  // Work factor tuned for typical deployments; increase later if needed.
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};

