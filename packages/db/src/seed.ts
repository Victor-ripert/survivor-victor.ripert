import { NotificationType, UserRole, VideoType } from '@prisma/client';
import { CONSENT_TEXT_VERSION } from '@profils-actifs/shared';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';
import type { ApplicantSeed } from './seed-data/applicants.js';
import { applicants } from './seed-data/applicants.js';
import { certificationLevels } from './seed-data/certification-levels.js';
import { certificationQuestions } from './seed-data/certification-questions.js';
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

async function seedCertificationQuestions(): Promise<void> {
  for (const { id, options, ...questionData } of certificationQuestions) {
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
  console.log(`Seeded ${certificationQuestions.length} certification questions`);
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
) =>
  prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role },
    create: { email, firstName, lastName, role, passwordHash },
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

const seedApplicant = async (applicant: ApplicantSeed, passwordHash: string) => {
  const user = await upsertUser(
    emailFor(applicant.firstName, applicant.lastName),
    applicant.firstName,
    applicant.lastName,
    UserRole.APPLICANT,
    passwordHash,
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
    await prisma.video.create({
      data: {
        profileId: profile.id,
        title: entry.title,
        type: VideoType.EXTERNAL_LINK,
        url: entry.url,
        duration: entry.duration,
        moderationStatus: applicant.moderationStatus,
        // Both are required since 20260902133533_add_video_consent: a video
        // cannot exist without the consent that authorises publishing it, and
        // the demo fixtures get no exemption (brief §7.8, last bullet).
        acceptedAt: new Date(),
        consentTextVersion: CONSENT_TEXT_VERSION,
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

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
