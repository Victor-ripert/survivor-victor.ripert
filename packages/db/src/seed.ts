import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotificationType, UserRole, VideoType } from '@prisma/client';
import { CONSENT_TEXT_VERSION, normalizeExternalVideoUrl } from '@profils-actifs/shared';
import { resolveUploadDir } from '@profils-actifs/shared/node';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';
import { deriveVideoProvider } from './migrate-video-providers.js';
import { loadQuestionnaire } from './questionnaire-loader.js';
import type {
  ApplicantSeed,
  EmbeddedVideoSeed,
  UploadedVideoSeed,
} from './seed-data/applicants.js';
import { applicants } from './seed-data/applicants.js';
import { certificationLevels } from './seed-data/certification-levels.js';
import { generateApplicants } from './seed-data/generated-applicants.js';
import { CONTACT_MESSAGE, interactionPlan } from './seed-data/interactions.js';
import { skills } from './seed-data/skills.js';
import { DEMO_PASSWORD, primaryRecruiter, staff } from './seed-data/staff.js';

// Every seed function upserts on a deterministic key (never a fresh cuid),
// so `npm run db:seed` can be re-run safely without duplicating rows.

const SALT_ROUNDS = 12;

/**
 * Load-test dataset size (Thomas Vignal, 2026-09-08): 500 applicant
 * profiles, at least 300 with a video. Overridable via env var so the same
 * generator can produce a lighter dataset for a quick local run without
 * touching code — `SEED_APPLICANT_COUNT=50 SEED_APPLICANTS_WITH_VIDEO=20
 * npm run db:seed`.
 */
const totalApplicantsEnv = process.env.SEED_APPLICANT_COUNT;
const TOTAL_APPLICANTS = totalApplicantsEnv === undefined ? 500 : Number(totalApplicantsEnv);
const minApplicantsWithVideoEnv = process.env.SEED_APPLICANTS_WITH_VIDEO;
const MIN_APPLICANTS_WITH_VIDEO =
  minApplicantsWithVideoEnv === undefined ? 300 : Number(minApplicantsWithVideoEnv);

if (!Number.isInteger(TOTAL_APPLICANTS) || TOTAL_APPLICANTS <= 0) {
  throw new Error('SEED_APPLICANT_COUNT must be a positive integer');
}

if (!Number.isInteger(MIN_APPLICANTS_WITH_VIDEO) || MIN_APPLICANTS_WITH_VIDEO < 0) {
  throw new Error('SEED_APPLICANTS_WITH_VIDEO must be a non-negative integer');
}

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
  providerName: string;
  providerRef: string;
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
  const url = `/uploads/${videoName}`;
  const { providerName, providerRef } = deriveVideoProvider(VideoType.UPLOAD, url);

  return {
    type: VideoType.UPLOAD,
    url,
    captionsUrl: `/uploads/${captionsName}`,
    fileSizeBytes: size,
    providerName,
    providerRef,
  };
}

/**
 * The embed-kind counterpart to `storeUploadedFixture` above. Runs the
 * fixture's URL through `normalizeExternalVideoUrl` — the exact function
 * `POST /profiles/{id}/videos` calls via `packages/api/src/services/
 * video-providers/external-link.ts`, both now importing it from
 * `@profils-actifs/shared` — rather than trusting the fixture to already
 * hold a canonical embed URL, then derives `providerName`/`providerRef`
 * with this package's own `deriveVideoProvider` (`migrate-video-
 * providers.ts`), the same values the real provider's `store()` would
 * produce. A seeded EXTERNAL_LINK video is the result of the same
 * validation a candidate's pasted link goes through, not a raw insert.
 */
function storeExternalLinkFixture(entry: EmbeddedVideoSeed): StoredExternalLink {
  const url = normalizeExternalVideoUrl(entry.url);
  const { providerName, providerRef } = deriveVideoProvider(VideoType.EXTERNAL_LINK, url);

  return { type: VideoType.EXTERNAL_LINK, url, providerName, providerRef };
}

interface StoredExternalLink {
  type: typeof VideoType.EXTERNAL_LINK;
  url: string;
  providerName: string;
  providerRef: string;
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
    availability: applicant.availability ?? null,
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
      entry.kind === 'upload' ? await storeUploadedFixture(entry) : storeExternalLinkFixture(entry);

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

/**
 * The curated fixtures in `applicants.ts` are named demo accounts —
 * `interactions.ts` indexes into the result of this function by position,
 * so they always come first — topped up with enough generated applicants
 * to reach `TOTAL_APPLICANTS`, with enough of *those* carrying a video to
 * reach `MIN_APPLICANTS_WITH_VIDEO` across the whole set.
 */
function buildApplicantRoster(): ApplicantSeed[] {
  const curatedWithVideo = applicants.filter((applicant) => applicant.videos.length > 0).length;
  const generatedCount = TOTAL_APPLICANTS - applicants.length;
  const generatedVideoCount = Math.max(0, MIN_APPLICANTS_WITH_VIDEO - curatedWithVideo);

  if (generatedVideoCount > generatedCount) {
    throw new Error(
      `MIN_APPLICANTS_WITH_VIDEO (${MIN_APPLICANTS_WITH_VIDEO}) cannot be reached with TOTAL_APPLICANTS (${TOTAL_APPLICANTS}) and ${applicants.length} curated fixtures — lower MIN_APPLICANTS_WITH_VIDEO or raise TOTAL_APPLICANTS.`,
    );
  }
  if (generatedCount < 0) {
    throw new Error(
      `TOTAL_APPLICANTS (${TOTAL_APPLICANTS}) is smaller than the ${applicants.length} curated fixtures in applicants.ts — raise it or trim applicants.ts.`,
    );
  }

  const generated = generateApplicants({
    count: generatedCount,
    videoCount: generatedVideoCount,
    exclude: new Set(applicants.map((applicant) => `${applicant.firstName} ${applicant.lastName}`)),
  });

  return [...applicants, ...generated];
}

async function seedApplicants(passwordHash: string): Promise<string[]> {
  const roster = buildApplicantRoster();
  const ids: string[] = [];

  for (const applicant of roster) {
    const user = await seedApplicant(applicant, passwordHash);
    ids.push(user.id);
  }

  const withVideo = roster.filter((applicant) => applicant.videos.length > 0).length;
  console.log(`Seeded ${roster.length} applicant profiles (${withVideo} with a video)`);

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

  // Load-test dataset check (Thomas Vignal, 2026-09-08): informative, not a
  // hard gate — a database someone has already been testing against by hand
  // can legitimately carry extra rows this script never created, and that
  // is not this script's problem to report as a failure.
  const [profileCount, videoCount] = await Promise.all([
    prisma.profile.count(),
    prisma.video.count(),
  ]);
  console.log(
    `\nProfiles in database: ${profileCount} (target ${TOTAL_APPLICANTS}) — Videos: ${videoCount} (target >= ${MIN_APPLICANTS_WITH_VIDEO})`,
  );

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
