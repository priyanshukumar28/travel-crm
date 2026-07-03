const { Resend } = require("resend");
const prisma = require("./prisma");

// ---------- EMAIL (real, via HTTP API) ----------
// Sends over HTTPS instead of a raw SMTP socket — this matters specifically
// on PaaS hosts (Render, Railway, etc.) which often silently block or
// blackhole outbound SMTP ports (25/465/587), causing sends to hang
// indefinitely rather than fail cleanly. An HTTP API call can't hang like
// that, and gives back a real success/error response immediately.
//
// Sign up free at resend.com, grab an API key, set RESEND_API_KEY in env.
// Without a verified sending domain, Resend's sandbox will only deliver to
// the email address on your own Resend account — verify a domain (Resend →
// Domains) once you're ready to send to arbitrary recipients.

let resendClient = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function sendEmail(to, subject, message) {
  const resend = getResend();

  if (!resend) {
    console.log(`[email — RESEND_API_KEY not configured, logging only] -> ${to} | ${subject} | ${message}`);
    return true;
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Across Assist <onboarding@resend.dev>",
    to,
    subject,
    text: message,
    html: `<p style="font-family:sans-serif;font-size:14px;color:#101828;">${message}</p>
           <p style="font-family:sans-serif;font-size:11px;color:#667085;">— Across Assist Travel Claims</p>`,
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : error.message || "Resend API error");
  }

  console.log(`[email sent] -> ${to} | ${subject} | id: ${data?.id}`);
  return true;
}

// ---------- SMS / WHATSAPP (still stubbed, not invoked) ----------
async function sendSms(to, message) {
  console.log(`[stub sms] -> ${to} | ${message}`);
  return true;
}

async function sendWhatsapp(to, message) {
  console.log(`[stub whatsapp] -> ${to} | ${message}`);
  return true;
}

// Fires email only (SMS/WhatsApp channels are wired above but intentionally
// not invoked — flip them back on later by adding entries below).
// `to.emails` is an array so both the customer and the handling agent can be
// notified from a single call.
async function notifyClaimEvent(claim, { subject, message, to }) {
  const emails = (to?.emails || []).filter(Boolean);
  const uniqueEmails = [...new Set(emails)];

  for (const address of uniqueEmails) {
    const record = await prisma.notification.create({
      data: {
        claimId: claim.id,
        channel: "EMAIL",
        toAddress: address,
        subject,
        message,
        status: "QUEUED",
      },
    });
    try {
      await sendEmail(address, subject, message);
      await prisma.notification.update({ where: { id: record.id }, data: { status: "SENT" } });
    } catch (err) {
      console.error(`Notification failed (EMAIL -> ${address}):`, err.message);
      await prisma.notification.update({ where: { id: record.id }, data: { status: "FAILED" } });
    }
  }
}

module.exports = { notifyClaimEvent };