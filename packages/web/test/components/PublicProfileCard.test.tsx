import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { PublicProfileCard } from '../../src/components/PublicProfileCard.js';

const baseProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Amina',
  lastName: 'Berthier',
  headline: 'Développeuse full-stack',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'APPROVED',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const renderCard = (profile: Profile) =>
  render(
    <MemoryRouter>
      <PublicProfileCard profile={profile} activeVideoId={null} onActivateVideo={() => {}} />
    </MemoryRouter>,
  );

describe('PublicProfileCard', () => {
  it('links the candidate name to the public profile page', () => {
    renderCard(baseProfile);

    expect(screen.getByRole('link', { name: 'Amina Berthier' })).toHaveAttribute(
      'href',
      '/profils/profile-1',
    );
    expect(screen.getByText('Développeuse full-stack')).toBeInTheDocument();
  });

  it('shows a placeholder when the profile has no video yet', () => {
    renderCard(baseProfile);

    expect(screen.getByText('Aucune vidéo pour le moment')).toBeInTheDocument();
    expect(document.querySelector('iframe, video')).toBeNull();
  });

  it('offers the primary video as a poster to play', () => {
    renderCard({
      ...baseProfile,
      videos: [
        {
          id: 'video-1',
          profileId: 'profile-1',
          title: 'Ma présentation',
          type: 'EXTERNAL_LINK',
          url: 'https://www.youtube.com/embed/abc123',
          moderationStatus: 'APPROVED',
          createdAt: '2026-09-01T10:00:00.000Z',
        },
      ],
    });

    expect(screen.getByRole('button', { name: 'Lire « Ma présentation »' })).toBeInTheDocument();
  });

  it('spells out the certification state', () => {
    renderCard({
      ...baseProfile,
      certificationStatus: 'COMPLETED',
      certificationBadge: 'Certifié JEB',
      certificationScore: 68,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Certifié JEB · 68/100');
  });
});
