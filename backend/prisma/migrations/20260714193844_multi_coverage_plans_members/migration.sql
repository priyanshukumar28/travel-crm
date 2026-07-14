/*
  Warnings:

  - You are about to drop the column `claimType` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `storedName` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `claimType` on the `Policy` table. All the data in the column will be lost.
  - Added the required column `claimCategory` to the `Claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClaimCategory" AS ENUM ('MEDICAL', 'NON_MEDICAL', 'TRAVEL', 'PERSONAL_ACCIDENT');

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "claimType",
ADD COLUMN     "claimCategory" "ClaimCategory" NOT NULL,
ADD COLUMN     "coverageItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "memberIds" TEXT[];

-- AlterTable
ALTER TABLE "Coverage" ADD COLUMN     "category" "ClaimCategory" NOT NULL DEFAULT 'TRAVEL',
ADD COLUMN     "subCoverName" TEXT,
ADD COLUMN     "subLimitText" TEXT;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "storedName",
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Policy" DROP COLUMN "claimType",
ADD COLUMN     "claimCategory" "ClaimCategory" NOT NULL DEFAULT 'TRAVEL',
ADD COLUMN     "countryOfResidence" TEXT,
ADD COLUMN     "countryVisited" TEXT,
ADD COLUMN     "deductible" TEXT,
ADD COLUMN     "issuancePlace" TEXT,
ADD COLUMN     "nomineeName" TEXT,
ADD COLUMN     "planTemplateId" TEXT;

-- DropEnum
DROP TYPE "ClaimType";

-- CreateTable
CREATE TABLE "PlanTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCoverage" (
    "id" TEXT NOT NULL,
    "planTemplateId" TEXT NOT NULL,
    "category" "ClaimCategory" NOT NULL,
    "coverageName" TEXT NOT NULL,
    "subCoverName" TEXT,
    "sumInsured" DOUBLE PRECISION NOT NULL,
    "subLimitText" TEXT,
    "deductible" TEXT,

    CONSTRAINT "PlanCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "coverageName" TEXT NOT NULL,
    "requiredDocuments" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuredMember" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "passportNumber" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuredMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanTemplate_name_key" ON "PlanTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_coverageName_key" ON "DocumentRequirement"("coverageName");

-- AddForeignKey
ALTER TABLE "PlanCoverage" ADD CONSTRAINT "PlanCoverage_planTemplateId_fkey" FOREIGN KEY ("planTemplateId") REFERENCES "PlanTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_planTemplateId_fkey" FOREIGN KEY ("planTemplateId") REFERENCES "PlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuredMember" ADD CONSTRAINT "InsuredMember_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
