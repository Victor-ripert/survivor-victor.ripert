-- AlterTable
ALTER TABLE "CertificationAttempt" ADD COLUMN     "questionnaireVersion" TEXT NOT NULL DEFAULT 'v1';

-- CreateTable
CREATE TABLE "QuestionnaireVersion" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "version" TEXT NOT NULL,
    "loadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);
