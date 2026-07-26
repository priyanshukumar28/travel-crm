-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "secondaryStatus" TEXT,
ADD COLUMN     "secondaryStatusHistory" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "coverageName" TEXT;
