// Human-readable ID generators used across the claim lifecycle.
// Format loosely mirrors what the wireframes show (e.g. 202602134-TRV-CA).

function pad(num, len) {
  return String(num).padStart(len, "0");
}

function randomDigits(len) {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function generateClaimNumber(claimCategory) {
  const year = new Date().getFullYear();
  const seq = randomDigits(6);
  const TAGS = { MEDICAL: "MED", NON_MEDICAL: "NMD", TRAVEL: "TRV", PERSONAL_ACCIDENT: "PA" };
  const typeTag = TAGS[claimCategory] || "TRV";
  return `CLM-${year}-${seq}-${typeTag}`;
}

function generateParentClaimNumber() {
  const year = new Date().getFullYear();
  return `PCLM-${year}-${randomDigits(6)}`;
}

function generateInsurerNumber(prefix) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomDigits(6)}`;
}

module.exports = {
  generateClaimNumber,
  generateParentClaimNumber,
  generateInsurerNumber,
};