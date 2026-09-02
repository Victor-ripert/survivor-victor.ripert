import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { findOrCreateSkill } from '../../src/services/skills.service.js';

type FindFirst = (args: unknown) => Promise<{ id: string; name: string } | null>;
type Create = (args: unknown) => Promise<{ id: string; name: string }>;

const fakeTx = (findFirst: FindFirst, create: Create) =>
  ({ skill: { findFirst, create } }) as unknown as Prisma.TransactionClient;

const duplicateKey = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('findOrCreateSkill', () => {
  it('reuses an existing skill whatever its casing, and creates nothing', async () => {
    const create = jest.fn<Create>();
    const tx = fakeTx(async () => ({ id: 'skill-1', name: 'React' }), create);

    await expect(findOrCreateSkill(tx, '  react  ')).resolves.toEqual({
      id: 'skill-1',
      name: 'React',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('normalises the name it creates', async () => {
    const create = jest.fn<Create>().mockResolvedValue({ id: 'skill-2', name: 'Node js' });
    const tx = fakeTx(async () => null, create);

    await findOrCreateSkill(tx, '  Node   js ');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Node js' } }));
  });

  // Two candidates tagging the same brand-new skill at once: one create loses
  // on the unique name, and wants the winner's row rather than a 409.
  it('takes the winner’s row when a concurrent create won the race', async () => {
    const findFirst = jest
      .fn<FindFirst>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'skill-3', name: 'SQL' });
    const create = jest.fn<Create>().mockRejectedValue(duplicateKey());

    await expect(findOrCreateSkill(fakeTx(findFirst, create), 'SQL')).resolves.toEqual({
      id: 'skill-3',
      name: 'SQL',
    });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('rethrows a duplicate it cannot explain by a lost race', async () => {
    const findFirst = jest.fn<FindFirst>().mockResolvedValue(null);
    const create = jest.fn<Create>().mockRejectedValue(duplicateKey());

    await expect(findOrCreateSkill(fakeTx(findFirst, create), 'SQL')).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('rethrows any other failure untouched', async () => {
    const create = jest.fn<Create>().mockRejectedValue(new Error('connection lost'));

    await expect(
      findOrCreateSkill(
        fakeTx(async () => null, create),
        'SQL',
      ),
    ).rejects.toThrow('connection lost');
  });
});
