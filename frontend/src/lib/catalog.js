// Mirrors backend/src/data/catalog.js — MEDICAL_SUB_COVERS is static
// reference data (from travel_crm_Sub_Limits.xlsx) with no admin-editing
// UI yet, so it's safe to duplicate here. COVER_NAMES is fetched live from
// GET /api/plans/cover-names (see usages) — the constant below is only a
// fallback if that call hasn't resolved yet.
export const MEDICAL_SUB_COVERS = [
  "Hospital Room Rent and Boarding expenses", "Emergency Room Services", "ICU Charges",
  "Surgical Treatment Expense", "Physician Consultation Charges", "Diagnostic Tests",
  "Ambulance Service (Not applicable for OPD)", "Pharmacy", "Miscellaneous Expenses",
];

export const FALLBACK_COVER_NAMES = {
  MEDICAL: ["Medical Evacuation", "Medical Expenses", "Repatriation of Mortal Remains", "Dental Treatment"],
  NON_MEDICAL: [
    "Trip Cancellation & Interruption", "Trip Delay", "Missed Flight Connection",
    "Total Loss of Checked in Baggage", "Delay of Checked in Baggage Benefit",
    "Loss of Passport or International Driving Licence Or Any other govt ID",
    "Loss of Baggage and Personal Belongings", "Hijack Distress Allowance",
    "Bounced Booking of Airline or Hotel", "Personal Liability", "Financial Assistance",
    "Emergency Hotel Accommodation", "Automatic Trip Extension", "Refund of Visa Fee",
    "Fire Cover for Building", "Fire Cover for Contents", "Burglary Cover for Home Contents",
  ],
  PERSONAL_ACCIDENT: [
    "Personal Accident", "Accidental Death (Common Carrier)", "Compassionate Visit",
    "Return of Minor Child(ren)", "Adventure Sports",
  ],
  TRAVEL: [
    "Trip Cancellation & Interruption", "Trip Delay", "Missed Flight Connection",
    "Total Loss of Checked in Baggage", "Delay of Checked in Baggage Benefit",
  ],
};

export const CLAIM_CATEGORIES = ["MEDICAL", "NON_MEDICAL", "TRAVEL", "PERSONAL_ACCIDENT"];
export const CATEGORY_LABELS = { MEDICAL: "Medical", NON_MEDICAL: "Non-Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };