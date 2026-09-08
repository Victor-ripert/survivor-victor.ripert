-- DropIndex
DROP INDEX "Profile_updatedAt_idx";

-- CreateIndex
CREATE INDEX "Profile_updatedAt_id_idx" ON "Profile"("updatedAt" DESC, "id");
