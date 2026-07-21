import { REGIONS } from "./catalog";

// Point 6: Details of Loss now comes FIRST — Date of Loss is the very
// first thing the customer sees, front-page, before anything else.
// Point 11: everything AFTER Details of Loss is now source:"agent" instead
// of "customer" — the customer journey ends at Details of Loss; the Agent
// fills in Claimant/Communication/Airline/Investigator/Document Details
// after the claim is intimated. Customers still see these read-only.
export const INTIMATION_SCHEMA = [
  {
    title: "Details of Loss",
    fields: [
      { id: "dateOfLoss", label: "Date of Loss", type: "date", source: "customer", req: "*" },
      { id: "timeOfLoss", label: "Time of Loss", type: "time", source: "customer" },
      { id: "countryOfLoss", label: "Country of Loss", type: "text", source: "customer", req: "*" },
      { id: "cityOfLoss", label: "City", type: "text", source: "customer", req: "*" }, // point 9
      { id: "zipcode", label: "Zipcode", type: "text", source: "customer", req: "*" }, // point 9 (renamed from Pincode)
      { id: "regionOfLoss", label: "Region of Loss", type: "select", source: "customer", req: "*", options: REGIONS }, // point 10
      { id: "descriptionOfLoss", label: "Detailed Description of Claim", type: "textarea", source: "customer", req: "*" }, // point 13
    ],
  },
  {
    title: "Policy Details",
    fields: [
      { id: "policyIssuanceDate", label: "Policy Issuance Date", type: "date", source: "autofill" },
      { id: "inceptionDate", label: "Inception Date", type: "date", source: "autofill" },
      { id: "expiryDate", label: "Expiry Date", type: "date", source: "autofill" },
      { id: "holderName", label: "Holder Name", type: "text", source: "autofill" },
      { id: "claimOfficer", label: "Claim Officer", type: "text", source: "agent" },
      { id: "modeOfInward", label: "Mode of Inward", type: "select", source: "agent", options: ["By Hand", "Email", "FAX", "Telephone", "Post", "Courier"] },
    ],
  },
  {
    title: "Claim Details",
    fields: [
      { id: "reportedDate", label: "Reported Date", type: "date", source: "system" },
      { id: "reportedTime", label: "Reported Time", type: "time", source: "system" },
      { id: "fileBurglary", label: "Do you want to file Burglary Cover?", type: "select", source: "agent", options: ["Yes", "No"] },
    ],
  },
  {
    title: "Claimant Details (Agent-filled after intimation)",
    fields: [
      { id: "isDeathClaim", label: "Is it a death Claim?", type: "select", source: "agent", options: ["Yes", "No"] },
      { id: "claimantName", label: "Claimant Name", type: "text", source: "agent", req: "**" },
      { id: "claimantMobile", label: "Claimant Mobile Number", type: "text", source: "agent", req: "**" },
      { id: "claimantEmail", label: "Claimant Email ID", type: "text", source: "agent", req: "**" },
      { id: "relationship", label: "Relationship with Insured", type: "select", source: "agent", options: ["Self", "Father", "Mother", "Son", "Daughter", "Spouse", "Siblings", "In-Laws", "Others"], reveal: { equals: "Others", field: { id: "relationshipOther", label: "Please specify relationship", type: "text", source: "agent" } } },
    ],
  },
  {
    title: "Communication (Agent-filled after intimation)",
    fields: [
      { id: "commEmail", label: "Comm. Email", type: "text", source: "agent", req: "*" },
      { id: "commContact", label: "Comm. Contact", type: "text", source: "agent", req: "*" },
      { id: "otherCommEmail", label: "Other Comm. Email", type: "text", source: "agent" },
      { id: "otherCommContact", label: "Other Comm. Contact", type: "text", source: "agent" },
    ],
  },
  {
    title: "Airline / Carrier (Agent-filled after intimation)",
    fields: [
      { id: "airlineName", label: "Airline/Carrier Name", type: "text", source: "agent" },
      { id: "flightNumber", label: "Flight/Carrier Number", type: "text", source: "agent" },
    ],
  },
  {
    title: "Investigator (Agent-filled after intimation)",
    fields: [
      { id: "invAppointment", label: "Appointment", type: "select", source: "agent", options: ["Appointment Required", "Appointment not applicable"] },
      { id: "invType", label: "Type", type: "select", source: "agent", options: ["Corporate", "Individual"] },
      { id: "invPartyCode", label: "Appointment Party Code", type: "text", source: "agent" },
      { id: "invName", label: "Investigator Name", type: "text", source: "agent" },
      { id: "invMobile", label: "Investigator Mobile", type: "text", source: "agent" },
      { id: "invEmail", label: "Investigator Email", type: "text", source: "agent" },
      { id: "invApptDate", label: "Appointment Date", type: "date", source: "agent" },
    ],
  },
  {
    title: "Document Details (Agent-filled after intimation)",
    fields: [
      { id: "docReceiveDate", label: "Intimation Doc. Receive Date", type: "date", source: "agent" },
      { id: "courierName", label: "Courier Name", type: "text", source: "agent" },
      { id: "podRef", label: "POD / Reference No.", type: "text", source: "agent" },
      { id: "documentType", label: "Document Type", type: "select", source: "agent", options: ["Fresh Intimation", "Fresh claim documents", "Query reply", "Verification Report", "Others"], reveal: { equals: "Others", field: { id: "documentTypeOther", label: "Please specify document type", type: "text", source: "agent" } } },
      { id: "specialEnclosuresFlag", label: "Special Enclosures Flag", type: "select", source: "agent", options: ["Yes", "No"] },
    ],
  },
];

export const REGISTRATION_SCHEMA = [
  {
    title: "Claim & Claimant (carried from Intimation)",
    fields: [
      { id: "regFileClaim", label: "Do you want to file a claim", type: "text", source: "autofill" },
      { id: "regClaimType", label: "Type of Claim", type: "text", source: "autofill" },
      { id: "regClaimantName", label: "Claimant Name", type: "text", source: "autofill" },
      { id: "regClaimantMobile", label: "Claimant Mobile Number", type: "text", source: "autofill" },
      { id: "regCommEmail", label: "Comm. Email ID", type: "text", source: "autofill" },
      { id: "regCommMobile", label: "Comm. Mobile No.", type: "text", source: "autofill" },
    ],
  },
  {
    title: "Loss Details",
    fields: [
      { id: "regDateOfLoss", label: "Date of Loss", type: "date", source: "autofill" },
      { id: "lossType", label: "Loss Type", type: "select", source: "agent", req: "*", options: ["Baggage Loss", "Medical Emergency", "Trip Cancellation", "Flight Delay", "Personal Accident", "Others"], reveal: { equals: "Others", field: { id: "lossTypeOther", label: "Please specify loss type", type: "text", source: "agent" } } },
      { id: "causeType", label: "Cause Type", type: "text", source: "agent", req: "*" },
      { id: "estimatedLossDetails", label: "Initial Reserve Details", type: "text", source: "agent", req: "*" },
      { id: "majorEventCode", label: "Major Event Code", type: "text", source: "agent" },
    ],
  },
  {
    title: "Loss Financials (claim-level)",
    fields: [
      // Point: per-coverage cover name, sub-cover, currency, reserve,
      // sub-limit, payable, GST, disallowed amounts etc. now all live on
      // the Coverage Items table (one row per coverage, each independently
      // editable — see the Coverage Items tab) instead of duplicated here
      // as single flat fields that only ever reflected the first coverage.
      { id: "remarks", label: "Registration Remarks (claim-level)", type: "textarea", source: "agent" },
    ],
  },
  {
    title: "Surveyor",
    fields: [
      // Point 17 — surveyor contact fields autofill from Investigator details
      // already captured at Intimation, once an appointment is confirmed.
      { id: "surveyorAppointment", label: "Surveyor Appointment", type: "select", source: "agent", options: ["External Surveyor", "Internal Surveyor", "Self Survey"] },
      { id: "surveyorType", label: "Surveyor Type", type: "select", source: "agent", options: ["Corporate", "Individual"] },
      { id: "surveyorPartyCode", label: "Surveyor Party Code", type: "text", source: "agent" },
      { id: "surveyorPartyName", label: "Surveyor Name", type: "text", source: "autofill" },
      { id: "surveyorMobile", label: "Surveyor Mobile", type: "text", source: "autofill" },
      { id: "surveyorEmail", label: "Surveyor Email", type: "text", source: "autofill" },
      { id: "surveyorApptDate", label: "Surveyor Appointment Date", type: "date", source: "autofill" },
    ],
  },
];

export const ASSESSMENT_CORE = [
  {
    title: "Assessment Header",
    fields: [
      { id: "assessmentNumber", label: "Assessment Number", type: "text", source: "system" },
      { id: "assessmentType", label: "Assessment Type", type: "select", source: "insurer", req: "*", options: ["Interim", "Final"] },
      { id: "claimTypeAsReg", label: "Type of Claim as per Registration", type: "text", source: "autofill" },
      { id: "policyInceptionDate", label: "Policy Inception Date", type: "date", source: "autofill" },
      { id: "policyExpiryDate", label: "Policy Expiry Date", type: "date", source: "autofill" },
    ],
  },
  {
    title: "Approval & Payee",
    fields: [
      { id: "pedLifeThreat", label: "Is this a PED and life-threatening Claim?", type: "select", source: "insurer", options: ["Yes", "No"], reveal: { equals: "Yes", field: { id: "pedRemarks", label: "PED / life-threatening — remarks", type: "textarea", source: "insurer" } } },
      { id: "payeeFunction", label: "Payee Function", type: "text", source: "insurer", req: "*" },
      { id: "payeeCode", label: "Payee Code", type: "text", source: "insurer", req: "*" },
      { id: "payeeName", label: "Payee Name", type: "text", source: "insurer", req: "*" },
      { id: "beneficiaryGSTN", label: "Beneficiary GSTN", type: "text", source: "insurer" },
    ],
  },
  {
    title: "Applicability",
    fields: [
      { id: "assessMedical", label: "Assessment required for Medical Covers?", type: "select", source: "insurer", options: ["Yes", "No"] },
      { id: "assessPA", label: "Assessment required for PA Cover?", type: "select", source: "insurer", options: ["Yes", "No"] },
      { id: "assessNonMedical", label: "Assessment required for Travel/Non-Medical Covers?", type: "select", source: "insurer", options: ["Yes", "No"] },
      { id: "gstRequired", label: "Is GST assessment required?", type: "select", source: "insurer", options: ["Yes", "No"] },
    ],
  },
  {
    title: "Provider, Stay & Payment Confirmation",
    fields: [
      { id: "spPartyName", label: "Service Provider Party Name", type: "text", source: "insurer" },
      { id: "spGSTN", label: "Service Provider GSTN", type: "text", source: "insurer" },
      { id: "hospFrom", label: "Hospitalized From", type: "date", source: "insurer" },
      { id: "hospTo", label: "Hospitalized To", type: "date", source: "insurer" },
      { id: "tripFrom", label: "Trip From", type: "date", source: "insurer" },
      { id: "tripTo", label: "Trip To", type: "date", source: "insurer" },
      { id: "invoiceNumberA", label: "Invoice Number", type: "text", source: "insurer", req: "*" },
      { id: "invoiceDateA", label: "Invoice Date", type: "date", source: "insurer", req: "*" },
      { id: "gopIssueDate", label: "GOP Issue Date", type: "date", source: "insurer" },
    ],
  },
];

// ASSESSMENT_MEDICAL / ASSESSMENT_PA / ASSESSMENT_NONMED removed —
// every field in them (Cover Sub Section, GST%, Total Bill Amount,
// Deductible, Disallowed Amount/Remarks, Type of Incident, % Disability,
// Max Allowable SI, Discount) was per-coverage, not claim-level, so it
// only ever reflected ONE coverage even when a claim had two or more.
// That data now lives on each row of the Coverage Items table (see
// components/CoverageItemsEditor.jsx's expandable per-item detail panel),
// which already exists once per coverage on the claim.

export const ASSESSMENT_COMMON = [
  {
    title: "Common — All Claims",
    fields: [
      { id: "lastDocClaimOfficer", label: "Last Document Received Date", type: "date", source: "insurer" },
      { id: "bankRate", label: "Bank Rate", type: "number", source: "insurer" },
      { id: "tpaFee", label: "TPA Fee", type: "number", source: "insurer" },
      { id: "panNumber", label: "PAN Number", type: "text", source: "insurer" },
      { id: "dobCommon", label: "Date of Birth", type: "date", source: "insurer" },
    ],
  },
];