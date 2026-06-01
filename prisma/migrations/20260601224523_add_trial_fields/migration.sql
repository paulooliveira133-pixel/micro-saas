-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "planStatus" TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '14 days';
