import type {
  CertificationAttempt,
  CertificationQuestion,
  CertificationQuestionPatch,
  CertificationQuestionPublic,
  CertificationSubmitResult,
  SubmitAnswerInput,
} from '@profils-actifs/shared';
import { api } from './api.js';

export const fetchQuestions = async (
  signal?: AbortSignal,
): Promise<CertificationQuestionPublic[]> => {
  const response = await api.get<CertificationQuestionPublic[]>('/certification/questions', {
    signal,
  });
  return response.data;
};

export interface AttemptSession {
  attempt: CertificationAttempt;
  /** The API answers 200 when it hands back an attempt already in progress
   *  and 201 when it opened a new one — that is how "resume" is detected. */
  resumed: boolean;
}

/** Starts a new attempt or resumes the open one — the API decides. */
export const startOrResumeAttempt = async (): Promise<AttemptSession> => {
  const response = await api.post<CertificationAttempt>('/certification/attempt');
  return { attempt: response.data, resumed: response.status === 200 };
};

export const fetchAttempt = async (
  attemptId: string,
  signal?: AbortSignal,
): Promise<CertificationAttempt> => {
  const response = await api.get<CertificationAttempt>(
    `/certification/attempt/${encodeURIComponent(attemptId)}`,
    { signal },
  );
  return response.data;
};

export const saveAnswer = async (
  attemptId: string,
  input: SubmitAnswerInput,
): Promise<CertificationAttempt['answers']> => {
  const response = await api.post<CertificationAttempt['answers']>(
    `/certification/attempt/${encodeURIComponent(attemptId)}/answer`,
    input,
  );
  return response.data;
};

export const submitAttempt = async (attemptId: string): Promise<CertificationSubmitResult> => {
  const response = await api.post<CertificationSubmitResult>(
    `/certification/attempt/${encodeURIComponent(attemptId)}/submit`,
  );
  return response.data;
};

/** Admin: every question, inactive ones and scoring included. */
export const fetchAdminQuestions = async (
  signal?: AbortSignal,
): Promise<CertificationQuestion[]> => {
  const response = await api.get<CertificationQuestion[]>('/admin/certification/questions', {
    signal,
  });
  return response.data;
};

export const updateQuestion = async (
  questionId: string,
  patch: CertificationQuestionPatch,
): Promise<CertificationQuestion> => {
  const response = await api.patch<CertificationQuestion>(
    `/admin/certification/questions/${encodeURIComponent(questionId)}`,
    patch,
  );
  return response.data;
};
