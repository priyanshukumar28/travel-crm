export { COUNTRIES, CURRENCIES, CURRENCY_BY_COUNTRY } from "./countryCurrency";

export const MEDICAL_SUB_COVERS = [
  "Hospital Room Rent and Boarding expenses", "Emergency Room Services", "ICU Charges",
  "Surgical Treatment Expense", "Physician Consultation Charges", "Diagnostic Tests",
  "Ambulance Service (Not applicable for OPD)", "Pharmacy", "Miscellaneous Expenses",
];

// Point 5 — only coverage names listed here get a sub-cover dropdown at all.
export const SUBCOVERS_BY_COVERAGE = {
  "Medical Expenses": MEDICAL_SUB_COVERS,
};

// Point 3: Non-Medical retired — Travel absorbs its covers + "Assistance".
export const FALLBACK_COVER_NAMES = {
  MEDICAL: ["Medical Evacuation", "Medical Expenses", "Repatriation of Mortal Remains", "Dental Treatment"],
  TRAVEL: [
    "Trip Cancellation & Interruption", "Trip Delay", "Missed Flight Connection",
    "Total Loss of Checked in Baggage", "Delay of Checked in Baggage Benefit",
    "Loss of Passport or International Driving Licence Or Any other govt ID",
    "Loss of Baggage and Personal Belongings", "Hijack Distress Allowance",
    "Bounced Booking of Airline or Hotel", "Personal Liability", "Financial Assistance",
    "Emergency Hotel Accommodation", "Automatic Trip Extension", "Refund of Visa Fee",
    "Fire Cover for Building", "Fire Cover for Contents", "Burglary Cover for Home Contents",
    "Assistance",
  ],
  PERSONAL_ACCIDENT: [
    "Personal Accident", "Accidental Death (Common Carrier)", "Compassionate Visit",
    "Return of Minor Child(ren)", "Adventure Sports",
  ],
};

export const CLAIM_CATEGORIES = ["MEDICAL", "TRAVEL", "PERSONAL_ACCIDENT"];
export const CATEGORY_LABELS = { MEDICAL: "Medical", NON_MEDICAL: "Non-Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };

// Point 23 — region list exactly as given.
export const REGIONS = ["Asia", "Middle East", "Africa", "USA and Canada", "Australia and New Zealand", "Europe", "United Kingdom", "Southeast Asia"];

export const SECONDARY_STATUS_OPTIONS = {
  Cashless: [
    "Case Registered", "Awaiting ROI", "NOC Reminder", "NOC Final Reminder", "Closed - Under NOC",
    "Initial Deficiency Letter", "First Deficiency Letter", "Second Deficiency Letter",
    "Awaiting Medical Record", "Awaiting Past Medical History", "Awaiting Additional Medical Records",
    "Awaiting Final Invoice", "Awaiting Approval from Insurer", "Under Investigation",
    "Awaiting Proposal Form", "GOP Placed", "Awaiting Debit Note from Local Partner",
    "Awaiting Funds from Insurer", "Awaiting Payment to Local Partner",
    "Awaiting Proof of Payment from Local Partner", "Paid and Closed", "Repudiated", "Closed - Under Deficiency",
  ],
  Reimbursement: [
    "Case Registered", "NOC Reminder", "NOC Final Reminder", "Closed - Under NOC",
    "Initial Deficiency Letter", "First Deficiency Letter", "Second Deficiency Letter", "Closed - Under Deficiency",
    "Awaiting Passport Copy", "Awaiting Cancelled Cheque", "Awaiting Approval from SBI",
    "Awaiting Proposal Form", "Awaiting CKYC Form", "Awaiting Funds from SBI",
    "Paid and Closed", "Repudiated", "Claim Withdrawn",
  ],
};