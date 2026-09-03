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

  it('renders a native player for an uploaded file', () => {
    const { container } = render(
      <VideoPlayer
        video={{ ...video, type: 'UPLOAD', url: '/uploads/abc123.mp4' }}
        active={false}
        onActivate={() => {}}
      />,
    );

    const player = container.querySelector('video');
    expect(player?.getAttribute('src')).toContain('/uploads/abc123.mp4');
    expect(player).toHaveAttribute('controls');
  });
});
