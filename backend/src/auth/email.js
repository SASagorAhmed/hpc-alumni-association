const nodemailer = require("nodemailer");
const env = require("../config/env");
const { EMAIL_TYPES, sendGovernedEmail } = require("../email/governance");

const BRAND_SENDER_NAME = "HPC Alumni Association";
const WEBSITE_NAME = "HPC Alumni Association";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendVerificationEmail({ pool, email, otpCode, expiresMinutes = 10, recipientUserId, initiatedBy }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const code = String(otpCode || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("A valid 6-digit OTP code is required");
  }
  const subject = "Your HPC Alumni verification code";
  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:16px;background:#f8fafc;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dbeafe;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="height:6px;background:linear-gradient(90deg,#16a34a,#2563eb);"></td>
              </tr>
              <tr>
                <td style="padding:20px;">
                  <h2 style="margin:0 0 10px;color:#0f172a;font-size:20px;">Verify your email</h2>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.7;">
                    Use this one-time code to verify your HPC Alumni Association account:
                  </p>
                  <p style="margin:0 0 14px;">
                    <span style="display:inline-block;padding:10px 14px;border:1px dashed #2563eb;border-radius:8px;background:#eff6ff;font-size:28px;letter-spacing:6px;font-weight:800;color:#1d4ed8;">
                      ${escapeHtml(code)}
                    </span>
                  </p>
                  <p style="margin:0 0 8px;color:#475569;font-size:13px;line-height:1.7;">
                    This code will expire in ${Number(expiresMinutes) || 10} minutes.
                  </p>
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.7;">
                    If you did not request this, you can ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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

async function sendAdminApprovalRequestEmail({
  pool,
  adminEmail,
  registrant,
  adminDashboardLink,
  initiatedBy,
}) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const details = {
    name: String(registrant?.name || "N/A").trim() || "N/A",
    email: String(registrant?.email || "N/A").trim() || "N/A",
    alumniId: String(registrant?.alumniId || "N/A").trim() || "N/A",
    batch: String(registrant?.batch || "N/A").trim() || "N/A",
    department: String(registrant?.department || "N/A").trim() || "N/A",
    section: String(registrant?.section || "N/A").trim() || "N/A",
    post: String(registrant?.post || "N/A").trim() || "N/A",
    adminDashboardLink: String(adminDashboardLink || "").trim(),
  };

  const subject = `[Admin Alert] New Alumni Registration Awaiting Approval · ${details.name}`;
  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:18px 8px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="height:8px;background:linear-gradient(90deg,#2563eb,#0ea5e9,#6366f1);"></td>
              </tr>
              <tr>
                <td style="padding:20px 22px 6px;">
                  <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">${escapeHtml(WEBSITE_NAME)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 22px 10px;">
                  <h2 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;font-weight:800;">New Alumni Approval Request</h2>
                </td>
              </tr>
              <tr>
                <td style="padding:0 22px 18px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
                    Dear Admin,<br/>
                    A new alumni user has registered on the platform and is currently awaiting your approval.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 22px 16px;">
                  <div style="border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;padding:14px;">
                    <p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:#1e3a8a;font-weight:700;">Please review the user details below:</p>
                    <p style="margin:0;font-size:13px;line-height:1.8;color:#0f172a;">
                      👤 <strong>Full Name:</strong> ${escapeHtml(details.name)}<br/>
                      📧 <strong>Email Address:</strong> ${escapeHtml(details.email)}<br/>
                      🆔 <strong>Alumni ID:</strong> ${escapeHtml(details.alumniId)}<br/>
                      🎓 <strong>Batch:</strong> ${escapeHtml(details.batch)}<br/>
                      🏫 <strong>Department:</strong> ${escapeHtml(details.department)}<br/>
                      📍 <strong>Section:</strong> ${escapeHtml(details.section)}<br/>
                      💼 <strong>Current Position:</strong> ${escapeHtml(details.post)}
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 22px 16px;">
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#334155;">
                    This user will not be able to access full platform features until approval is granted.
                    Please log in to the admin panel to review and take appropriate action.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 22px 8px;">
                  <a href="${escapeHtml(details.adminDashboardLink)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:700;">
                    Open Admin User Management
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 22px 20px;">
                  <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                    If you did not expect this registration, please review it carefully before approving.<br/>
                    Thank you,<br/>
                    ${escapeHtml(WEBSITE_NAME)}<br/>
                    Automated Notification System
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.NOTIFICATION,
    recipientEmail: adminEmail,
    initiatedBy,
    metaJson: {
      title: subject,
      notification_kind: "admin_approval_request",
      audience: "admin",
    },
    mailOptions: {
      from: getBrandedFromHeader(),
      to: adminEmail,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Admin approval alert email was not sent");
  }
}

async function sendAdminRoleGrantedEmail({
  pool,
  recipientEmail,
  recipientUserId,
  recipientName,
  adminDashboardLink,
  signInLink,
  initiatedBy,
}) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const normalizedEmail = String(recipientEmail || "").trim().toLowerCase();
  const emailLocalPart = normalizedEmail.includes("@") ? normalizedEmail.split("@")[0] : "";
  const name = String(recipientName || "").trim() || emailLocalPart || "Admin";
  const safeDashboardLink = String(adminDashboardLink || "").trim();
  const safeSignInLink = String(signInLink || "").trim();
  const subject = "Congratulations! You are now an administrator";

  const html = `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="height:8px;background:linear-gradient(90deg,#16a34a,#0ea5e9,#2563eb);"></td>
              </tr>
              <tr>
                <td style="padding:22px 24px 8px;">
                  <p style="margin:0;color:#0f172a;font-size:16px;line-height:1.8;">
                    Dear ${escapeHtml(name)},
                  </p>
                  <p style="margin:10px 0 0;color:#0f172a;font-size:20px;line-height:1.5;font-weight:800;">
                    🎉 Congratulations!
                  </p>
                  <p style="margin:10px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    You have been appointed as an <strong>👑 Administrator</strong> of our platform.
                  </p>
                  <p style="margin:12px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    This is a great responsibility. As an admin, you now have the authority to manage and control important aspects of the website.
                    The platform gives you the power to oversee and maintain its operations.
                  </p>
                  <p style="margin:12px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    We expect you to carry out your responsibilities with honesty, ethics, and integrity. Our platform is built on trust, and it is very important to maintain that trust at all times.
                  </p>
                  <p style="margin:12px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    Please sign in to your account and access the admin dashboard to begin managing your responsibilities.
                  </p>
                  <p style="margin:14px 0 0;">
                    <a href="${escapeHtml(safeDashboardLink)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 18px;border-radius:10px;">
                      Open Admin Dashboard
                    </a>
                  </p>
                  <div style="margin:16px 0 0;padding:12px 14px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;">
                    <p style="margin:0 0 8px;color:#1e3a8a;font-size:12px;font-weight:700;letter-spacing:.02em;">Support Contact</p>
                    <p style="margin:0;color:#0f172a;font-size:13px;line-height:1.8;">
                      📞 Phone: 01887490789<br/>
                      👤 Head of Development Team: Sagor Ahmed<br/>
                      🌐 Platform: <a href="${escapeHtml(safeSignInLink)}" style="color:#1d4ed8;">HPC Alumni Association</a>
                    </p>
                  </div>
                  <p style="margin:14px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    We believe you will maintain professionalism, honesty, and strong ethical values while performing your role.
                  </p>
                  <p style="margin:10px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    Keep maintaining the trust of the platform and the community.
                  </p>
                  <p style="margin:10px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    Once again, congratulations.
                  </p>
                  <p style="margin:14px 0 0;color:#334155;font-size:13px;line-height:1.8;">
                    Best regards,<br/>
                    HPC Alumni Team<br/>
                    System Administration
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.NOTIFICATION,
    recipientEmail: normalizedEmail,
    recipientUserId,
    initiatedBy,
    metaJson: {
      title: subject,
      notification_kind: "admin_role_granted",
      audience: "admin",
    },
    mailOptions: {
      from: getBrandedFromHeader(),
      to: normalizedEmail,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Admin role granted email was not sent");
  }
}

async function sendAlumniApprovalSuccessEmail({
  pool,
  recipientEmail,
  recipientUserId,
  recipientName,
  verifierAdminName,
  signInLink,
  initiatedBy,
}) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const name = String(recipientName || "Member").trim() || "Member";
  const verifier = String(verifierAdminName || "").trim() || "HPC Alumni Association Team";
  const safeSignInLink = String(signInLink || "").trim();
  const subject = "Your profile has been approved and verified";

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;background:#f8fafc;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="height:8px;background:linear-gradient(90deg,#16a34a,#0ea5e9,#2563eb);"></td>
              </tr>
              <tr>
                <td style="padding:24px 24px 10px;">
                  <p style="margin:0 0 10px;color:#0f172a;font-size:16px;line-height:1.7;">
                    Dear ${escapeHtml(name)},
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    Assalamu Alaikum,
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    We are really happy to let you know that your profile has been <strong>approved and verified successfully</strong>.
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    After reviewing your details, we can confidently say that you are now a <strong>trusted member of our alumni community</strong>. It truly means a lot to have you with us.
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    This platform is something we deeply care about - it is built to <strong>connect our alumni, support each other, and create a strong and meaningful network</strong>. Now that you are verified, you can:
                  </p>
                  <ul style="margin:0 0 14px 18px;padding:0;color:#0f172a;font-size:14px;line-height:1.8;">
                    <li>Connect with other alumni members.</li>
                    <li>Get help or support others when needed.</li>
                    <li>In urgent needs such as blood donation, contact alumni in your city using directory filters and request support politely.</li>
                    <li>Stay connected with updates, activities, and share achievements with the community.</li>
                  </ul>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    Honestly, this platform runs on <strong>trust and connection</strong>, and we truly trust you as a part of this family.
                  </p>
                  <p style="margin:0 0 8px;color:#334155;font-size:14px;line-height:1.8;">
                    In the future, we hope you will stay involved - even in small ways:
                  </p>
                  <ul style="margin:0 0 16px 18px;padding:0;color:#0f172a;font-size:14px;line-height:1.8;">
                    <li>Sharing your experience and guidance.</li>
                    <li>Supporting alumni activities.</li>
                    <li>Helping the community whenever possible, including blood donation and other support initiatives.</li>
                  </ul>
                  <p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.8;">
                    You can now sign in and start exploring the platform.
                  </p>
                  <a href="${escapeHtml(safeSignInLink)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 18px;border-radius:10px;">
                    Sign In to Your Account
                  </a>
                  <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.8;">
                    Thank you again for being part of this journey. It truly means a lot.
                  </p>
                  <p style="margin:14px 0 0;color:#334155;font-size:13px;line-height:1.8;">
                    Warm regards,<br/>
                    ${escapeHtml(verifier)}<br/>
                    ${escapeHtml(WEBSITE_NAME)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.NOTIFICATION,
    recipientEmail,
    recipientUserId,
    initiatedBy,
    metaJson: {
      title: subject,
      notification_kind: "alumni_approved_verified",
      audience: "alumni",
      verifier_admin_name: verifier,
    },
    mailOptions: {
      from: getBrandedFromHeader(),
      to: recipientEmail,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Approval success email was not sent");
  }
}

async function sendProfileCorrectionFeedbackEmail({
  pool,
  recipientEmail,
  recipientUserId,
  correctionMessage,
  profileUpdateLink,
  initiatedBy,
}) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env).");
  }

  const toEmail = String(recipientEmail || "").trim().toLowerCase();
  if (!toEmail) {
    throw new Error("Recipient email is required for profile correction feedback");
  }
  const correction = String(correctionMessage || "").trim();
  if (!correction) {
    throw new Error("Correction message is required for profile correction feedback email");
  }
  const safeProfileUpdateLink = String(profileUpdateLink || "").trim();
  const subject = "Request to Update Your Profile Information";

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;background:#f8fafc;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="height:8px;background:linear-gradient(90deg,#f59e0b,#16a34a,#2563eb);"></td>
              </tr>
              <tr>
                <td style="padding:24px 24px 10px;">
                  <p style="margin:0 0 12px;color:#0f172a;font-size:15px;line-height:1.8;">
                    Dear Alumni,
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    We hope you are doing well.
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    It has come to our attention that there may be some inaccuracies in your registered information.
                    As this is an official platform viewed by both seniors and juniors, we kindly request you to review and update your details.
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    Ensuring that your information is accurate and complete will help maintain the quality and professionalism of our alumni network.
                  </p>
                  <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.8;">
                    Please take a moment to verify and correct your profile at your earliest convenience.
                  </p>
                  <div style="margin:14px 0 16px;padding:12px 14px;border:1px solid #fcd34d;border-radius:10px;background:#fffbeb;">
                    <p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;">
                      Admin correction feedback
                    </p>
                    <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.8;">
                      ${escapeHtml(correction)}
                    </p>
                  </div>
                  <a href="${escapeHtml(safeProfileUpdateLink)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 18px;border-radius:10px;">
                    Update Your Profile
                  </a>
                  <p style="margin:16px 0 0;color:#334155;font-size:14px;line-height:1.8;">
                    Thank you for your cooperation.
                  </p>
                  <p style="margin:12px 0 0;color:#334155;font-size:13px;line-height:1.8;">
                    Best regards,<br/>
                    ${escapeHtml(WEBSITE_NAME)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const result = await sendGovernedEmail({
    pool,
    transporter,
    emailType: EMAIL_TYPES.NOTIFICATION,
    recipientEmail: toEmail,
    recipientUserId,
    initiatedBy,
    metaJson: {
      title: subject,
      notification_kind: "profile_correction_feedback",
      audience: "alumni",
    },
    mailOptions: {
      from: getBrandedFromHeader(),
      to: toEmail,
      subject,
      html,
    },
  });
  if (!result.ok) {
    throw new Error(result.reason || "Profile correction feedback email was not sent");
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminApprovalRequestEmail,
  sendAdminRoleGrantedEmail,
  sendAlumniApprovalSuccessEmail,
  sendProfileCorrectionFeedbackEmail,
};

