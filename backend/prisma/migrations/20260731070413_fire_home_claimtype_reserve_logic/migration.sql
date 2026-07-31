-- AlterEnum
ALTER TYPE "ClaimCategory" ADD VALUE 'FIRE_AND_HOME';

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "claimType" TEXT;
