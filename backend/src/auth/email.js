const nodemailer = require("nodemailer");
const env = require("../config/env");

function createTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

async function sendVerificationEmail({ email, verificationLink }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const subject = "Verify your HPC Alumni Association account";
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Welcome to HPC Alumni Association</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}">Verify Email</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
};

