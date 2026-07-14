-- CreateEnum
CREATE TYPE "PolicyCompletionStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateEnum
CREATE TYPE "FeedEventStatus" AS ENUM ('APPLIED', 'VALIDATION_ERROR');

-- DropForeignKey
ALTER TABLE "Policy" DROP CONSTRAINT "Policy_ownerId_fkey";

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "completionStatus" "PolicyCompletionStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "ownerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurerFeedEvent" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "policyNumber" TEXT,
    "payload" JSONB NOT NULL,
    "status" "FeedEventStatus" NOT NULL,
    "errors" JSONB,
    "appliedFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurerFeedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "InsurerFeedEvent" ADD CONSTRAINT "InsurerFeedEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
