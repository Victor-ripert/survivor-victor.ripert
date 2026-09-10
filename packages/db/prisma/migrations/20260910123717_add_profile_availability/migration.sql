-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('IMMEDIATE', 'WITHIN_ONE_MONTH', 'WITHIN_THREE_MONTHS', 'LATER');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "availability" "AvailabilityStatus";

-- CreateIndex
CREATE INDEX "Profile_availability_updatedAt_id_idx" ON "Profile"("availability", "updatedAt" DESC, "id");
