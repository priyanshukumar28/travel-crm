-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "deficiencyRaisedAt" TIMESTAMP(3),
ADD COLUMN     "deficiencyReminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReminderAt" TIMESTAMP(3);
