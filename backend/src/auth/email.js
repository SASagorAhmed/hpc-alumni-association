const nodemailer = require("nodemailer");
const env = require("../config/env");
const { EMAIL_TYPES, sendGovernedEmail } = require("../email/governance");

const BRAND_SENDER_NAME = "HPC Alumni Association";

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

function extractSenderAddress(rawFrom) {
  const from = String(rawFrom || "").trim();
  if (!from) return "";

  const bracketMatch = from.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return from;
  return "";
}

function getBrandedFromHeader() {
  const senderAddress = extractSenderAddress(env.smtp.from) || String(env.smtp.user || "").trim();
  if (!senderAddress) {
    throw new Error("SMTP sender is not configured (set SMTP_FROM or SMTP_USER in backend/.env).");
  }
  return `${BRAND_SENDER_NAME} <${senderAddress}>`;
}

async function sendVerificationEmail({ pool, email, verificationLink, recipientUserId, initiatedBy }) {
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

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.AUTH_VERIFY,
    recipientEmail: email,
    recipientUserId,
    initiatedBy,
    mailOptions: {
      from: getBrandedFromHeader(),
      to: email,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Verification email was not sent");
  }
}

async function sendPasswordResetEmail({ pool, email, resetLink, recipientUserId, initiatedBy }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const subject = "Reset your HPC Alumni Association password";
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Password reset</h2>
      <p>We received a request to reset the password for your HPC Alumni Association account. Click the link below to choose a new password:</p>
      <p><a href="${resetLink}">Reset password</a></p>
      <p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>
    </div>
  `;

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.AUTH_RESET,
    recipientEmail: email,
    recipientUserId,
    initiatedBy,
    mailOptions: {
      from: getBrandedFromHeader(),
      to: email,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Password reset email was not sent");
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};

