-- AlterTable
ALTER TABLE "ModerationLog" ADD COLUMN     "videoId" TEXT,
ALTER COLUMN "profileId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ModerationLog_videoId_idx" ON "ModerationLog"("videoId");

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
