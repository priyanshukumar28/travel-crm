/* eslint-disable no-console */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const {
  COVER_NAMES,
  DOCUMENT_REQUIREMENTS,
  MEDICAL_SUB_COVERS,
  PLAN_SUBLIMITS,
  PLAN_OVERALL_SI,
} = require("../src/data/catalog");

const prisma = new PrismaClient();

async function seedDocumentRequirements() {
  for (const [coverageName, requiredDocuments] of Object.entries(DOCUMENT_REQUIREMENTS)) {
    await prisma.documentRequirement.upsert({
      where: { coverageName },
      update: { requiredDocuments },
      create: { coverageName, requiredDocuments },
    });
  }
  console.log(`Seeded ${Object.keys(DOCUMENT_REQUIREMENTS).length} document requirement rows.`);
}

async function seedPlanTemplates() {
  for (const [planName, sublimits] of Object.entries(PLAN_SUBLIMITS)) {
    const overallSI = PLAN_OVERALL_SI[planName] || 0;

    const existing = await prisma.planTemplate.findUnique({ where: { name: planName } });
    if (existing) continue; // don't clobber admin edits on re-seed

    const medicalCoverages = MEDICAL_SUB_COVERS.map((subCoverName, i) => ({
      category: "MEDICAL",
      coverageName: "Medical Expenses",
      subCoverName,
      sumInsured: overallSI,
      subLimitText: sublimits[i] || null,
    }));

    // A representative slice of non-medical / travel / PA coverages so every
    // seeded plan has something to select from in every category, not just
    // medical (the spreadsheet only detailed medical sub-limits).
    const otherCoverages = [
      { category: "TRAVEL", coverageName: "Trip Cancellation & Interruption", sumInsured: Math.min(2000, overallSI), subLimitText: null },
      { category: "TRAVEL", coverageName: "Trip Delay", sumInsured: Math.min(500, overallSI), subLimitText: null },
      { category: "NON_MEDICAL", coverageName: "Total Loss of Checked in Baggage", sumInsured: Math.min(1000, overallSI), subLimitText: null },
      { category: "PERSONAL_ACCIDENT", coverageName: "Personal Accident", sumInsured: overallSI, subLimitText: null },
    ];

    await prisma.planTemplate.create({
      data: {
        name: planName,
        description: `Seeded from travel_crm_Sub_Limits.xlsx — overall SI USD ${overallSI.toLocaleString()}`,
        coverages: { create: [...medicalCoverages, ...otherCoverages] },
      },
    });
  }
  console.log(`Seeded ${Object.keys(PLAN_SUBLIMITS).length} plan templates.`);
}

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const customer = await prisma.user.upsert({
    where: { email: "customer@acrossassist.demo" },
    update: {},
    create: {
      name: "Rohit Sharma",
      email: "customer@acrossassist.demo",
      passwordHash: password,
      role: "CUSTOMER",
      phone: "+91 9821345621",
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@acrossassist.demo" },
    update: {},
    create: {
      name: "Ananya Verma",
      email: "agent@acrossassist.demo",
      passwordHash: password,
      role: "AGENT",
      phone: "+91 9811122233",
    },
  });

  const insurer = await prisma.user.upsert({
    where: { email: "insurer@acrossassist.demo" },
    update: {},
    create: {
      name: "ITGI Claims Desk",
      email: "insurer@acrossassist.demo",
      passwordHash: password,
      role: "INSURER",
      phone: "+91 9822233344",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@acrossassist.demo" },
    update: {},
    create: {
      name: "Portal Admin",
      email: "admin@acrossassist.demo",
      passwordHash: password,
      role: "SUPER_ADMIN",
    },
  });

  await seedDocumentRequirements();
  await seedPlanTemplates();

  const goldPlan = await prisma.planTemplate.findUnique({ where: { name: "Gold 500" } });

  const existingPolicy = await prisma.policy.findUnique({
    where: { policyNumber: "POTBHI00100017114" },
    include: { members: true },
  });

  let policy = existingPolicy;
  if (!policy) {
    policy = await prisma.policy.create({
      data: {
        policyNumber: "POTBHI00100017114",
        holderName: customer.name,
        planName: goldPlan?.name || "Gold 500",
        claimCategory: "TRAVEL",
        startDate: new Date("2025-11-05"),
        endDate: new Date("2026-11-04"),
        issuanceDate: new Date("2025-11-01"),
        issuancePlace: "New Delhi",
        geoCoverage: "Worldwide excluding US / Canada",
        issuanceBranch: "Delhi NCR",
        countryVisited: "France, Italy",
        countryOfResidence: "India",
        deductible: "N/A",
        nomineeName: "Meera Sharma",
        ownerId: customer.id,
        planTemplateId: goldPlan?.id,
        coverages: {
          create: [
            { category: "MEDICAL", name: "Medical Expenses", subCoverName: "Hospital Room Rent and Boarding expenses", sumInsured: 500000, subLimitText: "USD 2000 Per Day up to 30 Days" },
            { category: "MEDICAL", name: "Dental Treatment", sumInsured: 300000, deductible: "N/A" },
            { category: "PERSONAL_ACCIDENT", name: "Personal Accident", sumInsured: 250000, deductible: "N/A" },
            { category: "TRAVEL", name: "Trip Cancellation & Interruption", sumInsured: 2000, deductible: "N/A" },
            { category: "TRAVEL", name: "Trip Delay", sumInsured: 500, deductible: "12 HRS" },
            { category: "NON_MEDICAL", name: "Total Loss of Checked in Baggage", sumInsured: 1000, deductible: "N/A" },
            { category: "NON_MEDICAL", name: "Loss of Passport or International Driving Licence Or Any other govt ID", sumInsured: 600, deductible: "25" },
            { category: "NON_MEDICAL", name: "Personal Liability", sumInsured: 610, deductible: "N/A" },
          ],
        },
        members: {
          // Point 12 — multiple real insured members on one policy.
          create: [
            { name: "Rohit Sharma", relationship: "Self", passportNumber: "P9834521", dob: new Date("1988-04-12") },
            { name: "Meera Sharma", relationship: "Spouse", passportNumber: "P9834522", dob: new Date("1990-07-03") },
            { name: "Aarav Sharma", relationship: "Son", passportNumber: "P9834523", dob: new Date("2016-02-20") },
            { name: "Diya Sharma", relationship: "Daughter", passportNumber: "P9834524", dob: new Date("2019-09-11") },
          ],
        },
      },
      include: { members: true },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log(" Customer:", customer.email);
  console.log(" Agent:   ", agent.email);
  console.log(" Insurer: ", insurer.email);
  console.log(" Policy:  ", policy.policyNumber, "with", policy.members?.length ?? "?", "insured members");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });