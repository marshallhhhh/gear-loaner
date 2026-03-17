import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    logger.info({ to, subject }, 'Email (dev mode)');
    logger.debug({ html }, 'Email body');
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || 'noreply@tasuniclimbing.club',
    to,
    subject,
    html,
  });
}

export async function sendCheckoutConfirmation({ email, gearName, dueDate }) {
  await sendMail({
    to: email,
    subject: `Gear Checked Out: ${gearName}`,
    html: `
      <h2>Checkout Confirmation</h2>
      <p>You have checked out <strong>${escapeHtml(gearName)}</strong>.</p>
      <p>Due date: <strong>${new Date(dueDate).toLocaleDateString()}</strong></p>
      <p>Please return the gear on or before the due date.</p>
      <p>— TAS Uni Climbing Club</p>
    `,
  });
}

export async function sendReturnConfirmation({ email, gearName }) {
  await sendMail({
    to: email,
    subject: `Gear Returned: ${gearName}`,
    html: `
      <h2>Return Confirmation</h2>
      <p>You have returned <strong>${escapeHtml(gearName)}</strong>.</p>
      <p>Thank you!</p>
      <p>— TAS Uni Climbing Club</p>
    `,
  });
}

export async function sendOverdueNotification({ email, gearName, dueDate }) {
  await sendMail({
    to: email,
    subject: `Overdue Gear: ${gearName}`,
    html: `
      <h2>Overdue Notice</h2>
      <p>Your loan of <strong>${escapeHtml(gearName)}</strong> was due on
        <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
      <p>Please return the gear as soon as possible.</p>
      <p>— TAS Uni Climbing Club</p>
    `,
  });
}
