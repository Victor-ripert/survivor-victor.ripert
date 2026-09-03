import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  CertificationAttempt,
  CertificationQuestionPublic,
  CertificationSubmitResult,
  NotificationPage,
  SubmitAnswerInput,
} from '@profils-actifs/shared';

const fetchQuestions = jest.fn<(signal?: AbortSignal) => Promise<CertificationQuestionPublic[]>>();
const startOrResumeAttempt =
  jest.fn<() => Promise<{ attempt: CertificationAttempt; resumed: boolean }>>();
const saveAnswer =
  jest.fn<
    (attemptId: string, input: SubmitAnswerInput) => Promise<CertificationAttempt['answers']>
  >();
const submitAttempt = jest.fn<(attemptId: string) => Promise<CertificationSubmitResult>>();
const fetchNotifications =
  jest.fn<(page: number, signal?: AbortSignal) => Promise<NotificationPage>>();

jest.unstable_mockModule('../../src/services/certification.js', () => ({
  fetchQuestions,
  startOrResumeAttempt,
  saveAnswer,
  submitAttempt,
}));
jest.unstable_mockModule('../../src/services/notifications.js', () => ({
  fetchNotifications,
  markNotificationRead: jest.fn(),
}));

const { CertificationPage } = await import('../../src/pages/Certification/CertificationPage.js');

const questions: CertificationQuestionPublic[] = [
  {
    id: 'q1',
    order: 1,
    type: 'MULTIPLE_CHOICE',
    text: 'Un collègue ne comprend pas une consigne. Que faites-vous ?',
    description: null,
    options: [
      { id: 'q1-a', text: 'Je répète plus fort', order: 1 },
      { id: 'q1-b', text: 'Je reformule avec un exemple', order: 2 },
    ],
  },
  {
    id: 'q2',
    order: 2,
    type: 'LIKERT_SCALE',
    text: 'Je respecte systématiquement les délais.',
    description: null,
    options: [],
  },
];

const attempt = (answers: CertificationAttempt['answers'] = []): CertificationAttempt => ({
  id: 'attempt-1',
  userId: 'user-1',
  status: 'IN_PROGRESS',
  score: null,
  startedAt: '2026-09-02T10:00:00.000Z',
  lastActivityAt: '2026-09-02T10:00:00.000Z',
  completedAt: null,
  answers,
});

const noNotifications: NotificationPage = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  unread: 0,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CertificationPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchQuestions.mockReset().mockResolvedValue(questions);
  fetchNotifications.mockReset().mockResolvedValue(noNotifications);
  startOrResumeAttempt.mockReset();
  saveAnswer.mockReset().mockResolvedValue([]);
  submitAttempt.mockReset();
});

describe('CertificationPage', () => {
  it('opens on an intro and only creates an attempt when the candidate starts', async () => {
    startOrResumeAttempt.mockResolvedValue({ attempt: attempt(), resumed: false });

    renderPage();

    const start = await screen.findByRole('button', {
      name: 'Commencer ou reprendre le questionnaire',
    });
    expect(startOrResumeAttempt).not.toHaveBeenCalled();

    fireEvent.click(start);

    expect(await screen.findByText(/Question 1/)).toBeInTheDocument();
    expect(startOrResumeAttempt).toHaveBeenCalledTimes(1);
  });

  // Brief §8.4: every answer is saved as it is given, nothing in the browser.
  it('saves each answer to the API as soon as it is given', async () => {
    startOrResumeAttempt.mockResolvedValue({ attempt: attempt(), resumed: false });

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Commencer ou reprendre le questionnaire' }),
    );
    await screen.findByText(/Question 1/);

    fireEvent.click(screen.getByLabelText('Je reformule avec un exemple'));

    await waitFor(() =>
      expect(saveAnswer).toHaveBeenCalledWith('attempt-1', { questionId: 'q1', optionId: 'q1-b' }),
    );
    expect(await screen.findByText('Réponse enregistrée')).toBeInTheDocument();
  });

  it('resumes on the first unanswered question with the saved answers restored', async () => {
    startOrResumeAttempt.mockResolvedValue({
      attempt: attempt([
        {
          id: 'a1',
          attemptId: 'attempt-1',
          questionId: 'q1',
          optionId: 'q1-b',
          textAnswer: null,
          numericAnswer: null,
        },
      ]),
      resumed: true,
    });

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Commencer ou reprendre le questionnaire' }),
    );

    expect(await screen.findByText(/Question 2/)).toBeInTheDocument();
    expect(screen.getByText(/Reprise de votre passation/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Précédente' }));
    expect(screen.getByLabelText('Je reformule avec un exemple')).toBeChecked();
  });

  it('submits from the last question and shows the score and badge', async () => {
    startOrResumeAttempt.mockResolvedValue({ attempt: attempt(), resumed: false });
    submitAttempt.mockResolvedValue({
      attempt: { ...attempt(), status: 'COMPLETED', score: 74 },
      score: 74,
      badge: {
        id: 'level-2',
        name: 'Certifié JEB Confirmé',
        minScore: 70,
        maxScore: 89,
        badgeIconUrl: '/badges/jeb-confirme.svg',
        order: 2,
      },
    });

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Commencer ou reprendre le questionnaire' }),
    );
    await screen.findByText(/Question 1/);

    fireEvent.click(screen.getByLabelText('Je reformule avec un exemple'));
    fireEvent.click(screen.getByRole('button', { name: 'Suivante' }));
    await screen.findByText(/Question 2/);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider mes réponses' }));

    expect(await screen.findByText('Certification obtenue')).toBeInTheDocument();
    expect(screen.getByText(/Certifié JEB Confirmé/)).toBeInTheDocument();
    expect(submitAttempt).toHaveBeenCalledWith('attempt-1');
  });

  // Agreed on 2 September: an edited question invalidates the session and
  // the candidate is told, in the page, not only by a notification.
  it('tells the candidate when the attempt was invalidated mid-session', async () => {
    startOrResumeAttempt.mockResolvedValue({ attempt: attempt(), resumed: false });
    const { ApiError } = await import('../../src/services/api.js');
    saveAnswer.mockRejectedValue(
      new ApiError(409, 'conflict', "Cette tentative n'est plus en cours"),
    );

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Commencer ou reprendre le questionnaire' }),
    );
    await screen.findByText(/Question 1/);

    fireEvent.click(screen.getByLabelText('Je reformule avec un exemple'));

    expect(
      await screen.findByText(/Le questionnaire a été modifié pendant votre passation/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Commencer ou reprendre le questionnaire' }),
    ).toBeInTheDocument();
  });
});
