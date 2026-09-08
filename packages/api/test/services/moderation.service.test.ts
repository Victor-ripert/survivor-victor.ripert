import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/config/prisma.js';
import { applyModeration, listPendingProfiles } from '../../src/services/moderation.service.js';
import { HttpError } from '../../src/utils/http-error.js';
import { buildVideoConsent } from '../../src/services/video-consent.js';
import { collectAllPages } from '../pagination-helpers.js';

/**
 * Integration tests — unlike every other test file in this project so far,
 * these hit a real database rather than pure functions. That's inherent to
 * what's being tested: "the status update and the log row happen in the
 * same transaction" isn't something you can verify without a real
 * transaction to observe. Requires a reachable Postgres matching
 * `DATABASE_URL` (`docker compose up -d`, per CLAUDE.md) — this is exactly
 * what `.github/workflows/ci.yml` already spins up before running tests,
 * so this isn't a new requirement for the project, just the first test
 * file that actually needs it.
 */
describe('moderation.service', () => {
  let adminId: string;
  let applicantId: string;
  let profileId: string;
  let videoId: string;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@test.local`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    const applicant = await prisma.user.create({
      data: {
        email: `applicant-${randomUUID()}@test.local`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Applicant',
        lastName: 'Test',
        role: 'APPLICANT',
      },
    });
    applicantId = applicant.id;

    const profile = await prisma.profile.create({
      data: { userId: applicantId, location: 'Paris', sector: 'Informatique' },
    });
    profileId = profile.id;

    const video = await prisma.video.create({
      data: {
        profileId,
        title: 'Vidéo de présentation',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        ...buildVideoConsent(),
      },
    });
    videoId = video.id;
  });

  afterAll(async () => {
    // ModerationLog.adminId deliberately has no onDelete: Cascade (unlike
    // profileId/videoId) — an audit trail shouldn't silently vanish just
    // because the admin account that made the decision is later deleted.
    // That means log rows have to go first, explicitly, before the admin
    // user can be deleted at all; deleting the applicant still cascades
    // profile -> videos normally.
    await prisma.moderationLog.deleteMany({ where: { adminId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, applicantId] } } });
    await prisma.$disconnect();
  });

  it('approves a profile and writes a matching ModerationLog row', async () => {
    await applyModeration('profile', profileId, adminId, 'APPROVE', 'looks good');

    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.moderationStatus).toBe('APPROVED');

    const logs = await prisma.moderationLog.findMany({ where: { profileId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe('APPROVE');
    expect(logs[0]?.adminId).toBe(adminId);
    expect(logs[0]?.reason).toBe('looks good');
    expect(logs[0]?.videoId).toBeNull();
  });

  it('rejects a video and writes a matching ModerationLog row, independent of the profile', async () => {
    await applyModeration('video', videoId, adminId, 'REJECT', 'inappropriate content');

    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    expect(video.moderationStatus).toBe('REJECTED');

    const videoLogs = await prisma.moderationLog.findMany({ where: { videoId } });
    expect(videoLogs).toHaveLength(1);
    expect(videoLogs[0]?.action).toBe('REJECT');
    expect(videoLogs[0]?.profileId).toBeNull();

    // The profile itself is untouched by moderating its video.
    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.moderationStatus).toBe('APPROVED');
  });

  it('maps REQUIRE_CHANGES to REJECTED on the status, while the log keeps the real action', async () => {
    await applyModeration('profile', profileId, adminId, 'REQUIRE_CHANGES', 'add more detail');

    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.moderationStatus).toBe('REJECTED');

    const latestLog = await prisma.moderationLog.findFirst({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
    expect(latestLog?.action).toBe('REQUIRE_CHANGES');
  });

  it('maps FLAG back to PENDING, even for a previously-approved profile', async () => {
    await applyModeration('profile', profileId, adminId, 'FLAG', 'needs a second opinion');

    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.moderationStatus).toBe('PENDING');
  });

  it('throws not_found for a nonexistent id and writes no log row (transaction rolls back cleanly)', async () => {
    const logCountBefore = await prisma.moderationLog.count();

    await expect(
      applyModeration('profile', 'nonexistent-profile-id', adminId, 'APPROVE'),
    ).rejects.toBeInstanceOf(HttpError);

    const logCountAfter = await prisma.moderationLog.count();
    expect(logCountAfter).toBe(logCountBefore);
  });

  it('listPendingProfiles only returns PENDING profiles', async () => {
    // The profile is PENDING right now, from the FLAG test above. Walks
    // every page rather than just page 1 — the seeded load-test dataset
    // means this profile is not guaranteed to land on the first one.
    const allPending = await collectAllPages((page) => listPendingProfiles({ page, limit: 20 }));

    expect(allPending.some((profile) => profile.id === profileId)).toBe(true);
    expect(allPending.every((profile) => profile.moderationStatus === 'PENDING')).toBe(true);
  });
});
