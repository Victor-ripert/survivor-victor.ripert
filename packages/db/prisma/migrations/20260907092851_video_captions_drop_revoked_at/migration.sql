/*
  Warnings:

  - You are about to drop the column `revokedAt` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "revokedAt",
ADD COLUMN     "captionsUrl" TEXT;
