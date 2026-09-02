/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Video` table. All the data in the column will be lost.
  - Added the required column `acceptedAt` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consentTextVersion` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "createdAt",
ADD COLUMN     "acceptedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "consentTextVersion" TEXT NOT NULL,
ADD COLUMN     "revokedAt" TIMESTAMP(3);
