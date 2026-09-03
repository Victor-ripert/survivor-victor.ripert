import type { Video, VideoInput } from '@profils-actifs/shared';
import { api } from './api.js';

/** `POST /profiles/{profileId}/videos` — applicant only, own profile. */
export const addVideo = async (profileId: string, input: VideoInput): Promise<Video> => {
  const response = await api.post<Video>(
    `/profiles/${encodeURIComponent(profileId)}/videos`,
    input,
  );
  return response.data;
};

/** `DELETE /videos/{videoId}` — withdraws the consent to publication. */
export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.delete(`/videos/${encodeURIComponent(videoId)}`);
};
