const prisma = require("../utils/prisma");
const { asyncHandler } = require("../middleware/errorHandler");

function toCsv(rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(c.value(row))).join(","));
  return [header, ...lines].join("\n");
}

// GET /api/admin/reports/reserve-analysis.csv
// Point 20: every reserve/payable change ever made on any claim, who made
// it and when — pulled straight from the ActivityLog audit trail (point 14)
// rather than a separate ledger, so it can never drift out of sync with
// what actually happened on the claim.
const reserveAnalysisExport = asyncHandler(async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    where: { meta: { path: ["type"], equals: "reserve_change" } },
    include: { claim: { select: { claimNumber: true, claimCategory: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = [];
  for (const log of logs) {
    for (const change of log.meta?.changes || []) {
      rows.push({
        claimNumber: log.claim.claimNumber,
        claimCategory: log.claim.claimCategory,
        coverageName: change.coverageName,
        oldReserve: change.oldReserve,
        newReserve: change.newReserve,
        oldPayable: change.oldPayable,
        newPayable: change.newPayable,
        updatedBy: log.user.name,
        role: log.role,
        updatedAt: log.createdAt.toISOString(),
      });
    }
  }

  const csv = toCsv(rows, [
    { label: "Claim Number", value: (r) => r.claimNumber },
    { label: "Category", value: (r) => r.claimCategory },
    { label: "Coverage", value: (r) => r.coverageName },
    { label: "Old Reserve", value: (r) => r.oldReserve },
    { label: "New Reserve", value: (r) => r.newReserve },
    { label: "Old Payable", value: (r) => r.oldPayable },
    { label: "New Payable", value: (r) => r.newPayable },
    { label: "Updated By", value: (r) => r.updatedBy },
    { label: "Role", value: (r) => r.role },
    { label: "Updated At", value: (r) => r.updatedAt },
  ]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reserve-analysis.csv");
  res.send(csv);
});

function ageInDays(from, to) {
  if (!from) return "";
  const ms = (to || new Date()) - new Date(from);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
function ageFromDob(dob) {
  if (!dob) return "";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
function ageGroup(age) {
  if (age === "" || age === null || age === undefined) return "";
  if (age < 18) return "0-17";
  if (age < 35) return "18-34";
  if (age < 50) return "35-49";
  if (age < 65) return "50-64";
  return "65+";
}
function pendingWith(claim) {
  if (claim.stage === "CLOSED") return "Closed";
  if (claim.stage === "ASSESSMENT") return "Insurer";
  if (claim.stage === "PAYMENT") return "Agent — Payment";
  return "Agent (Across Assist)";
}
function sumItems(items, key) {
  return (items || []).reduce((s, i) => s + (Number(i[key]) || 0), 0);
}

// GET /api/reports/mis.csv
// Point 21: the client's exact 56-column MIS layout (from MIS_FORMAT.xlsx),
// column order and header text preserved verbatim. A few columns don't have
// a direct backing field yet in this system (Reopen Date, Alarm Center,
// fund-receipt/provider-payment leg dates) — those are left blank rather
// than guessed, and are called out below so it's obvious what's genuinely
// not tracked yet vs. mapped from real data.
const misExport = asyncHandler(async (req, res) => {
  const claims = await prisma.claim.findMany({
    include: {
      policy: { include: { owner: true, coverages: true } },
      activityLogs: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Members are looked up in bulk since Claim only stores memberIds[].
  const allMemberIds = [...new Set(claims.flatMap((c) => c.memberIds || []))];
  const members = allMemberIds.length
    ? await prisma.insuredMember.findMany({ where: { id: { in: allMemberIds } } })
    : [];
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const rows = claims.map((c, index) => {
    const registrationLog = c.activityLogs.find((l) => l.action.includes("First-level validation passed"));
    const registrationDate = registrationLog?.createdAt || c.createdAt;
    const firstMember = memberById[c.memberIds?.[0]];
    const age = ageFromDob(firstMember?.dob);
    const matchingCoverage = c.policy.coverages.find((cov) => c.coverages.includes(cov.name));
    const firstItem = (c.coverageItems || [])[0] || {};

    return {
      srNo: index + 1,
      dateOfRegistration: registrationDate,
      reopenDate: "", // not tracked — no "reopen" concept in this system yet
      year: new Date(registrationDate).getFullYear(),
      registrationMonth: new Date(registrationDate).toLocaleString("en-US", { month: "long" }),
      ageing: ageInDays(registrationDate, c.stage === "CLOSED" ? c.updatedAt : new Date()),
      claimNo: c.claimNumber,
      certificateNumber: c.policy.policyNumber,
      insurerClaimRefNo: c.insurerClaimIntimationNo || "",
      insuredName: c.policy.holderName,
      corporateName: "", // not tracked
      sumInsured: matchingCoverage?.sumInsured ?? "",
      dateOfIssuance: c.policy.issuanceDate,
      dateOfInception: c.policy.startDate,
      dateOfExpiry: c.policy.endDate,
      geoPlan: c.policy.geoCoverage,
      passportNo: firstMember?.passportNumber || "",
      gender: "", // not captured on InsuredMember yet
      dob: firstMember?.dob || "",
      age,
      ageGroup: ageGroup(age),
      typeOfLoss: c.claimCategory,
      diagnosis: c.intimationData?.descriptionOfLoss || "",
      insuredLocationIndia: c.policy.countryOfResidence || "",
      insuredContactNumber: c.intimationData?.commContact || c.policy.owner?.phone || "",
      placeOfLoss: c.intimationData?.cityOfLoss || "",
      countryOfLoss: c.intimationData?.countryOfLoss || "",
      regionOfLoss: c.intimationData?.regionOfLoss || "",
      alarmCenter: "", // not tracked
      alarmCenterRefNo: "", // not tracked
      dateOfLoss: c.intimationData?.dateOfLoss || "",
      initialReserveUSD: sumItems(c.coverageItems, "amountUSD"),
      initialReserveINR: sumItems(c.coverageItems, "amountINR"),
      admissionDate: c.assessmentData?.hospFrom || "",
      dischargeDate: c.assessmentData?.hospTo || "",
      claimType: c.claimCategory,
      status: c.status,
      pendingWith: pendingWith(c),
      deficientStatus: c.status === "DEFICIENT" ? "Yes" : "No",
      deficientStatusReason: c.deficiencyReason || "",
      lastFollowUpDate: c.lastReminderAt || "",
      approvedUnder: c.assessmentData?.approvalStatus || "",
      gopCurrency: firstItem.currency || "",
      gopPlacedAmount: sumItems(c.coverageItems, "payableAmount"),
      gopPlacedDate: firstItem.gopIssueDate || "",
      finalReserveINR: sumItems(c.coverageItems, "amountINR"),
      billToInsurer: c.paymentData?.finalPayableAmount || "",
      fundsReceivedDate: "", // not tracked — single UTR field only, no separate receipt-from-insurer date yet
      utr1: c.paymentData?.utrNumber || "",
      amount1: c.paymentData?.finalPayableAmount || "",
      paidToProviderDate: "", // not tracked — see note above
      utr2: c.paymentData?.utrNumber || "",
      amount2: c.paymentData?.finalPayableAmount || "",
      providerPaidToHospitalDate: "", // not tracked
      utr3: c.paymentData?.utrNumber || "",
      paymentConfirmedFromHospital: c.status === "PAYMENT_PROCESSED" ? "Yes" : "No",
    };
  });

  const csv = toCsv(rows, [
    { label: "Sr. No.", value: (r) => r.srNo },
    { label: "Date Of Registration", value: (r) => r.dateOfRegistration },
    { label: "Reopen Date", value: (r) => r.reopenDate },
    { label: "Year", value: (r) => r.year },
    { label: "Registration Month", value: (r) => r.registrationMonth },
    { label: "Ageing", value: (r) => r.ageing },
    { label: "Across Assist Claim No", value: (r) => r.claimNo },
    { label: "Certificate Number", value: (r) => r.certificateNumber },
    { label: "Insurer CLAIM REF NO", value: (r) => r.insurerClaimRefNo },
    { label: "INSURED'S NAME", value: (r) => r.insuredName },
    { label: "Name of the Corporate", value: (r) => r.corporateName },
    { label: "Sum Insured", value: (r) => r.sumInsured },
    { label: "Date of  Issuance", value: (r) => r.dateOfIssuance },
    { label: "Date of  Inception", value: (r) => r.dateOfInception },
    { label: "Date of  Expiry", value: (r) => r.dateOfExpiry },
    { label: "GEOGRAPHICAL PLAN", value: (r) => r.geoPlan },
    { label: "Passport No", value: (r) => r.passportNo },
    { label: "Claimant - Gender", value: (r) => r.gender },
    { label: "Claimant - DOB", value: (r) => r.dob },
    { label: "AGE", value: (r) => r.age },
    { label: "Age Group", value: (r) => r.ageGroup },
    { label: "Type of loss", value: (r) => r.typeOfLoss },
    { label: "Diagnosis (Description)", value: (r) => r.diagnosis },
    { label: "Insured Location  - (India)", value: (r) => r.insuredLocationIndia },
    { label: "Insured Contact Number", value: (r) => r.insuredContactNumber },
    { label: "Place of Loss", value: (r) => r.placeOfLoss },
    { label: "Country of Loss", value: (r) => r.countryOfLoss },
    { label: "Region of Loss", value: (r) => r.regionOfLoss },
    { label: "Alarm Center", value: (r) => r.alarmCenter },
    { label: "Alarm Center ref no.", value: (r) => r.alarmCenterRefNo },
    { label: "Date of Loss", value: (r) => r.dateOfLoss },
    { label: "Initial Reserve (USD)", value: (r) => r.initialReserveUSD },
    { label: "Initial Reserve (INR)", value: (r) => r.initialReserveINR },
    { label: "Admission Date", value: (r) => r.admissionDate },
    { label: "Discharge Date", value: (r) => r.dischargeDate },
    { label: "Claim Type", value: (r) => r.claimType },
    { label: "Status", value: (r) => r.status },
    { label: "Pending With", value: (r) => r.pendingWith },
    { label: "Deficient status", value: (r) => r.deficientStatus },
    { label: "Deficient status", value: (r) => r.deficientStatusReason },
    { label: "Last Follow Up Date", value: (r) => r.lastFollowUpDate },
    { label: "Approved Under ", value: (r) => r.approvedUnder },
    { label: "GOP Currency", value: (r) => r.gopCurrency },
    { label: "GOP Placed Amount", value: (r) => r.gopPlacedAmount },
    { label: "GOP Placed Date", value: (r) => r.gopPlacedDate },
    { label: "Final Reserve in INR (GOP)", value: (r) => r.finalReserveINR },
    { label: "Bill to Insurer", value: (r) => r.billToInsurer },
    { label: "Funds receive from insurer (Date)", value: (r) => r.fundsReceivedDate },
    { label: "UTR Details", value: (r) => r.utr1 },
    { label: "Amount", value: (r) => r.amount1 },
    { label: "Across Assist Paid to Provider (Date)", value: (r) => r.paidToProviderDate },
    { label: "UTR Details", value: (r) => r.utr2 },
    { label: "Amount", value: (r) => r.amount2 },
    { label: "Provider Paid to hospital ( Date)", value: (r) => r.providerPaidToHospitalDate },
    { label: "UTR Details ", value: (r) => r.utr3 },
    { label: "Payment confirmation done from Hospital", value: (r) => r.paymentConfirmedFromHospital },
  ]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=mis-export.csv");
  res.send(csv);
});

module.exports = { reserveAnalysisExport, misExport };