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

describe('addVideoSchema — type: UPLOAD', () => {
  // multipart/form-data has no url field at all — the file itself is the
  // content, parsed separately into req.file by middleware/video-upload.ts.
  const validUpload = { title: 'Vidéo déposée', type: 'UPLOAD', consentAccepted: true };

  it('accepts a payload with no url', () => {
    expect(addVideoSchema.safeParse(validUpload).success).toBe(true);
  });

  // multer parses every multipart field as a string; the schema coerces it
  // back rather than the controller pre-converting the body.
  it('coerces the string form multer hands back for duration and consentAccepted', () => {
    const parsed = addVideoSchema.safeParse({
      ...validUpload,
      duration: '90',
      consentAccepted: 'true',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.duration).toBe(90);
    expect(parsed.success && parsed.data.consentAccepted).toBe(true);
  });

  it('rejects consentAccepted sent as the string "false"', () => {
    expect(addVideoSchema.safeParse({ ...validUpload, consentAccepted: 'false' }).success).toBe(
      false,
    );
  });

  it('rejects a duration that does not parse as a number', () => {
    expect(addVideoSchema.safeParse({ ...validUpload, duration: 'abc' }).success).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title: _title, ...withoutTitle } = validUpload;
    expect(addVideoSchema.safeParse(withoutTitle).success).toBe(false);
  });
});
