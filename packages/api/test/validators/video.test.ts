import { addVideoSchema } from '../../src/validators/video.js';

const valid = {
  title: 'Ma présentation',
  type: 'EXTERNAL_LINK',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  consentAccepted: true,
};

describe('addVideoSchema', () => {
  it('accepts a valid EXTERNAL_LINK payload', () => {
    expect(addVideoSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional fields (description, duration) when present', () => {
    const parsed = addVideoSchema.safeParse({
      ...valid,
      description: 'Courte vidéo de présentation',
      url: 'https://vimeo.com/12345678',
      duration: 90,
    });
    expect(parsed.success).toBe(true);
  });

  // Brief §7.1: consent is a deliberate act, logged with the video.
  it.each([[false], [undefined], ['true']])('rejects consentAccepted=%p', (consentAccepted) => {
    expect(addVideoSchema.safeParse({ ...valid, consentAccepted }).success).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title: _title, ...withoutTitle } = valid;
    expect(addVideoSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it('rejects an invalid type value', () => {
    expect(addVideoSchema.safeParse({ ...valid, type: 'CLOUD_STORAGE' }).success).toBe(false);
  });

  it('rejects a malformed url', () => {
    expect(addVideoSchema.safeParse({ ...valid, url: 'not-a-url' }).success).toBe(false);
  });

  it('rejects a negative duration', () => {
    expect(addVideoSchema.safeParse({ ...valid, duration: -5 }).success).toBe(false);
  });
});
