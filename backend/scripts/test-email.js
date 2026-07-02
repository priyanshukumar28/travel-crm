require("dotenv").config();
const nodemailer = require("nodemailer");

function mask(v) {
  if (!v) return "(missing)";
  if (v.length <= 4) return "*".repeat(v.length);
  return v.slice(0, 2) + "*".repeat(v.length - 4) + v.slice(-2);
}

console.log("---- Loaded SMTP env values ----");
console.log("SMTP_HOST:", JSON.stringify(process.env.SMTP_HOST));
console.log("SMTP_PORT:", JSON.stringify(process.env.SMTP_PORT));
console.log("SMTP_USER:", JSON.stringify(process.env.SMTP_USER));
console.log("SMTP_PASS (masked):", mask(process.env.SMTP_PASS), "| length:", process.env.SMTP_PASS?.length);
console.log("SMTP_FROM:", JSON.stringify(process.env.SMTP_FROM));
console.log("---------------------------------");

if (/["']/.test(process.env.SMTP_USER || "") || /["']/.test(process.env.SMTP_PASS || "")) {
  console.log("⚠️  SMTP_USER or SMTP_PASS still contains a literal quote character.");
  console.log("   Your .env value should NOT have quotes inside it after dotenv parses it.");
}
if (/\s/.test(process.env.SMTP_PASS || "")) {
  console.log("⚠️  SMTP_PASS contains a space. Gmail app passwords must be pasted with NO spaces.");
}
if ((process.env.SMTP_PASS || "").length !== 16 && (process.env.SMTP_HOST || "").includes("gmail")) {
  console.log(`⚠️  Gmail app passwords are exactly 16 characters. Yours is ${process.env.SMTP_PASS?.length ?? 0}.`);
}

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    console.log("Verifying SMTP connection + auth...");
    await transporter.verify();
    console.log("✅ SMTP auth succeeded. Sending a real test email now...");
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "Across Assist — test email",
      text: "If you're reading this, SMTP is correctly configured.",
    });
    console.log("✅ Sent. Message ID:", info.messageId);
  } catch (err) {
    console.log("❌ SMTP failed:", err.message);
    console.log("Full error:", err);
  }
}

main();