import { jest } from '@jest/globals';

type AsyncCall = (...args: never[]) => Promise<unknown>;

const modelMock = () => ({
  findMany: jest.fn<AsyncCall>(),
  findFirst: jest.fn<AsyncCall>(),
  findUnique: jest.fn<AsyncCall>(),
  findUniqueOrThrow: jest.fn<AsyncCall>(),
  create: jest.fn<AsyncCall>(),
  update: jest.fn<AsyncCall>(),
  updateMany: jest.fn<AsyncCall>(),
  count: jest.fn<AsyncCall>(),
  groupBy: jest.fn<AsyncCall>(),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;

/**
 * Minimal stand-in for the Prisma client. `$transaction` runs the callback
 * against the same mock, so a test asserting on `interaction.create` sees the
 * call whether the service made it inside a transaction or outside one.
 */
export const createPrismaMock = () => {
  const mock = {
    user: modelMock(),
    profile: modelMock(),
    interaction: modelMock(),
    notification: modelMock(),
    skill: modelMock(),
    $queryRaw: jest.fn<AsyncCall>(),
    $transaction: jest.fn(),
  };

  mock.$transaction.mockImplementation((argument: unknown) =>
    Array.isArray(argument) ? Promise.all(argument) : (argument as (tx: unknown) => unknown)(mock),
  );

  return mock;
};

/** The service modules import the real client; tests hand them this instead. */
export const asPrismaClient = (mock: PrismaMock): unknown => mock;
