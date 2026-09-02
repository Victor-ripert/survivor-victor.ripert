import { render, screen } from '@testing-library/react';
import { VideoEmbed, resolveUploadedVideoSrc } from '../../src/components/VideoEmbed.js';

describe('resolveUploadedVideoSrc', () => {
  it('passes an already-absolute URL through unchanged', () => {
    expect(resolveUploadedVideoSrc('https://cdn.example.com/videos/a.mp4')).toBe(
      'https://cdn.example.com/videos/a.mp4',
    );
  });

  it('resolves a relative /uploads path against the API origin', () => {
    const src = resolveUploadedVideoSrc('/uploads/abc123.mp4');
    expect(src.startsWith('http')).toBe(true);
    expect(src.endsWith('/uploads/abc123.mp4')).toBe(true);
  });
});

describe('VideoEmbed', () => {
  it('renders a sandboxed iframe for EXTERNAL_LINK, using the given url as-is', () => {
    render(<VideoEmbed type="EXTERNAL_LINK" url="https://www.youtube.com/embed/abc123" />);

    const iframe = screen.getByTitle('Vidéo de présentation');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/abc123');
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('renders a native <video> tag for UPLOAD, with playback controls', () => {
    const { container } = render(<VideoEmbed type="UPLOAD" url="/uploads/abc123.mp4" />);

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toContain('/uploads/abc123.mp4');
    expect(video).toHaveAttribute('controls');
  });
});
