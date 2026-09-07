import { normalizeExternalVideoUrl } from '../../../src/services/video-providers/external-link.js';
import { HttpError } from '../../../src/utils/http-error.js';

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
