const nodemailer = require("nodemailer");
const prisma = require("./prisma");

// ---------- EMAIL (real) ----------
// Uses a standard SMTP transporter — works with Gmail (App Password), Outlook,
// Resend, SendGrid's SMTP relay, Mailtrap, or any other SMTP host. If
// SMTP_HOST isn't set in .env yet, we fall back to console logging so the
// rest of the app keeps working while you're setting credentials up.

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/25 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendEmail(to, subject, message) {
  const t = getTransporter();

  if (!t) {
    console.log(`[email — SMTP not configured, logging only] -> ${to} | ${subject} | ${message}`);
    return true;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: message,
    html: `<p style="font-family:sans-serif;font-size:14px;color:#101828;">${message}</p>
           <p style="font-family:sans-serif;font-size:11px;color:#667085;">— Across Assist Travel Claims</p>`,
  });
  console.log(`[email sent] -> ${to} | ${subject}`);
  return true;
}

// ---------- SMS / WHATSAPP (still stubbed) ----------
// Real delivery needs a paid gateway (Twilio, MSG91, WhatsApp Business API).
// Swap these two bodies the same way sendEmail was swapped above once you
// have an account — everything else (routes, controllers, outbox) is
// already wired and won't need to change.

async function sendSms(to, message) {
  console.log(`[stub sms] -> ${to} | ${message}`);
  return true;
}

async function sendWhatsapp(to, message) {
  console.log(`[stub whatsapp] -> ${to} | ${message}`);
  return true;
}

const SENDERS = {
  EMAIL: (to, subject, message) => sendEmail(to, subject, message),
  SMS: (to, _subject, message) => sendSms(to, message),
  WHATSAPP: (to, _subject, message) => sendWhatsapp(to, message),
};

// Fires all applicable channels for a claim event and logs each attempt to
// the Notification table (QUEUED -> SENT/FAILED) so the Admin outbox always
// reflects what actually happened.
async function notifyClaimEvent(claim, { subject, message, to }) {
  const channels = [
    { channel: "EMAIL", address: to?.email },
    { channel: "SMS", address: to?.phone },
    { channel: "WHATSAPP", address: to?.phone },
  ].filter((c) => c.address);

  for (const c of channels) {
    const record = await prisma.notification.create({
      data: {
        claimId: claim.id,
        channel: c.channel,
        toAddress: c.address,
        subject,
        message,
        status: "QUEUED",
      },
    });
    try {
      await SENDERS[c.channel](c.address, subject, message);
      await prisma.notification.update({ where: { id: record.id }, data: { status: "SENT" } });
    } catch (err) {
      console.error(`Notification failed (${c.channel} -> ${c.address}):`, err.message);
      await prisma.notification.update({ where: { id: record.id }, data: { status: "FAILED" } });
    }
  }
}

module.exports = { notifyClaimEvent };