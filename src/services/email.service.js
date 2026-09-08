// SMTP email. Credentials live only in server-side env (SMTP_*). When SMTP
// isn't configured, send() is a logged no-op so flows that call it don't
// break in local/demo.
const nodemailer = require('nodemailer');
const { SMTP, WEB_URL, PORTAL_URL, ADMIN_URL } = require('../config/production');

let transport = null;
if (SMTP.configured) {
  transport = nodemailer.createTransport({
    host: SMTP.host, port: SMTP.port, secure: SMTP.secure,
    auth: { user: SMTP.user, pass: SMTP.pass },
    pool: true, maxConnections: 3
  });
}

async function send({ to, subject, text, html }) {
  if (!transport) { console.warn('[email] SMTP not configured — skipped:', subject, '->', to); return { skipped: true }; }
  if (!to || !subject) return { skipped: true };
  return transport.sendMail({ from: SMTP.from, to, subject, text, html: html || undefined });
}

const brand = s => `Ceram Dental — ${s}`;

function sendPasswordReset({ to, name, resetUrl }) {
  return send({
    to, subject: brand('password reset'),
    text: `Hi ${name || ''},\n\nReset your password:\n${resetUrl}\n\nThis link expires in 60 minutes. If you didn't request it, ignore this email.`
  });
}
function sendEmailVerification({ to, name, verifyUrl }) {
  return send({
    to, subject: brand('confirm your email'),
    text: `Hi ${name || ''},\n\nConfirm your email address:\n${verifyUrl}\n\nIf this wasn't you, ignore this email.`
  });
}
function sendCaseNotification({ to, title, body, caseRef }) {
  const link = PORTAL_URL || WEB_URL || '';
  return send({
    to, subject: brand(title || 'case update'),
    text: `${body || ''}${caseRef ? `\n\nCase: ${caseRef}` : ''}${link ? `\n\nOpen the portal: ${link}` : ''}`
  });
}
function sendAdminAlert({ to, subject, body }) {
  const link = ADMIN_URL || WEB_URL || '';
  return send({
    to, subject: brand('ALERT — ' + (subject || 'security event')),
    text: `${body || ''}${link ? `\n\nAdmin: ${link}` : ''}`
  });
}

module.exports = {
  configured: SMTP.configured, send,
  sendPasswordReset, sendEmailVerification, sendCaseNotification, sendAdminAlert
};
