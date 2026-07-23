// Static reference data. Points 3/9/10/13/23.

// Point 3: Non-Medical is retired as a selectable category — its cover
// names move under Travel, plus a new "Assistance" cover.
const COVER_NAMES = {
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

// Point 18 — these three medical covers get hard sub-limit/payable validation.
const HARD_LIMIT_COVERAGES = ["Medical Expenses", "Medical Evacuation", "Repatriation of Mortal Remains"];

const DOCUMENT_REQUIREMENTS = {
  "Medical Evacuation": ["Medical reports", "Documentary proof of evacuation expenses", "Claim Form", "Copy of Policy Certificate", "Air Ticket / Boarding Passes", "Covering letter", "Cancelled cheque"],
  "Medical Expenses": ["Claim form (signed)", "Discharge summary", "Hospital final bill", "Doctor's prescription advising hospitalization", "Consultation bills/receipts", "OT charges", "Medicine bills with prescriptions", "Passport/visa copy with entry-exit stamp"],
  "Repatriation of Mortal Remains": ["Death certificate", "Clearance from Indian Consulate", "Postmortem certificate", "Documentary proof of repatriation expenses", "Claim Form", "Copy of Policy Certificate", "Air Ticket/Boarding Pass", "Invoices (itemized)", "Cancelled cheque"],
  "Dental Treatment": ["Claim form (signed)", "Dental records", "Test/X-ray reports", "Doctor's prescription", "Copy of Policy Certificate", "LMO/Dentist details", "Original invoices/money receipts", "Air ticket/boarding pass/passport", "Covering letter", "Cancelled cheque"],
  "Assistance": ["Claim form", "Policy Copy", "Description of assistance provided", "Receipts for any incurred cost", "Cancelled cheque"],
  "Trip Cancellation & Interruption": ["Claim form", "Proof of death/hospitalization", "Medical reports", "Termination letter (if applicable)", "Airline letter on cancellation", "Proof of material loss", "Complete itinerary copies", "Passport/visa copy", "Reimbursement statements", "Original bills/receipts", "Cancelled cheque"],
  "Trip Delay": ["Policy Copy", "Original bills for delay expenses", "Passport/visa copy", "Airline letter confirming delay", "Boarding passes", "Claim form", "Covering letter", "Cancelled cheque"],
  "Missed Flight Connection": ["Claim form", "Copy of Policy Certificate", "Complete itinerary copies", "New itinerary + boarding pass", "Passport/visa copy", "Reimbursement statements", "Original bills/receipts"],
  "Total Loss of Checked in Baggage": ["Claim form", "Complaint filed with airline authorities", "Property Irregularity Report", "Passport/visa copy"],
  "Delay of Checked in Baggage Benefit": ["Claim form", "Airline complaint copy", "PIR/delay certificate", "Vouchers/bills for essentials", "Passport/visa copy"],
  "Loss of Passport or International Driving Licence Or Any other govt ID": ["Claim form", "Policy Copy", "FIR/police report", "Bills for fresh document", "New + previous document copies", "Air ticket/boarding pass/passport", "Covering letter", "Cancelled cheque"],
  "Loss of Baggage and Personal Belongings": ["Claim form", "FIR/police report", "Proof of ownership", "Bills/receipts", "Passport/visa copy", "Cancelled cheque"],
  "Hijack Distress Allowance": ["Policy Copy", "Claim form + police report", "Airline letter on hijack period", "Media coverage", "Passport/visa copy", "Air ticket/boarding pass", "Cancelled cheque"],
  "Bounced Booking of Airline or Hotel": ["Claim form", "Policy Copy", "Passport/visa copy", "Airline/hotel confirmation letter", "Money receipt", "Cancelled cheque"],
  "Personal Liability": ["Claim form", "Policy Copy", "Air ticket/passport/visa", "FIR/police report", "Sequence of events", "Witness statement", "Court award copy (if applicable)", "Cancelled cheque"],
  "Financial Assistance": ["Claim form", "Policy Copy", "Travel details", "FIR/police report within 24hrs", "Details of items/funds lost", "Forex exchange slip", "Travel history (past 5 years)", "Cancelled cheque"],
  "Emergency Hotel Accommodation": ["Claim form", "Policy Copy", "Travel details", "Letter from hotel on cause + refund", "Booking confirmation", "Money receipt", "Cancelled cheque"],
  "Automatic Trip Extension": ["Claim form", "Policy Copy", "Medical reports (if applicable)", "Original air ticket", "Boarding pass", "Cancelled cheque"],
  "Refund of Visa Fee": ["Claim form", "Policy Copy", "Passport/visa copy", "Embassy letter on visa rejection", "Cancelled cheque"],
  "Fire Cover for Building": ["Claim form", "Policy Copy", "Fire department/police report", "Original receipts", "Panchnama", "Media report (if any)"],
  "Fire Cover for Contents": ["Claim form", "Policy Copy", "Fire department/police report", "Original receipts for items claimed", "Panchnama"],
  "Burglary Cover for Home Contents": ["Claim form", "FIR/police report", "Final investigation report / non-detectable certificate", "Undertaking/subrogation form"],
  "Personal Accident": ["Claim form", "Policy Copy", "Discharge summary", "Death certificate (if death)", "Doctor's certificate on disablement", "Disability certificate from civil surgeon", "Photograph of injury", "Leave certificate from employer", "Air ticket/boarding pass", "Cancelled cheque"],
  "Accidental Death (Common Carrier)": ["Claim form", "Policy Copy", "Death certificate", "Postmortem report", "Valid ticket/certificate from common carrier", "Cancelled cheque"],
  "Compassionate Visit": ["Claim form", "Policy Copy", "Travel details", "Medical record of patient", "Treating doctor's certificate on need for companion", "Money receipts for air ticket/stay", "Cancelled cheque"],
  "Return of Minor Child(ren)": ["Claim form", "Policy Copy", "Discharge summary", "Death certificate (if applicable)", "Travel details", "New itinerary + bills", "Cancelled cheque"],
  "Adventure Sports": ["Claim form", "Policy Copy", "Medical reports", "Activity provider's incident report", "Passport/visa copy", "Cancelled cheque"],
};

const MEDICAL_SUB_COVERS = [
  "Hospital Room Rent and Boarding expenses", "Emergency Room Services", "ICU Charges",
  "Surgical Treatment Expense", "Physician Consultation Charges", "Diagnostic Tests",
  "Ambulance Service (Not applicable for OPD)", "Pharmacy", "Miscellaneous Expenses",
];

// Point 5 — dynamic sub-cover: ONLY coverage names listed here get a
// sub-cover dropdown at all. "Medical Expenses" is the only coverage with
// real sub-covers per the client's sub-limit sheet; Medical Evacuation,
// Repatriation of Mortal Remains, Dental Treatment and every Travel/PA
// coverage have none, so no sub-cover field is shown for them anywhere in
// the app (Coverage Items editor checks this map, not just category).
const SUBCOVERS_BY_COVERAGE = {
  "Medical Expenses": MEDICAL_SUB_COVERS,
};

const PLAN_SUBLIMITS = {
  "Bronze 25": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Bronze 50": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Silver 50": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Silver 100": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Senior 50": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Senior 100": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Super Senior 50": ["USD 1500 Per Day up to 30 Days", "USD 1500", "USD 3000 Per Day up to 7 Days", "USD 12500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 125 Per Day up to 10 visits", "Up to USD 750", "Up to USD 500", "Up to USD 2000", "Up to USD 500"],
  "Gold 250": ["USD 1750 Per Day up to 30 Days", "USD 1750", "USD 3250 Per Day up to 7 Days", "USD 13000 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 175 Per Day up to 10 visits", "Up to USD 1000", "Up to USD 600", "Up to USD 2000", "Up to USD 500"],
  "Gold 500": ["USD 2000 Per Day up to 30 Days", "USD 2000", "USD 3750 Per Day up to 10 Days", "USD 15000 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 250 Per Day up to 10 visits", "Up to USD 1500", "Up to USD 750", "Up to USD 2000", "Up to USD 500"],
  "Platinum 500": ["USD 2000 Per Day up to 30 Days", "USD 2000", "USD 3750 Per Day up to 10 Days", "USD 15000 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 250 Per Day up to 10 visits", "Up to USD 1500", "Up to USD 750", "Up to USD 2000", "Up to USD 500"],
  "Platinum 750": ["USD 2000 Per Day up to 30 Days", "USD 2000", "USD 3750 Per Day up to 10 Days", "USD 15000 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 250 Per Day up to 10 visits", "Up to USD 1500", "Up to USD 750", "Up to USD 2000", "Up to USD 500"],
  "Platinum 1000": ["USD 2500 Per Day up to 30 Days", "USD 2500", "USD 4000 Per Day up to 10 Days", "USD 22500 for surgical treatment expense, +25% sublimit for Anesthetist services", "USD 350 Per Day up to 10 visits", "Up to USD 2500", "Up to USD 1000", "Up to USD 2000", "Up to USD 500"],
};

const PLAN_OVERALL_SI = {
  "Bronze 25": 25000, "Bronze 50": 50000, "Silver 50": 50000, "Silver 100": 100000,
  "Senior 50": 50000, "Senior 100": 100000, "Super Senior 50": 50000,
  "Gold 250": 250000, "Gold 500": 500000,
  "Platinum 500": 500000, "Platinum 750": 750000, "Platinum 1000": 1000000,
};

const SALES_DATA_FIELDS = [
  "Policy Number", "Policy Issue Date", "Place of Issue", "Policy Start Date", "Policy End Date",
  "Name of Insured", "Plan name", "Passport Number", "Geographical Coverage", "Type of Plan",
  "Country to be Visited", "Country of Residence", "Sum Insured", "Deductible",
  "Email id", "Contact Number", "Nominee Name",
];

// Point 23 — region list exactly as given.
const REGIONS = ["Asia", "Middle East", "Africa", "USA and Canada", "Australia and New Zealand", "Europe", "United Kingdom", "Southeast Asia"];

const { COUNTRIES, CURRENCY_BY_COUNTRY, CURRENCIES } = require("./countryCurrency");

module.exports = {
  COVER_NAMES, HARD_LIMIT_COVERAGES, DOCUMENT_REQUIREMENTS, MEDICAL_SUB_COVERS, SUBCOVERS_BY_COVERAGE,
  PLAN_SUBLIMITS, PLAN_OVERALL_SI, SALES_DATA_FIELDS, REGIONS,
  COUNTRIES, CURRENCIES, CURRENCY_BY_COUNTRY,
};