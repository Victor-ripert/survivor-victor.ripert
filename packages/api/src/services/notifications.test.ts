import { jest } from '@jest/globals';
import { asPrismaClient, createPrismaMock, type PrismaMock } from '../../test/prisma-mock.js';
import type { HttpError } from '../utils/http-error.js';

const prismaMock: PrismaMock = createPrismaMock();

jest.unstable_mockModule('../config/prisma.js', () => ({
  prisma: asPrismaClient(prismaMock),
}));

const { listNotifications, markNotificationAsRead, notifyNewInteraction } = await import(
  './notifications.js'
);

const USER_ID = 'applicant-1';

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

describe('listNotifications', () => {
  it('returns the caller’s notifications, newest first, in the paginated envelope', async () => {
    prismaMock.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
    prismaMock.notification.count.mockResolvedValue(1);

    const result = await listNotifications(USER_ID);

    expect(result).toEqual({
      data: [{ id: 'n1' }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('caps the page size server-side however many are requested', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);

    await listNotifications(USER_ID, 1, 500);

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it('returns a clean empty page beyond the last one', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(3);

    const result = await listNotifications(USER_ID, 99);

    expect(result.data).toEqual([]);
    expect(result.pagination).toMatchObject({ page: 99, total: 3, pages: 1 });
  });
});

describe('markNotificationAsRead', () => {
  it('scopes the update to the owner rather than reading the row first', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.notification.findUniqueOrThrow.mockResolvedValue({ id: 'n1', isRead: true });

    await markNotificationAsRead('n1', USER_ID);

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: USER_ID },
      data: { isRead: true },
    });
    expect(prismaMock.notification.findUnique).not.toHaveBeenCalled();
  });

  it('answers 404 for someone else’s notification, without disclosing it exists', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    expect(await statusOf(markNotificationAsRead('n1', 'someone-else'))).toBe(404);
  });
});

describe('notifyNewInteraction', () => {
  it('names the recruiter instead of describing a vague interaction', async () => {
    prismaMock.notification.create.mockResolvedValue({ id: 'n1' });

    await notifyNewInteraction('applicant-1', 'interaction-1', {
      firstName: 'Camille',
      lastName: 'Duarte',
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'applicant-1',
        type: 'NEW_INTERACTION_RECEIVED',
        title: 'Nouveau message de recruteur',
        message: 'Camille Duarte souhaite échanger avec vous.',
        interactionId: 'interaction-1',
      },
    });
  });

  it('writes through the caller’s transaction when given one', async () => {
    const tx = createPrismaMock();
    tx.notification.create.mockResolvedValue({ id: 'n1' });

    await notifyNewInteraction(
      'applicant-1',
      'interaction-1',
      { firstName: 'Camille', lastName: 'Duarte' },
      asPrismaClient(tx) as Parameters<typeof notifyNewInteraction>[3],
    );

    expect(tx.notification.create).toHaveBeenCalled();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});
