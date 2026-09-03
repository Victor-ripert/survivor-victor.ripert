import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { api } from '../../src/services/api.js';
import { ProfilePage } from '../../src/pages/Profile/ProfilePage.js';

const fullProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  headline: 'Développeuse full-stack',
  bio: 'Passionnée de web depuis 5 ans.',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [{ id: 'skill-1', skillId: 'sk-1', skillName: 'TypeScript', level: 'ADVANCED' }],
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
  certificationStatus: 'COMPLETED',
  certificationBadge: 'Certifié JEB',
  moderationStatus: 'APPROVED',
};

/** Minimal fake matching what `axios.isAxiosError` checks, same helper as `profiles.test.ts`. */
function fakeAxiosError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profiles/:id" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders headline, bio, location, sector, skills, video and certification badge', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: fullProfile });

    renderAt('/profiles/profile-1');

    expect(screen.getByRole('status')).toHaveTextContent('Chargement');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument(),
    );

    expect(screen.getByText('Passionnée de web depuis 5 ans.')).toBeInTheDocument();
    expect(screen.getByText('Informatique · Lyon')).toBeInTheDocument();
    expect(screen.getByText('TypeScript', { exact: false })).toBeInTheDocument();
    expect(screen.getByTitle('Vidéo de présentation')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    );
    expect(screen.getByText('Certifié JEB')).toBeInTheDocument();
  });

  it('shows a real empty state for a 404, not a crash', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(404));

    renderAt('/profiles/does-not-exist');

    await waitFor(() =>
      expect(
        screen.getByText('Ce profil n’existe pas, ou n’est plus disponible.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Retour à la liste des profils' })).toHaveAttribute(
      'href',
      '/profiles',
    );
  });

  it('shows a distinct message when the request itself fails', async () => {
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(500));

    renderAt('/profiles/profile-1');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger ce profil');
  });
});
