import { createInteractionSchema, updateInteractionSchema } from './interactions.js';

const parse = (input: unknown) => createInteractionSchema.safeParse(input);

describe('createInteractionSchema', () => {
  it('accepts a contact carrying a message', () => {
    const result = parse({ recipientId: 'user-1', type: 'CONTACT', message: 'Bonjour à vous' });

    expect(result.success).toBe(true);
  });

  it.each(['CONTACT', 'MESSAGE'])('requires a message for %s', (type) => {
    expect(parse({ recipientId: 'user-1', type }).success).toBe(false);
  });

  it.each(['VIEW', 'FAVORITE'])('refuses a message on %s', (type) => {
    expect(parse({ recipientId: 'user-1', type, message: 'Bonjour à vous' }).success).toBe(false);
  });

  it('refuses a message shorter than the minimum', () => {
    expect(parse({ recipientId: 'user-1', type: 'CONTACT', message: 'Salut' }).success).toBe(false);
  });

  it('refuses a message longer than the maximum', () => {
    const result = parse({
      recipientId: 'user-1',
      type: 'CONTACT',
      message: 'a'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('trims the message before storing it', () => {
    const result = parse({
      recipientId: 'user-1',
      type: 'CONTACT',
      message: '  Bonjour, un poste vous attend.  ',
    });

    expect(result.success && result.data.message).toBe('Bonjour, un poste vous attend.');
  });

  it('rejects an unknown interaction type', () => {
    expect(parse({ recipientId: 'user-1', type: 'LIKE' }).success).toBe(false);
  });

  it('rejects an empty recipient', () => {
    expect(parse({ recipientId: '   ', type: 'VIEW' }).success).toBe(false);
  });
});

describe('updateInteractionSchema', () => {
  it('rejects a patch that changes nothing', () => {
    expect(updateInteractionSchema.safeParse({}).success).toBe(false);
  });

  it.each([{ isViewed: true }, { isFavorite: false }])('accepts %p', (patch) => {
    expect(updateInteractionSchema.safeParse(patch).success).toBe(true);
  });

  it('rejects a non-boolean flag', () => {
    expect(updateInteractionSchema.safeParse({ isViewed: 'yes' }).success).toBe(false);
  });
});
