import { addVideoSchema } from '../../src/validators/video.js';

describe('addVideoSchema', () => {
  it('accepts a valid EXTERNAL_LINK payload', () => {
    const parsed = addVideoSchema.safeParse({
      title: 'Ma présentation',
      type: 'EXTERNAL_LINK',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts optional fields (description, duration) when present', () => {
    const parsed = addVideoSchema.safeParse({
      title: 'Ma présentation',
      description: 'Courte vidéo de présentation',
      type: 'EXTERNAL_LINK',
      url: 'https://vimeo.com/12345678',
      duration: 90,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a missing title', () => {
    const parsed = addVideoSchema.safeParse({
      type: 'EXTERNAL_LINK',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid type value', () => {
    const parsed = addVideoSchema.safeParse({
      title: 'Ma présentation',
      type: 'CLOUD_STORAGE',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a malformed url', () => {
    const parsed = addVideoSchema.safeParse({
      title: 'Ma présentation',
      type: 'EXTERNAL_LINK',
      url: 'not-a-url',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a negative duration', () => {
    const parsed = addVideoSchema.safeParse({
      title: 'Ma présentation',
      type: 'EXTERNAL_LINK',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration: -5,
    });
    expect(parsed.success).toBe(false);
  });
});
