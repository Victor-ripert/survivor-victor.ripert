-- Hand-added, ahead of the generated statements: the trigram indexes below
-- cannot be created without it, and Prisma does not model extensions unless
-- the `postgresqlExtensions` preview feature is on — which would then make
-- `migrate diff` treat every unmodelled extension as drift. pg_trgm ships with
-- PostgreSQL contrib and is a trusted extension since 13, so the database
-- owner can install it without superuser rights; nothing external is pulled in
-- (brief §8.3).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "Profile_location_idx";

-- DropIndex
DROP INDEX "Profile_sector_idx";

-- DropIndex
DROP INDEX "ProfileSkill_skillId_idx";

-- CreateIndex
CREATE INDEX "Profile_sector_idx" ON "Profile" USING GIN ("sector" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Profile_location_idx" ON "Profile" USING GIN ("location" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Profile_certificationScore_idx" ON "Profile"("certificationScore");

-- CreateIndex
CREATE INDEX "Profile_updatedAt_idx" ON "Profile"("updatedAt");

-- CreateIndex
CREATE INDEX "ProfileSkill_skillId_profileId_idx" ON "ProfileSkill"("skillId", "profileId");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill" USING GIN ("name" gin_trgm_ops);
