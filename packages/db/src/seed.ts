import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotificationType, UserRole, VideoType } from '@prisma/client';
import { CONSENT_TEXT_VERSION } from '@profils-actifs/shared';
import { resolveUploadDir } from '@profils-actifs/shared/node';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';
import { loadQuestionnaire } from './questionnaire-loader.js';
import type { ApplicantSeed, UploadedVideoSeed } from './seed-data/applicants.js';
import { applicants } from './seed-data/applicants.js';
import { certificationLevels } from './seed-data/certification-levels.js';
import { CONTACT_MESSAGE, interactionPlan } from './seed-data/interactions.js';
import { skills } from './seed-data/skills.js';
import { DEMO_PASSWORD, primaryRecruiter, staff } from './seed-data/staff.js';

// Every seed function upserts on a deterministic key (never a fresh cuid),
// so `npm run db:seed` can be re-run safely without duplicating rows.

const SALT_ROUNDS = 12;

async function seedCertificationLevels(): Promise<void> {
  for (const level of certificationLevels) {
    await prisma.certificationLevel.upsert({
      where: { name: level.name },
      update: level,
      create: level,
    });
  }

  // Bands must stay contiguous and non-overlapping for badge resolution to be
  // unambiguous, so a level left behind by an earlier fixture is removed
  // rather than allowed to sit alongside the current set. Nothing references
  // this table by id — Profile.certificationBadge stores the resolved name.
  const { count } = await prisma.certificationLevel.deleteMany({
    where: { name: { notIn: certificationLevels.map((level) => level.name) } },
  });

  console.log(
    `Seeded ${certificationLevels.length} certification levels` +
      (count > 0 ? ` (removed ${count} obsolete)` : ''),
  );
}

// Loading throws QuestionnaireValidationError on anything wrong with the
// file — before this function writes a single row. Per Thomas Vignal's
// brief (certification/questions.v1.json), a half-loaded questionnaire is
// worse than no questionnaire: main() lets this propagate and abort the
// whole seed run rather than catching it here.
async function seedCertificationQuestions(): Promise<void> {
  const questionnaire = loadQuestionnaire();

  for (const { id, options, ...questionData } of questionnaire.questions) {
    await prisma.certificationQuestion.upsert({
      where: { id },
      update: questionData,
      create: { id, ...questionData },
    });

    for (const { id: optionId, ...optionData } of options ?? []) {
      await prisma.certificationOption.upsert({
        where: { id: optionId },
        update: { ...optionData, questionId: id },
        create: { id: optionId, questionId: id, ...optionData },
      });
    }
  }

  // Single-row table recording which version is currently loaded — new
  // attempts stamp this onto themselves (see startOrResumeAttempt in the
  // api package) so every passation stays attributable to the content it
  // was actually scored against.
  await prisma.questionnaireVersion.upsert({
    where: { id: 'current' },
    update: { version: questionnaire.version },
    create: { id: 'current', version: questionnaire.version },
  });

  console.log(
    `Seeded ${questionnaire.questions.length} certification questions (version ${questionnaire.version})`,
  );
}

async function seedSkills(): Promise<void> {
  for (const name of skills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${skills.length} skills`);
}

const emailFor = (firstName: string, lastName: string): string =>
  `${firstName}.${lastName}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z.]/g, '')
    .toLowerCase() + '@example.fr';

/** The `update` branch deliberately leaves `passwordHash` alone, so re-seeding
 *  never resets a password someone changed. */
const upsertUser = async (
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  passwordHash: string,
  birthDate: Date | null = null,
) =>
  prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role, birthDate },
    create: { email, firstName, lastName, role, passwordHash, birthDate },
    select: { id: true, email: true },
  });

async function seedStaff(passwordHash: string): Promise<void> {
  for (const account of staff) {
    await upsertUser(
      account.email,
      account.firstName,
      account.lastName,
      account.role,
      passwordHash,
    );
  }
  console.log(`Seeded ${staff.length} staff accounts`);
}

/** Fixture media, tracked in the repo; the copies below are what actually
 *  gets served, and they live outside it. */
const MEDIA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'seed-data/media');

interface StoredUpload {
  type: typeof VideoType.UPLOAD;
  url: string;
  captionsUrl: string;
  fileSizeBytes: number;
}

/**
 * Copies a fixture video and its caption track into `UPLOAD_DIR` — the very
 * directory the API serves over `/uploads` and empties when a candidate
 * revokes consent. Seeding writes the files rather than posting them through
 * the API because no route parses a multipart body yet; everything downstream
 * of storage — the row, the consent record, the player, the deletion — is the
 * real code path.
 *
 * `resolveUploadDir` throws for a directory inside the repository, so a clone
 * with a misconfigured `UPLOAD_DIR` fails here, loudly, instead of producing a
 * seed whose videos silently 404.
 */
async function storeUploadedFixture(entry: UploadedVideoSeed): Promise<StoredUpload> {
  const uploadDir = resolveUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const videoName = `${entry.storedName}.mp4`;
  const captionsName = `${entry.storedName}.fr.vtt`;

  await copyFile(path.join(MEDIA_DIR, `${entry.basename}.mp4`), path.join(uploadDir, videoName));
  await copyFile(
    path.join(MEDIA_DIR, `${entry.basename}.fr.vtt`),
    path.join(uploadDir, captionsName),
  );

  const { size } = await stat(path.join(uploadDir, videoName));

  return {
    type: VideoType.UPLOAD,
    url: `/uploads/${videoName}`,
    captionsUrl: `/uploads/${captionsName}`,
    fileSizeBytes: size,
  };
}

const seedApplicant = async (applicant: ApplicantSeed, passwordHash: string) => {
  const user = await upsertUser(
    emailFor(applicant.firstName, applicant.lastName),
    applicant.firstName,
    applicant.lastName,
    UserRole.APPLICANT,
    passwordHash,
    new Date(applicant.birthDate),
  );

  const profileData = {
    headline: applicant.headline,
    bio: applicant.bio,
    location: applicant.location,
    sector: applicant.sector,
    certificationStatus: applicant.certificationStatus,
    certificationScore: applicant.certificationScore ?? null,
    certificationBadge: applicant.certificationBadge ?? null,
    moderationStatus: applicant.moderationStatus,
  };

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { userId: user.id, ...profileData },
    select: { id: true },
  });

  // Skills and videos are replaced wholesale: they have no natural key to
  // upsert on, and the fixture is the source of truth for them.
  await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
  for (const [name, level] of applicant.skills) {
    const skill = await prisma.skill.findUniqueOrThrow({ where: { name } });
    await prisma.profileSkill.create({
      data: { profileId: profile.id, skillId: skill.id, level },
    });
  }

  await prisma.video.deleteMany({ where: { profileId: profile.id } });
  for (const entry of applicant.videos) {
    // GDPR consent logging (brief §7.1) — a seeded video still needs a valid
    // acceptance record, same as one added through the real API (see
    // packages/api/src/services/video-consent.ts).
    const consent = { acceptedAt: new Date(), consentTextVersion: CONSENT_TEXT_VERSION };

    const stored =
      entry.kind === 'upload'
        ? await storeUploadedFixture(entry)
        : { type: VideoType.EXTERNAL_LINK as const, url: entry.url };

    await prisma.video.create({
      data: {
        profileId: profile.id,
        title: entry.title,
        duration: entry.duration,
        moderationStatus: applicant.moderationStatus,
        ...stored,
        ...consent,
      },
    });
  }

  return user;
};

async function seedApplicants(passwordHash: string): Promise<string[]> {
  const ids: string[] = [];

  for (const applicant of applicants) {
    const user = await seedApplicant(applicant, passwordHash);
    ids.push(user.id);
  }

  console.log(`Seeded ${applicants.length} applicant profiles`);

  return ids;
}

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seedInteractions(applicantIds: string[]): Promise<void> {
  const recruiter = await prisma.user.findUniqueOrThrow({
    where: { email: primaryRecruiter.email },
    select: { id: true, firstName: true, lastName: true },
  });

  // Interactions carry no natural key, so the recruiter's history is rebuilt
  // from scratch rather than upserted.
  await prisma.notification.deleteMany({ where: { interaction: { createdById: recruiter.id } } });
  await prisma.interaction.deleteMany({ where: { createdById: recruiter.id } });

  for (const entry of interactionPlan) {
    const recipientId = applicantIds[entry.applicant];
    if (!recipientId) continue;

    const isMessage = entry.type === 'CONTACT' || entry.type === 'MESSAGE';

    const interaction = await prisma.interaction.create({
      data: {
        createdById: recruiter.id,
        recipientId,
        type: entry.type,
        isFavorite: entry.type === 'FAVORITE',
        message: isMessage ? CONTACT_MESSAGE : null,
        createdAt: daysAgo(entry.daysAgo),
      },
      select: { id: true },
    });

    if (isMessage) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: NotificationType.NEW_INTERACTION_RECEIVED,
          title: 'Nouveau message de recruteur',
          message: `${recruiter.firstName} ${recruiter.lastName} souhaite échanger avec vous.`,
          interactionId: interaction.id,
          createdAt: daysAgo(entry.daysAgo),
        },
      });
    }
  }

  console.log(`Seeded ${interactionPlan.length} interactions`);
}

async function main(): Promise<void> {
  // These are demo fixtures with a published password, including an admin
  // account: running them against a production database would hand over the
  // back office.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de démonstration ne doit pas être exécuté en production');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  await seedCertificationLevels();
  await seedCertificationQuestions();
  await seedSkills();
  await seedStaff(passwordHash);
  const applicantIds = await seedApplicants(passwordHash);
  await seedInteractions(applicantIds);

  console.log(`\nComptes de démonstration — mot de passe commun : ${DEMO_PASSWORD}`);
  console.table(staff.map(({ role, email }) => ({ role, email })));
}

/** The two failures that actually happen when someone seeds a fresh clone,
 *  named so the fix is obvious instead of buried in a Prisma stack trace. */
const explain = (error: unknown): string | null => {
  const message = error instanceof Error ? error.message : String(error);

  if (/ECONNREFUSED|Can't reach database server/i.test(message)) {
    return 'La base de données est injoignable. Démarrez-la avec `docker compose up -d postgres`, puis vérifiez DATABASE_URL dans .env.local.';
  }

  if (
    /does not exist in the current database|relation .* does not exist|P2021|P2022/i.test(message)
  ) {
    return 'Le schéma est absent ou incomplet. Appliquez les migrations avec `npm run db:migrate` avant de semer.';
  }

  return null;
};

main()
  .catch((error: unknown) => {
    const hint = explain(error);
    if (hint) console.error(`\n${hint}\n`);

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // A disconnect that fails must not mask the seeding error above, and must
    // not turn a successful run into a non-zero exit either.
    await prisma.$disconnect().catch((error: unknown) => {
      console.error('[seed] prisma did not disconnect cleanly', error);
    });
  });
