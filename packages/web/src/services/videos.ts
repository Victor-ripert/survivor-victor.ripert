import type { ExternalLinkVideoInput, UploadVideoInput, Video } from '@profils-actifs/shared';
import { api } from './api.js';

/** Builds the `multipart/form-data` body `middleware/video-upload.ts`
 *  expects: the same field names as the JSON `EXTERNAL_LINK` request, as
 *  text parts, plus `file`. */
const toUploadFormData = (input: UploadVideoInput, file: File): FormData => {
  const formData = new FormData();
  formData.append('type', input.type);
  formData.append('title', input.title);
  if (input.description) formData.append('description', input.description);
  if (input.duration !== undefined) formData.append('duration', String(input.duration));
  formData.append('consentAccepted', String(input.consentAccepted));
  formData.append('file', file);
  return formData;
};

/** `POST /profiles/{profileId}/videos` — applicant only, own profile.
 *  `type: 'UPLOAD'` requires the `File` the candidate picked; `axios` sets
 *  the multipart boundary itself once it sees the body is `FormData`. */
export function addVideo(profileId: string, input: ExternalLinkVideoInput): Promise<Video>;
export function addVideo(profileId: string, input: UploadVideoInput, file: File): Promise<Video>;
export async function addVideo(
  profileId: string,
  input: ExternalLinkVideoInput | UploadVideoInput,
  file?: File,
): Promise<Video> {
  const body = input.type === 'UPLOAD' ? toUploadFormData(input, file as File) : input;
  const response = await api.post<Video>(`/profiles/${encodeURIComponent(profileId)}/videos`, body);
  return response.data;
}

/** `DELETE /videos/{videoId}` — withdraws the consent to publication. */
export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.delete(`/videos/${encodeURIComponent(videoId)}`);
};
