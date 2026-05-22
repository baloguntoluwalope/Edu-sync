import { env } from '../../config/env';

// ─── BASE LAYOUT ─────────────────────────────────────────────────────────────
const layout = (content: string, logoUrl?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${env.APP_NAME}</title>
</head>
<body style="margin:0;padding:20px;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a56db 0%,#1e40af 100%);padding:28px 32px;text-align:center;">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="Logo" style="height:56px;margin-bottom:10px;border-radius:6px;display:block;margin:0 auto 10px;"/>`
        : ''
      }
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${env.APP_NAME}</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Nigerian School Management Platform</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f1f5f9;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;font-size:12px;margin:0;line-height:1.6;">
        © ${new Date().getFullYear()} ${env.APP_NAME} · All rights reserved<br/>
        <a href="${env.APP_URL}" style="color:#1a56db;text-decoration:none;">Visit Website</a>
        &nbsp;·&nbsp;
        <a href="mailto:support@edusync.ng" style="color:#1a56db;text-decoration:none;">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const btn = (text: string, url: string, color = '#1a56db') =>
  `<div style="text-align:center;margin:32px 0;">
    <a href="${url}" style="background:${color};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:7px;font-size:15px;font-weight:600;display:inline-block;letter-spacing:0.2px;">
      ${text}
    </a>
  </div>`;

const infoBox = (title: string, content: string, color = '#eff6ff', border = '#1a56db') =>
  `<div style="background:${color};border-left:4px solid ${border};padding:16px 20px;border-radius:0 6px 6px 0;margin:20px 0;">
    <p style="margin:0 0 6px;font-weight:700;color:#1e293b;">${title}</p>
    <div style="color:#334155;line-height:1.8;">${content}</div>
  </div>`;

const p = (text: string) =>
  `<p style="color:#475569;line-height:1.75;margin:0 0 16px;">${text}</p>`;

// ─── SCHOOL WELCOME ───────────────────────────────────────────────────────────
export const schoolWelcomeTemplate = (data: {
  adminName: string;
  schoolName: string;
  branchName: string;
  email: string;
  loginUrl: string;
  trialDays: number;
  logoUrl?: string;
}) => ({
  subject: `Welcome to ${env.APP_NAME} — ${data.schoolName} is Live! 🎉`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;">Hello, ${data.adminName}! 👋</h2>
    ${p(`Your school <strong>${data.schoolName}</strong> has been successfully set up on <strong>${env.APP_NAME}</strong>. Everything is ready to go.`)}

    ${infoBox('🏫 School Details', `
      School: <strong>${data.schoolName}</strong><br/>
      Branch: <strong>${data.branchName}</strong><br/>
      Login Email: <strong>${data.email}</strong>
    `)}

    ${infoBox('⏰ Free Trial', `
      You have <strong>${data.trialDays} days</strong> of free access. No credit card needed.
    `, '#f0fdf4', '#16a34a')}

    <h3 style="color:#1e293b;font-size:16px;margin:24px 0 12px;">🚀 Get started in minutes:</h3>
    <ul style="color:#475569;line-height:2.2;padding-left:20px;margin:0 0 24px;">
      <li>Upload your school logo and principal signature</li>
      <li>Add your teachers — they'll get a welcome email automatically</li>
      <li>Enrol students and link them to parents</li>
      <li>Start taking QR-code attendance</li>
      <li>Create CBT exams and enter termly results</li>
    </ul>

    ${btn('Login to Your Dashboard →', data.loginUrl)}

    ${p('<small style="color:#94a3b8;">If you did not register this account, please contact us at support@edusync.ng</small>')}
  `, data.logoUrl),
});

// ─── BRANCH WELCOME ───────────────────────────────────────────────────────────
export const branchWelcomeTemplate = (data: {
  adminName: string;
  schoolName: string;
  branchName: string;
  branchAddress: string;
  loginUrl: string;
  logoUrl?: string;
}) => ({
  subject: `New Branch Created — ${data.branchName} | ${data.schoolName}`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">New Branch Ready ✅</h2>
    ${p(`Hello <strong>${data.adminName}</strong>, a new branch has been created for <strong>${data.schoolName}</strong>. Classes and subjects have been auto-seeded.`)}

    ${infoBox('🏫 Branch Details', `
      School: <strong>${data.schoolName}</strong><br/>
      Branch Name: <strong>${data.branchName}</strong><br/>
      Address: <strong>${data.branchAddress}</strong>
    `)}

    ${btn('Manage Branches →', data.loginUrl)}
  `, data.logoUrl),
});

// ─── TEACHER WELCOME ──────────────────────────────────────────────────────────
export const teacherWelcomeTemplate = (data: {
  firstName: string;
  schoolName: string;
  branchName: string;
  email: string;
  password: string;
  staffId: string;
  loginUrl: string;
  logoUrl?: string;
}) => ({
  subject: `Welcome to ${data.schoolName} — Your Teacher Account is Ready`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Welcome, ${data.firstName}! 👋</h2>
    ${p(`Your teacher account has been created on <strong>${env.APP_NAME}</strong> for <strong>${data.schoolName}</strong> — <strong>${data.branchName}</strong>.`)}

    ${infoBox('🪪 Your Login Credentials', `
      Staff ID: <strong>${data.staffId}</strong><br/>
      Email: <strong>${data.email}</strong><br/>
      Temporary Password: <strong style="letter-spacing:2px;font-size:16px;">${data.password}</strong>
    `)}

    ${infoBox('⚠️ Important', 'Please change your password immediately after your first login.', '#fff7ed', '#ea580c')}

    <h3 style="color:#1e293b;font-size:16px;margin:24px 0 12px;">What you can do:</h3>
    <ul style="color:#475569;line-height:2.2;padding-left:20px;margin:0 0 24px;">
      <li>Mark student attendance (QR code or manual)</li>
      <li>Upload class resources and assignments</li>
      <li>Create and manage CBT exams</li>
      <li>Enter and manage termly student results</li>
      <li>Post announcements on the community board</li>
    </ul>

    ${btn('Login to Your Account →', data.loginUrl)}
  `, data.logoUrl),
});

// ─── ATTENDANCE ALERT ─────────────────────────────────────────────────────────
export const attendanceAlertTemplate = (data: {
  parentName: string;
  studentName: string;
  studentClass: string;
  status: 'absent' | 'late';
  date: string;
  schoolName: string;
  branchName: string;
  logoUrl?: string;
}) => {
  const isAbsent = data.status === 'absent';
  return {
    subject: `Attendance Alert — ${data.studentName} was marked ${data.status} today`,
    html: layout(`
      <h2 style="color:#1e293b;margin:0 0 16px;">Attendance Alert 📋</h2>
      ${p(`Dear <strong>${data.parentName}</strong>, here is an attendance update for your ward.`)}

      ${infoBox(
        isAbsent ? '❌ Absent Today' : '⚠️ Late Today',
        `Student: <strong>${data.studentName}</strong><br/>
         Class: <strong>${data.studentClass}</strong><br/>
         Date: <strong>${data.date}</strong><br/>
         School: <strong>${data.schoolName} — ${data.branchName}</strong>`,
        isAbsent ? '#fff7ed' : '#fefce8',
        isAbsent ? '#ea580c' : '#ca8a04'
      )}

      ${p('If you believe this is an error, please contact the school or speak with the class teacher directly.')}
    `, data.logoUrl),
  };
};

// ─── RESULT TOKEN ─────────────────────────────────────────────────────────────
export const resultTokenTemplate = (data: {
  recipientName: string;
  studentName: string;
  term: string;
  session: string;
  token: string;
  schoolName: string;
  branchName: string;
  checkResultUrl: string;
  logoUrl?: string;
}) => ({
  subject: `Result Access Token — ${data.studentName} | ${data.term} Term ${data.session}`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Result Access Token 📄</h2>
    ${p(`Dear <strong>${data.recipientName}</strong>, the result for <strong>${data.studentName}</strong> is now available.`)}

    <div style="background:#f0fdf4;border:2px dashed #16a34a;padding:28px;border-radius:8px;text-align:center;margin:24px 0;">
      <p style="color:#15803d;font-size:12px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">Your Access Token</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:#1e293b;margin:0;font-family:monospace;">${data.token}</p>
      <p style="color:#64748b;font-size:12px;margin:10px 0 0;">Keep this token safe — it is required to view the result</p>
    </div>

    ${infoBox('📋 Result Details', `
      Student: <strong>${data.studentName}</strong><br/>
      Term: <strong>${data.term} Term</strong><br/>
      Session: <strong>${data.session}</strong><br/>
      School: <strong>${data.schoolName} — ${data.branchName}</strong>
    `)}

    ${btn('View Result Online →', data.checkResultUrl, '#16a34a')}
  `, data.logoUrl),
});

// ─── SUBSCRIPTION CONFIRMED ───────────────────────────────────────────────────
export const subscriptionTemplate = (data: {
  adminName: string;
  schoolName: string;
  plan: string;
  amountNaira: number;
  expiresAt: string;
  paymentRef: string;
  logoUrl?: string;
}) => ({
  subject: `Payment Confirmed ✅ — ${data.schoolName} | ${data.plan.toUpperCase()} Plan`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Payment Confirmed ✅</h2>
    ${p(`Dear <strong>${data.adminName}</strong>, your subscription payment has been received and your school is now fully active.`)}

    ${infoBox('💳 Payment Receipt', `
      School: <strong>${data.schoolName}</strong><br/>
      Plan: <strong>${data.plan.toUpperCase()}</strong><br/>
      Amount Paid: <strong>₦${data.amountNaira.toLocaleString()}</strong><br/>
      Active Until: <strong>${data.expiresAt}</strong><br/>
      Reference: <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:monospace;">${data.paymentRef}</code>
    `, '#f0fdf4', '#16a34a')}

    ${p(`Your school now has full access to all <strong>${env.APP_NAME}</strong> features until <strong>${data.expiresAt}</strong>. Keep this email as your payment receipt.`)}
  `, data.logoUrl),
});

// ─── TRIAL EXPIRY WARNING ─────────────────────────────────────────────────────
export const trialExpiryTemplate = (data: {
  adminName: string;
  schoolName: string;
  daysLeft: number;
  trialEndsAt: string;
  subscribeUrl: string;
  logoUrl?: string;
}) => ({
  subject: `⚠️ Your Trial Expires in ${data.daysLeft} Day${data.daysLeft === 1 ? '' : 's'} — ${data.schoolName}`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Trial Expiring Soon ⚠️</h2>
    ${p(`Dear <strong>${data.adminName}</strong>, your free trial for <strong>${data.schoolName}</strong> on ${env.APP_NAME} is ending soon.`)}

    ${infoBox('⏰ Trial Status', `
      School: <strong>${data.schoolName}</strong><br/>
      Days Remaining: <strong style="color:#dc2626;">${data.daysLeft} day${data.daysLeft === 1 ? '' : 's'}</strong><br/>
      Trial Ends: <strong>${data.trialEndsAt}</strong>
    `, '#fff7ed', '#ea580c')}

    ${p('Subscribe now to continue enjoying uninterrupted access to attendance, results, CBT exams, and everything else.')}

    ${btn('Subscribe Now →', data.subscribeUrl, '#dc2626')}

    ${p('<small style="color:#94a3b8;">If you have any questions about pricing, reply to this email and we will help you.</small>')}
  `, data.logoUrl),
});

// ─── SUPERADMIN BROADCAST (custom template) ───────────────────────────────────
export const broadcastTemplate = (data: {
  subject: string;
  bodyHtml: string;
  senderName?: string;
}) => ({
  subject: data.subject,
  html: layout(`
    ${data.bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;"/>
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      This message was sent by the ${env.APP_NAME} team${data.senderName ? ` — ${data.senderName}` : ''}.
    </p>
  `),
});

// ─── OTP VERIFICATION ─────────────────────────────────────────────────────────
export const otpVerificationTemplate = (data: {
  firstName: string;
  otp: string;
  expiryMinutes: number;
  logoUrl?: string;
}) => ({
  subject: `${data.otp} — Verify your ${env.APP_NAME} email`,
  html: layout(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Verify Your Email 📧</h2>
    ${p(`Hello <strong>${data.firstName}</strong>, please use the OTP below to verify your email address.`)}

    <div style="background:#eff6ff;border:2px dashed #1a56db;padding:28px;border-radius:8px;text-align:center;margin:24px 0;">
      <p style="color:#1e40af;font-size:12px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">
        Your One-Time Password
      </p>
      <p style="font-size:42px;font-weight:800;letter-spacing:14px;color:#1e293b;margin:0;font-family:monospace;">
        ${data.otp}
      </p>
      <p style="color:#64748b;font-size:13px;margin:10px 0 0;">
        Expires in <strong>${data.expiryMinutes} minutes</strong>
      </p>
    </div>

    ${infoBox('⚠️ Security Notice',
      'Never share this OTP with anyone. EduSync staff will never ask for your OTP.',
      '#fff7ed', '#ea580c'
    )}

    ${p('<small style="color:#94a3b8;">If you did not request this, you can safely ignore this email.</small>')}
  `, data.logoUrl),
});

// ─── EMAIL VERIFIED SUCCESS ────────────────────────────────────────────────────
export const emailVerifiedTemplate = (data: {
  firstName: string;
  loginUrl: string;
  logoUrl?: string;
}) => ({
  subject: `Email Verified ✅ — Welcome to ${env.APP_NAME}`,
  html: layout(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:70px;height:70px;background:#f0fdf4;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:36px;">✅</span>
      </div>
      <h2 style="color:#1e293b;margin:0;">Email Verified!</h2>
    </div>

    ${p(`Congratulations <strong>${data.firstName}</strong>! Your email has been verified and your <strong>${env.APP_NAME}</strong> account is now fully active.`)}

    ${btn('Go to Dashboard →', data.loginUrl, '#16a34a')}
  `, data.logoUrl),
});

// Re-export sendEmail from the centralized mailer so other modules can import
// both templates and the send helper from this file path.
export { sendEmail } from '../../config/mailer';