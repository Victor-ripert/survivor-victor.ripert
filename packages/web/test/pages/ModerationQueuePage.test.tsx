import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';
import type { Profile } from '@profils-actifs/shared';
import { api } from '../../src/services/api.js';
import { clearToken, setToken } from '../../src/utils/authStorage.js';
import { ModerationQueuePage } from '../../src/pages/Admin/ModerationQueuePage.js';

function makeToken(payload: unknown): string {
  const base64url = (value: unknown): string =>
    Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url(payload)}.fake-signature`;
}

const adminToken = makeToken({ id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
const applicantToken = makeToken({ id: 'user-1', email: 'user@example.com', role: 'APPLICANT' });

const pendingProfile: Profile = {
  id: 'profile-1',
  userId: 'user-1',
  headline: 'Développeuse full-stack',
  bio: 'Une bio.',
  location: 'Lyon',
  sector: 'Informatique',
  skills: [],
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
  certificationStatus: 'PENDING',
  moderationStatus: 'PENDING',
};

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ModerationQueuePage />
    </MemoryRouter>,
  );
}

describe('ModerationQueuePage', () => {
  afterEach(() => {
    clearToken();
    jest.restoreAllMocks();
  });

  it('prompts login instead of fetching when there is no token', () => {
    const getSpy = jest.spyOn(api, 'get');

    renderPage();

    expect(
      screen.getByText('Vous devez être connecté(e) en tant qu’administrateur pour accéder à cette page.'),
    ).toBeInTheDocument();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('blocks a non-admin token without fetching, as a frontend-only defense in depth', () => {
    setToken(applicantToken);
    const getSpy = jest.spyOn(api, 'get');

    renderPage();

    expect(screen.getByText('Cette page est réservée aux administrateurs.')).toBeInTheDocument();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('lists pending profiles with their video, for an admin', async () => {
    setToken(adminToken);
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [pendingProfile], pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument(),
    );
    expect(screen.getByTitle('Vidéo de présentation')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    );
    expect(api.get).toHaveBeenCalledWith('/admin/moderation/profiles', { params: { page: 1, limit: 20 } });
  });

  it('approves a profile and removes it from the queue', async () => {
    setToken(adminToken);
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [pendingProfile], pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
    });
    jest.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Profile moderated' } });

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approuver' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Développeuse full-stack' })).not.toBeInTheDocument(),
    );
    expect(api.post).toHaveBeenCalledWith('/admin/profiles/profile-1/moderate', {
      action: 'APPROVE',
      reason: undefined,
      notes: undefined,
    });
  });

  it('sends a trimmed reason when one is filled in', async () => {
    setToken(adminToken);
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [pendingProfile], pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
    });
    jest.spyOn(api, 'post').mockResolvedValue({ data: { message: 'Profile moderated' } });

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText('Motif (visible par le candidat)'), {
      target: { value: '  Vidéo hors sujet  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/profiles/profile-1/moderate', {
        action: 'REJECT',
        reason: 'Vidéo hors sujet',
        notes: undefined,
      }),
    );
  });

  it('shows an error and keeps the card when the moderation action fails', async () => {
    setToken(adminToken);
    jest.spyOn(api, 'get').mockResolvedValue({
      data: { data: [pendingProfile], pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
    });
    jest.spyOn(api, 'post').mockRejectedValue(new Error('network down'));

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approuver' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Développeuse full-stack' })).toBeInTheDocument();
  });
});
