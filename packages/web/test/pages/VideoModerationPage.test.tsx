import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  PaginatedResponse,
  VideoModerationInput,
  VideoModerationItem,
} from '@profils-actifs/shared';
import { ApiError } from '../../src/services/api.js';

const fetchVideoModerationQueue =
  jest.fn<
    (query: unknown, signal?: AbortSignal) => Promise<PaginatedResponse<VideoModerationItem>>
  >();
const moderateVideo =
  jest.fn<(videoId: string, decision: VideoModerationInput) => Promise<VideoModerationItem>>();

jest.unstable_mockModule('../../src/services/admin.js', () => ({
  fetchVideoModerationQueue,
  moderateVideo,
}));

const { VideoModerationPage } = await import('../../src/pages/Admin/VideoModerationPage.js');

const video = (overrides: Partial<VideoModerationItem> = {}): VideoModerationItem => ({
  id: 'video-1',
  title: 'Présentation en 90 secondes',
  description: null,
  url: 'https://www.youtube.com/embed/abc123',
  durationSeconds: 92,
  moderationStatus: 'PENDING',
  submittedAt: '2026-09-01T10:00:00.000Z',
  applicant: {
    profileId: 'profile-1',
    firstName: 'Amina',
    lastName: 'Berthier',
    headline: 'Développeuse front-end',
  },
  lastDecision: null,
  ...overrides,
});

const page = (items: VideoModerationItem[]): PaginatedResponse<VideoModerationItem> => ({
  data: items,
  pagination: { page: 1, limit: 20, total: items.length, pages: items.length > 0 ? 1 : 0 },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <VideoModerationPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchVideoModerationQueue.mockReset();
  moderateVideo.mockReset();
});

describe('VideoModerationPage', () => {
  it('opens on the queue of videos awaiting a decision', async () => {
    fetchVideoModerationQueue.mockResolvedValue(page([video()]));

    renderPage();

    await screen.findByRole('heading', { name: 'Présentation en 90 secondes' });
    expect(fetchVideoModerationQueue).toHaveBeenCalledWith(
      { status: 'PENDING', page: 1 },
      expect.anything(),
    );
  });

  // §7.9.2: "a video that disappears without explanation is litigation
  // starting". The reason is mandatory in both directions, refusal and
  // approval alike, and the buttons stay out of reach until there is one.
  it('refuses both decisions until a reason is written', async () => {
    fetchVideoModerationQueue.mockResolvedValue(page([video()]));

    renderPage();
    await screen.findByRole('heading', { name: 'Présentation en 90 secondes' });

    expect(screen.getByRole('button', { name: 'Valider la vidéo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refuser la vidéo' })).toBeDisabled();

    const motif = screen.getByLabelText(/Motif de la décision/);

    fireEvent.change(motif, { target: { value: 'court' } });
    expect(screen.getByRole('button', { name: 'Refuser la vidéo' })).toBeDisabled();

    fireEvent.change(motif, { target: { value: 'un motif assez long pour être utile' } });
    expect(screen.getByRole('button', { name: 'Refuser la vidéo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Valider la vidéo' })).toBeEnabled();
  });

  it('sends the decision with its reason and reloads the queue', async () => {
    fetchVideoModerationQueue.mockResolvedValue(page([video()]));
    moderateVideo.mockResolvedValue(video({ moderationStatus: 'REJECTED' }));

    renderPage();
    await screen.findByRole('heading', { name: 'Présentation en 90 secondes' });

    fireEvent.change(screen.getByLabelText(/Motif de la décision/), {
      target: { value: 'Contenu sans rapport avec une candidature' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refuser la vidéo' }));

    await waitFor(() =>
      expect(moderateVideo).toHaveBeenCalledWith('video-1', {
        action: 'REJECT',
        reason: 'Contenu sans rapport avec une candidature',
      }),
    );
    await waitFor(() => expect(fetchVideoModerationQueue).toHaveBeenCalledTimes(2));
  });

  it('names who decided and when, on a video already ruled on', async () => {
    fetchVideoModerationQueue.mockResolvedValue(
      page([
        video({
          moderationStatus: 'REJECTED',
          lastDecision: {
            action: 'REJECT',
            reason: 'Le visage n’apparaît pas',
            decidedAt: '2026-09-02T09:30:00.000Z',
            decidedBy: { id: 'admin-1', firstName: 'Awa', lastName: 'Traoré' },
          },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText(/Awa Traoré/)).toBeInTheDocument();
    expect(screen.getByText(/Le visage n’apparaît pas/)).toBeInTheDocument();
  });

  // The allowlist in utils/embed.ts is what keeps an attacker-controlled page
  // out of an authenticated admin frame.
  it('never frames an address outside the embed allowlist', async () => {
    fetchVideoModerationQueue.mockResolvedValue(
      page([video({ url: 'https://attaquant.example/embed/abc' })]),
    );

    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'Présentation en 90 secondes' });

    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/pas une intégration reconnue/);
  });

  it('shows the API error rather than an empty queue', async () => {
    fetchVideoModerationQueue.mockRejectedValue(
      new ApiError(404, 'not_found', 'Route inconnue : GET /api/admin/moderation/videos'),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Route inconnue');
  });
});
