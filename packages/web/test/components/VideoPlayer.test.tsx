import { fireEvent, render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import { VideoPlayer } from '../../src/components/VideoPlayer.js';

const video = {
  id: 'video-1',
  title: 'Ma présentation',
  url: 'https://www.youtube.com/embed/abc123',
  duration: 92,
};

describe('VideoPlayer', () => {
  it('shows a keyboard-reachable poster and loads nothing from the host until asked', () => {
    const { container } = render(
      <VideoPlayer video={video} active={false} onActivate={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Lire « Ma présentation »' })).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('1:32')).toBeInTheDocument();
  });

  it('asks the parent to make it the one active player', () => {
    const onActivate = jest.fn();
    render(<VideoPlayer video={video} active={false} onActivate={onActivate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Lire « Ma présentation »' }));

    expect(onActivate).toHaveBeenCalledWith('video-1');
  });

  it('frames the player with autoplay and captions once active, sandboxed', () => {
    render(<VideoPlayer video={video} active onActivate={() => {}} />);

    const frame = screen.getByTitle('Ma présentation');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toContain('autoplay=1');
    expect(frame.getAttribute('src')).toContain('cc_load_policy=1');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('never frames an address outside the allowlist', () => {
    const { container } = render(
      <VideoPlayer
        video={{ ...video, url: 'https://attacker.tld/embed/abc' }}
        active
        onActivate={() => {}}
      />,
    );

    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Cette vidéo ne peut pas être affichée.')).toBeInTheDocument();
  });

  const uploaded = {
    ...video,
    type: 'UPLOAD' as const,
    url: '/uploads/abc123.mp4',
    captionsUrl: '/uploads/abc123.fr.vtt',
  };

  it('renders a native player for an uploaded file once active', () => {
    const { container } = render(<VideoPlayer video={uploaded} active onActivate={() => {}} />);

    const player = container.querySelector('video');
    expect(player?.getAttribute('src')).toContain('/uploads/abc123.mp4');
    expect(player).toHaveAttribute('controls');
  });

  // A hosted file goes behind the same poster as an embed: two uploaded
  // videos rendering straight away would both play at once, which is what
  // the single-active-player rule forbids (brief §8.6).
  it('keeps an uploaded file behind the poster until asked', () => {
    const { container } = render(
      <VideoPlayer video={uploaded} active={false} onActivate={() => {}} />,
    );

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('button', { name: /Lire « Ma présentation »/ })).toBeInTheDocument();
  });

  it('carries the caption track, enabled by default', () => {
    const { container } = render(<VideoPlayer video={uploaded} active onActivate={() => {}} />);

    const track = container.querySelector('track');
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('srclang', 'fr');
    expect(track).toHaveAttribute('default');
    expect(track?.getAttribute('src')).toContain('/uploads/abc123.fr.vtt');
  });

  // The API serves the track from its own origin. A cross-origin <track> is
  // refused unless the media element opts into CORS, and the failure is
  // silent: the track reports `showing` with zero cues. Measured — this is
  // not a precaution.
  it('opts the media element into CORS so the track can load at all', () => {
    const { container } = render(<VideoPlayer video={uploaded} active onActivate={() => {}} />);

    expect(container.querySelector('video')).toHaveAttribute('crossorigin', 'anonymous');
  });

  it('says on the poster that the video is subtitled', () => {
    render(<VideoPlayer video={uploaded} active={false} onActivate={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'Lire « Ma présentation », sous-titrée' }),
    ).toBeInTheDocument();
  });

  // Activating the video unmounts the poster button that had focus. Without
  // the handover the keyboard lands back on <body> and the next Tab restarts
  // from the top of the document — WCAG 2.4.3, measured on the public profile
  // page before this was fixed.
  it('moves focus to the player it just mounted', () => {
    const { container, rerender } = render(
      <VideoPlayer video={uploaded} active={false} onActivate={() => {}} />,
    );

    screen.getByRole('button', { name: /Lire/ }).focus();
    rerender(<VideoPlayer video={uploaded} active onActivate={() => {}} />);

    expect(document.activeElement).toBe(container.querySelector('video'));
  });

  it('moves focus to the embedded frame too', () => {
    const { rerender } = render(<VideoPlayer video={video} active={false} onActivate={() => {}} />);

    rerender(<VideoPlayer video={video} active onActivate={() => {}} />);

    expect(document.activeElement).toBe(screen.getByTitle('Ma présentation'));
  });
});
