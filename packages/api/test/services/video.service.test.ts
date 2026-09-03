import os from 'node:os';
import path from 'node:path';
import {
  normalizeExternalVideoUrl,
  assertUploadSizeWithinLimit,
  detectVideoContentType,
  assertUploadDirOutsideAppCode,
} from '../../src/services/video.service.js';
import { HttpError } from '../../src/utils/http-error.js';

describe('normalizeExternalVideoUrl', () => {
  describe('YouTube', () => {
    it('normalizes a standard watch link', () => {
      expect(normalizeExternalVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('normalizes a watch link with extra query params', () => {
      expect(normalizeExternalVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('normalizes a youtu.be share link', () => {
      expect(normalizeExternalVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('normalizes a Shorts link', () => {
      expect(normalizeExternalVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('normalizes an already-embeddable link', () => {
      expect(normalizeExternalVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('accepts the bare (no www) host', () => {
      expect(normalizeExternalVideoUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('rejects a YouTube URL with no video id', () => {
      expect(() => normalizeExternalVideoUrl('https://www.youtube.com/watch')).toThrow(HttpError);
    });
  });

  describe('Vimeo', () => {
    it('normalizes a standard vimeo.com link', () => {
      expect(normalizeExternalVideoUrl('https://vimeo.com/123456789')).toBe(
        'https://player.vimeo.com/video/123456789',
      );
    });

    it('normalizes an already-embeddable player link', () => {
      expect(normalizeExternalVideoUrl('https://player.vimeo.com/video/123456789')).toBe(
        'https://player.vimeo.com/video/123456789',
      );
    });

    it('ignores a trailing privacy-hash segment', () => {
      expect(normalizeExternalVideoUrl('https://vimeo.com/123456789/abcdef0123')).toBe(
        'https://player.vimeo.com/video/123456789',
      );
    });

    it('rejects a non-numeric Vimeo path (e.g. a channel page)', () => {
      expect(() => normalizeExternalVideoUrl('https://vimeo.com/channels/staffpicks')).toThrow(
        HttpError,
      );
    });
  });

  describe('rejections', () => {
    it('rejects a non-YouTube, non-Vimeo host', () => {
      expect(() => normalizeExternalVideoUrl('https://example.com/video.mp4')).toThrow(HttpError);
    });

    it('rejects a host that merely contains "youtube.com" as text', () => {
      expect(() =>
        normalizeExternalVideoUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'),
      ).toThrow(HttpError);
    });

    it('rejects a URL that smuggles the target host in a query string', () => {
      expect(() => normalizeExternalVideoUrl('https://evil.example/?redirect=youtube.com')).toThrow(
        HttpError,
      );
    });

    it('rejects a malformed URL', () => {
      expect(() => normalizeExternalVideoUrl('not-a-url')).toThrow(HttpError);
    });

    it('rejects with a 400 validation_error, per the acceptance criteria', () => {
      try {
        normalizeExternalVideoUrl('https://example.com/video.mp4');
        throw new Error('expected normalizeExternalVideoUrl to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).statusCode).toBe(400);
        expect((err as HttpError).code).toBe('validation_error');
      }
    });
  });
});

describe('assertUploadSizeWithinLimit', () => {
  const ONE_MB = 1024 * 1024;
  const HUNDRED_MB = 100 * ONE_MB;

  it('accepts a file at exactly the 100MB cap', () => {
    expect(() => assertUploadSizeWithinLimit(HUNDRED_MB)).not.toThrow();
  });

  it('rejects a file one byte over the cap', () => {
    expect(() => assertUploadSizeWithinLimit(HUNDRED_MB + 1)).toThrow(HttpError);
  });

  it('rejects with a 413 payload_too_large', () => {
    try {
      assertUploadSizeWithinLimit(HUNDRED_MB + 1);
      throw new Error('expected assertUploadSizeWithinLimit to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).statusCode).toBe(413);
      expect((err as HttpError).code).toBe('payload_too_large');
    }
  });

  it('accepts a small, ordinary file size', () => {
    expect(() => assertUploadSizeWithinLimit(5 * ONE_MB)).not.toThrow();
  });
});

describe('detectVideoContentType', () => {
  // Minimal synthetic buffers matching just the magic-byte signature —
  // real video files have far more data after these bytes, but the check
  // only ever looks at the header, so that's all a test needs to construct.
  const mp4Header = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('isom')]);
  const movHeader = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('qt  ')]);
  const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);

  it('identifies an MP4 signature', () => {
    expect(detectVideoContentType(mp4Header)).toBe('video/mp4');
  });

  it('identifies a QuickTime (.mov) signature', () => {
    expect(detectVideoContentType(movHeader)).toBe('video/quicktime');
  });

  it('identifies a WebM (EBML) signature', () => {
    expect(detectVideoContentType(webmHeader)).toBe('video/webm');
  });

  it('rejects a file with no recognized signature', () => {
    expect(detectVideoContentType(Buffer.from('just some plain text, not a video'))).toBeNull();
  });

  it('rejects a real image signature (JPEG) renamed to look like a video', () => {
    const jpegHeader = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
    expect(detectVideoContentType(jpegHeader)).toBeNull();
  });

  it('rejects a buffer too short to contain a signature', () => {
    expect(detectVideoContentType(Buffer.from([0x00, 0x01]))).toBeNull();
  });
});

describe('assertUploadDirOutsideAppCode', () => {
  it('rejects a directory inside the repository', () => {
    // The api package itself, e.g. .../survivor/packages/api — always
    // inside the repo, on any machine this test runs on.
    expect(() => assertUploadDirOutsideAppCode(process.cwd())).toThrow();
  });

  it('rejects a directory further up but still inside the repo', () => {
    expect(() => assertUploadDirOutsideAppCode(path.resolve(process.cwd(), '..'))).toThrow();
  });

  it('accepts a directory outside the repository', () => {
    expect(() => assertUploadDirOutsideAppCode(os.tmpdir())).not.toThrow();
  });
});
