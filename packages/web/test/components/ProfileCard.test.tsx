import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CatalogueProfile } from '@profils-actifs/shared';
import { ProfileCard } from '../../src/components/ProfileCard.js';

const baseProfile: CatalogueProfile = {
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Amina',
  lastName: 'Berthier',
  headline: 'Développeuse full-stack',
  location: 'Lyon',
  sector: 'Informatique',
  certificationStatus: 'COMPLETED',
  certificationScore: 68,
  certificationBadge: 'Certifié JEB',
  availability: null,
  skills: [],
  videoCount: 1,
  previewVideo: null,
  isFavorite: false,
  lastContactedAt: null,
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const renderPlaying = (profile: CatalogueProfile) =>
  render(
    <MemoryRouter>
      <ProfileCard
        profile={profile}
        isPending={false}
        activeVideoId={profile.previewVideo?.id ?? null}
        onActivateVideo={() => {}}
        onToggleFavorite={() => {}}
        onContact={() => {}}
        onView={() => {}}
      />
    </MemoryRouter>,
  );

describe('ProfileCard', () => {
  // The catalogue used to send `{ id, title, url }` only: a hosted video then
  // reached the player looking like an unknown embed, and was refused.
  it('plays a hosted preview video with its captions', () => {
    const { container } = renderPlaying({
      ...baseProfile,
      previewVideo: {
        id: 'video-1',
        title: 'Présentation en 90 secondes',
        type: 'UPLOAD',
        url: '/uploads/e9d1dbe1-7bc6-5e2d-a254-00a9e2583e6f.mp4',
        captionsUrl: '/uploads/e9d1dbe1-7bc6-5e2d-a254-00a9e2583e6f.fr.vtt',
      },
    });

    expect(screen.queryByText('Cette vidéo ne peut pas être affichée.')).toBeNull();
    const player = container.querySelector('video');
    expect(player).toHaveAttribute('src', expect.stringMatching(/\/uploads\/e9d1dbe1.*\.mp4$/));
    expect(player?.querySelector('track')).toHaveAttribute('srclang', 'fr');
  });

  it('frames a YouTube preview in the embed player', () => {
    const { container } = renderPlaying({
      ...baseProfile,
      previewVideo: {
        id: 'video-2',
        title: 'Ma présentation',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
      },
    });

    expect(container.querySelector('iframe')?.getAttribute('src')).toMatch(
      /^https:\/\/www\.youtube\.com\/embed\/aqz-KE-bpKQ\?/,
    );
  });
});
