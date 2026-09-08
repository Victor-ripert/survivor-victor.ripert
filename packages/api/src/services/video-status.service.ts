import { VideoType } from '@prisma/client';
import type { VideoProviderStatus } from '@profils-actifs/shared';
import { getVideoProvider } from './video-providers/index.js';
import type { VideoRow } from '../utils/mappers.js';

/**
 * Resolves the availability of the provider currently configured for
 * uploaded videos.
 *
 * External links are independent from VIDEO_PROVIDER: they are hosted by
 * YouTube/Vimeo and are therefore always considered ready here.
 *
 * The configured provider is deliberately used for the status check rather
 * than the provider stored on the row. This is what makes the A6 environment
 * switch observable on a real profile: switching VIDEO_PROVIDER to the
 * ministry placeholder makes uploaded videos enter degraded mode without
 * changing the database.
 */
export const getVideoProviderStatus = async (video: VideoRow): Promise<VideoProviderStatus> => {
  if (video.type === VideoType.EXTERNAL_LINK) return 'ready';

  const provider = getVideoProvider();
  const ref = video.providerRef ?? video.url;

  return provider.status(ref);
};

/**
 * Resolves all provider states concurrently while keeping the result keyed
 * by the database video id. Keeping this concern here prevents profile and
 * video services from duplicating provider-selection logic.
 */
export const getVideoProviderStatuses = async (
  videos: VideoRow[],
): Promise<Map<string, VideoProviderStatus>> => {
  const entries = await Promise.all(
    videos.map(async (video) => [video.id, await getVideoProviderStatus(video)] as const),
  );

  return new Map(entries);
};
