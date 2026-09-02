import type { Video, VideoInput } from '@profils-actifs/shared';
import { api } from './api.js';

/**
 * `POST /profiles/{profileId}/videos`, applicant only (own profile). Only
 * `EXTERNAL_LINK` reaches this in practice today — see `MyProfilePage`,
 * which doesn't offer `UPLOAD` as a choice since the API route for it
 * still answers `501 not_implemented` (no `multer` wiring yet).
 */
export async function addVideo(profileId: string, input: VideoInput): Promise<Video> {
  const { data } = await api.post<Video>(`/profiles/${profileId}/videos`, input);
  return data;
}

/** `DELETE /videos/{videoId}`, applicant only (own profile). */
export async function deleteVideo(videoId: string): Promise<void> {
  await api.delete(`/videos/${videoId}`);
}
