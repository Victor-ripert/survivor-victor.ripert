import { isEmbeddableUrl, toPlayerSrc } from './embed.js';

describe('isEmbeddableUrl', () => {
  it.each([
    ['https://www.youtube.com/embed/abc123'],
    ['https://www.youtube-nocookie.com/embed/abc123'],
    ['https://player.vimeo.com/video/12345'],
    ['https://WWW.YOUTUBE.COM/embed/abc123'],
  ])('accepts %p', (url) => {
    expect(isEmbeddableUrl(url)).toBe(true);
  });

  it.each([
    ['javascript:alert(1)'],
    ['JavaScript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['http://www.youtube.com/embed/abc123'],
    ['/relative/path'],
    [''],
    ['not a url'],
  ])('refuses %p', (url) => {
    expect(isEmbeddableUrl(url)).toBe(false);
  });

  it('refuses a host outside the allowlist, however plausible it looks', () => {
    expect(isEmbeddableUrl('https://youtube.com.attacker.tld/embed/abc')).toBe(false);
    expect(isEmbeddableUrl('https://attacker.tld/embed/abc')).toBe(false);
  });

  it('is not fooled by a lookalike host embedded in the path or credentials', () => {
    expect(isEmbeddableUrl('https://attacker.tld/https://www.youtube.com/embed/a')).toBe(false);
    expect(isEmbeddableUrl('https://www.youtube.com@attacker.tld/embed/a')).toBe(false);
  });
});

describe('toPlayerSrc', () => {
  it('turns captions on for a YouTube embed and autoplays only when asked', () => {
    const idle = new URL(toPlayerSrc('https://www.youtube.com/embed/abc123') ?? '');
    expect(idle.searchParams.get('cc_load_policy')).toBe('1');
    expect(idle.searchParams.get('rel')).toBe('0');
    expect(idle.searchParams.get('autoplay')).toBeNull();

    const active = new URL(
      toPlayerSrc('https://www.youtube.com/embed/abc123', { autoplay: true }) ?? '',
    );
    expect(active.searchParams.get('autoplay')).toBe('1');
  });

  it('requests French text tracks and do-not-track on Vimeo', () => {
    const src = new URL(toPlayerSrc('https://player.vimeo.com/video/12345') ?? '');
    expect(src.searchParams.get('texttrack')).toBe('fr');
    expect(src.searchParams.get('dnt')).toBe('1');
  });

  it('answers null outside the allowlist, so nothing unvetted is ever framed', () => {
    expect(toPlayerSrc('https://attacker.tld/embed/abc')).toBeNull();
    expect(toPlayerSrc('javascript:alert(1)')).toBeNull();
  });
});
