import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { api } from '../../src/services/api.js';
import { clearToken, writeToken } from '../../src/services/auth-storage.js';
import { MyProfilePage } from '../../src/pages/Profile/MyProfilePage.js';

const existingProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  headline: 'Développeuse full-stack',
  bio: 'Une bio.',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
  videos: [],
  certificationStatus: 'PENDING',
  moderationStatus: 'PENDING',
};

function fakeAxiosError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MyProfilePage />
    </MemoryRouter>,
  );
}

describe('MyProfilePage', () => {
  afterEach(() => {
    clearToken();
    jest.restoreAllMocks();
  });

  it('prompts login instead of fetching anything when there is no token', () => {
    const getSpy = jest.spyOn(api, 'get');

    renderPage();

    expect(screen.getByText('Vous devez être connecté(e) pour modifier votre profil.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion');
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('starts with a blank form for a brand-new applicant (404 on /profiles/me)', async () => {
    writeToken('a-token');
    jest.spyOn(api, 'get').mockRejectedValue(fakeAxiosError(404));

    renderPage();

    await waitFor(() => expect(screen.getByLabelText('Localisation')).toHaveValue(''));
    expect(
      screen.getByText('Enregistrez d’abord votre profil ci-dessus pour pouvoir ajouter des vidéos.'),
    ).toBeInTheDocument();
  });

  it('pre-fills the form from the existing profile', async () => {
    writeToken('a-token');
    jest.spyOn(api, 'get').mockResolvedValue({ data: existingProfile });

    renderPage();

    await waitFor(() => expect(screen.getByLabelText('Localisation')).toHaveValue('Lyon'));
    expect(screen.getByLabelText('Titre')).toHaveValue('Développeuse full-stack');
    expect(screen.getByLabelText('Secteur')).toHaveValue('Informatique');
  });

  it('shows a field error and does not submit when a required field is cleared', async () => {
    writeToken('a-token');
    jest.spyOn(api, 'get').mockResolvedValue({ data: existingProfile });
    const postSpy = jest.spyOn(api, 'post');

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Localisation')).toHaveValue('Lyon'));

    fireEvent.change(screen.getByLabelText('Localisation'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Localisation requise')).toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('submits the form to POST /profiles/me and shows a confirmation', async () => {
    writeToken('a-token');
    jest.spyOn(api, 'get').mockResolvedValue({ data: existingProfile });
    jest
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { ...existingProfile, headline: 'Nouveau titre' } });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Localisation')).toHaveValue('Lyon'));

    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Nouveau titre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Profil enregistré.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/profiles/me', {
      headline: 'Nouveau titre',
      bio: 'Une bio.',
      location: 'Lyon',
      sector: 'Informatique',
    });
  });

  it('adds a video and shows it in the list', async () => {
    writeToken('a-token');
    jest.spyOn(api, 'get').mockResolvedValue({ data: existingProfile });
    jest.spyOn(api, 'post').mockResolvedValue({
      data: {
        id: 'video-1',
        profileId: 'profile-1',
        title: 'Ma présentation',
        type: 'EXTERNAL_LINK',
        url: 'https://www.youtube.com/embed/abc123',
        moderationStatus: 'PENDING',
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Localisation')).toHaveValue('Lyon'));

    fireEvent.change(screen.getByLabelText('Titre de la vidéo'), { target: { value: 'Ma présentation' } });
    fireEvent.change(screen.getByLabelText('Lien YouTube ou Vimeo'), {
      target: { value: 'https://www.youtube.com/embed/abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la vidéo' }));

    await waitFor(() =>
      expect(screen.getByTitle('Vidéo de présentation')).toHaveAttribute(
        'src',
        'https://www.youtube.com/embed/abc123',
      ),
    );
    expect(api.post).toHaveBeenLastCalledWith('/profiles/profile-1/videos', {
      title: 'Ma présentation',
      url: 'https://www.youtube.com/embed/abc123',
      type: 'EXTERNAL_LINK',
    });
  });

  it('deletes a video and removes it from the list', async () => {
    writeToken('a-token');
    const profileWithVideo: Profile = {
      ...existingProfile,
      videos: [
        {
          id: 'video-1',
          profileId: 'profile-1',
          title: 'Ma présentation',
          type: 'EXTERNAL_LINK',
          url: 'https://www.youtube.com/embed/abc123',
          moderationStatus: 'PENDING',
        },
      ],
    };
    jest.spyOn(api, 'get').mockResolvedValue({ data: profileWithVideo });
    jest.spyOn(api, 'delete').mockResolvedValue({ data: undefined });

    renderPage();
    await waitFor(() => expect(screen.getByTitle('Vidéo de présentation')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(screen.queryByTitle('Vidéo de présentation')).not.toBeInTheDocument());
    expect(api.delete).toHaveBeenCalledWith('/videos/video-1');
  });
});
