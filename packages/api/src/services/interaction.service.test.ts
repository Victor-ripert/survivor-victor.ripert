import { jest } from '@jest/globals';
import { CONTACT_LIMIT_PER_APPLICANT_PER_DAY } from '@profils-actifs/shared';
import { asPrismaClient, createPrismaMock, type PrismaMock } from '../../test/prisma-mock.js';
import type { HttpError } from '../utils/http-error.js';

const prismaMock: PrismaMock = createPrismaMock();

jest.unstable_mockModule('../config/prisma.js', () => ({
  prisma: asPrismaClient(prismaMock),
}));

const { recordInteraction, removeFavorite, updateInteraction } =
  await import('./interaction.service.js');

const RECRUITER_ID = 'recruiter-1';
const APPLICANT_ID = 'applicant-1';

const applicant = { id: APPLICANT_ID, firstName: 'Amina', lastName: 'Berthier' };

const interactionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'interaction-1',
  type: 'VIEW',
  message: null,
  isViewed: false,
  isFavorite: false,
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  recipientId: APPLICANT_ID,
  createdById: RECRUITER_ID,
  recipient: { ...applicant, role: 'APPLICANT', profile: { id: 'profile-1' } },
  createdBy: {
    id: RECRUITER_ID,
    firstName: 'Camille',
    lastName: 'Duarte',
    role: 'RECRUITER',
    profile: null,
  },
  ...overrides,
});

const statusOf = async (promise: Promise<unknown>): Promise<number> => {
  try {
    await promise;
    throw new Error('expected the call to be rejected');
  } catch (error) {
    return (error as HttpError).statusCode;
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation((argument: unknown) =>
    Array.isArray(argument)
      ? Promise.all(argument)
      : (argument as (tx: unknown) => unknown)(prismaMock),
  );
});

describe('recordInteraction', () => {
  it('rejects an unknown, inactive or non-applicant recipient with 404', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    expect(
      await statusOf(
        recordInteraction({ actorId: RECRUITER_ID, applicantId: 'ghost', type: 'VIEW' }),
      ),
    ).toBe(404);
    expect(prismaMock.interaction.create).not.toHaveBeenCalled();
  });

  it('refuses an interaction with oneself', async () => {
    expect(
      await statusOf(
        recordInteraction({ actorId: RECRUITER_ID, applicantId: RECRUITER_ID, type: 'VIEW' }),
      ),
    ).toBe(403);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it('records a first view', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.interaction.findFirst.mockResolvedValue(null);
    prismaMock.interaction.create.mockResolvedValue(interactionRow());

    const result = await recordInteraction({
      actorId: RECRUITER_ID,
      applicantId: APPLICANT_ID,
      type: 'VIEW',
    });

    expect(result.created).toBe(true);
    expect(result.interaction.counterpart.lastName).toBe('Berthier');
  });

  it('collapses a repeat view onto the existing one', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.interaction.findFirst.mockResolvedValue(interactionRow());

    const result = await recordInteraction({
      actorId: RECRUITER_ID,
      applicantId: APPLICANT_ID,
      type: 'VIEW',
    });

    expect(result.created).toBe(false);
    expect(prismaMock.interaction.create).not.toHaveBeenCalled();
  });

  it('notifies the applicant when a message is sent', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      firstName: 'Camille',
      lastName: 'Duarte',
    });
    prismaMock.interaction.count.mockResolvedValue(0);
    prismaMock.interaction.create.mockResolvedValue(
      interactionRow({ type: 'CONTACT', message: 'Bonjour' }),
    );
    prismaMock.notification.create.mockResolvedValue({});

    await recordInteraction({
      actorId: RECRUITER_ID,
      applicantId: APPLICANT_ID,
      type: 'CONTACT',
      message: 'Bonjour',
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: APPLICANT_ID,
        type: 'NEW_INTERACTION_RECEIVED',
        interactionId: 'interaction-1',
      }),
    });
  });

  it('stops a recruiter once the daily message cap for that applicant is reached', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      firstName: 'Camille',
      lastName: 'Duarte',
    });
    prismaMock.interaction.count.mockResolvedValue(CONTACT_LIMIT_PER_APPLICANT_PER_DAY);

    expect(
      await statusOf(
        recordInteraction({
          actorId: RECRUITER_ID,
          applicantId: APPLICANT_ID,
          type: 'CONTACT',
          message: 'Bonjour',
        }),
      ),
    ).toBe(429);
    expect(prismaMock.interaction.create).not.toHaveBeenCalled();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it('does not notify anyone when a profile is favourited', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.interaction.findFirst.mockResolvedValue(null);
    prismaMock.interaction.create.mockResolvedValue(
      interactionRow({ type: 'FAVORITE', isFavorite: true }),
    );

    const result = await recordInteraction({
      actorId: RECRUITER_ID,
      applicantId: APPLICANT_ID,
      type: 'FAVORITE',
    });

    expect(result.created).toBe(true);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it('reuses the existing row when a profile is favourited twice', async () => {
    prismaMock.user.findFirst.mockResolvedValue(applicant);
    prismaMock.interaction.findFirst.mockResolvedValue({ id: 'interaction-1', isFavorite: true });
    prismaMock.interaction.update.mockResolvedValue(
      interactionRow({ type: 'FAVORITE', isFavorite: true }),
    );

    const result = await recordInteraction({
      actorId: RECRUITER_ID,
      applicantId: APPLICANT_ID,
      type: 'FAVORITE',
    });

    expect(result.created).toBe(false);
    expect(prismaMock.interaction.create).not.toHaveBeenCalled();
  });
});

describe('removeFavorite', () => {
  it('clears the flag instead of deleting the audit row', async () => {
    prismaMock.interaction.updateMany.mockResolvedValue({ count: 1 });

    await removeFavorite(RECRUITER_ID, APPLICANT_ID);

    expect(prismaMock.interaction.updateMany).toHaveBeenCalledWith({
      where: {
        createdById: RECRUITER_ID,
        recipientId: APPLICANT_ID,
        type: 'FAVORITE',
        isFavorite: true,
      },
      data: { isFavorite: false },
    });
  });
});

describe('updateInteraction', () => {
  it('returns 404 for an interaction that does not exist', async () => {
    prismaMock.interaction.findUnique.mockResolvedValue(null);

    expect(await statusOf(updateInteraction('missing', RECRUITER_ID, { isViewed: true }))).toBe(
      404,
    );
  });

  it('lets only the recipient mark an interaction as viewed', async () => {
    prismaMock.interaction.findUnique.mockResolvedValue({
      createdById: RECRUITER_ID,
      recipientId: APPLICANT_ID,
    });

    expect(
      await statusOf(updateInteraction('interaction-1', RECRUITER_ID, { isViewed: true })),
    ).toBe(403);
    expect(prismaMock.interaction.update).not.toHaveBeenCalled();
  });

  it('lets only the author change the favourite flag', async () => {
    prismaMock.interaction.findUnique.mockResolvedValue({
      createdById: RECRUITER_ID,
      recipientId: APPLICANT_ID,
    });

    expect(
      await statusOf(updateInteraction('interaction-1', APPLICANT_ID, { isFavorite: true })),
    ).toBe(403);
  });

  it('applies a permitted change', async () => {
    prismaMock.interaction.findUnique.mockResolvedValue({
      createdById: RECRUITER_ID,
      recipientId: APPLICANT_ID,
    });
    prismaMock.interaction.update.mockResolvedValue(interactionRow({ isViewed: true }));

    const updated = await updateInteraction('interaction-1', APPLICANT_ID, { isViewed: true });

    expect(updated.isViewed).toBe(true);
  });
});
