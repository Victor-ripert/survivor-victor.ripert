import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Profile } from '@profils-actifs/shared';
import { ProfileCard } from '../../src/components/ProfileCard.js';

const baseProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  headline: 'Développeuse full-stack',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'APPROVED',
};

function renderCard(profile: Profile): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ProfileCard profile={profile} />
    </MemoryRouter>,
  );
}

describe('ProfileCard', () => {
  it('links the headline to the public profile page', () => {
    renderCard(baseProfile);
    const link = screen.getByRole('link', { name: 'Développeuse full-stack' });
    expect(link).toHaveAttribute('href', '/profiles/profile-1');
  });

  it('falls back to the sector as a headline when none is set', () => {
    renderCard({ ...baseProfile, headline: undefined });
    expect(screen.getByRole('link', { name: 'Informatique' })).toBeInTheDocument();
  });

  it('shows a placeholder when the profile has no video yet', () => {
    renderCard(baseProfile);
    expect(screen.getByText('Aucune vidéo pour le moment')).toBeInTheDocument();
    expect(document.querySelector('iframe, video')).toBeNull();
  });

  it('renders the primary video via VideoEmbed when one exists', () => {
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
        },
      ],
    });
    expect(screen.getByTitle('Vidéo de présentation')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    );
  });

  it('shows the certification status', () => {
    renderCard({ ...baseProfile, certificationStatus: 'COMPLETED', certificationBadge: 'Certifié JEB' });
    expect(screen.getByRole('status')).toHaveTextContent('Certifié JEB');
  });
});
