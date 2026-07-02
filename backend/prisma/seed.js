/* eslint-disable no-console */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COVERAGE_TEMPLATE = [
  { name: "Emergency Medical Expenses (Accident & Illness)", sumInsured: 200000, deductible: "N/A" },
  { name: "Dental Treatment Expenses", sumInsured: 300000, deductible: "N/A" },
  { name: "Personal Accident - Accidental Death", sumInsured: 250000, deductible: "N/A" },
  { name: "Daily Allowance in case of Hospitalization", sumInsured: 350000, deductible: "N/A" },
  { name: "Total Loss of Checked-in Baggage", sumInsured: 400000, deductible: "N/A" },
  { name: "Delay of Checked-in Baggage", sumInsured: 500000, deductible: "12 HRS" },
  { name: "Loss of Passport and Documents", sumInsured: 600000, deductible: "25" },
  { name: "Personal Liability", sumInsured: 610000, deductible: "N/A" },
];

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

  const existingPolicy = await prisma.policy.findUnique({
    where: { policyNumber: "POTBHI00100017114" },
  });

  let policy = existingPolicy;
  if (!policy) {
    policy = await prisma.policy.create({
      data: {
        policyNumber: "POTBHI00100017114",
        holderName: customer.name,
        planName: "Travel Sure - Group (World Explorer Gold)",
        claimType: "TRAVEL",
        startDate: new Date("2025-11-05"),
        endDate: new Date("2026-11-04"),
        issuanceDate: new Date("2025-11-01"),
        geoCoverage: "Worldwide excluding US / Canada",
        issuanceBranch: "Delhi NCR",
        ownerId: customer.id,
        coverages: { create: COVERAGE_TEMPLATE },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log(" Customer:", customer.email);
  console.log(" Agent:   ", agent.email);
  console.log(" Insurer: ", insurer.email);
  console.log(" Policy:  ", policy.policyNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });