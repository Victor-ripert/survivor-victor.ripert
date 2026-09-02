import type { Request, Response } from 'express';
import { feedQuerySchema, upsertProfileSchema } from '../validators/profile.js';
import * as profileService from '../services/profile.service.js';

/** `GET /profiles` — the public, paginated, filterable feed. */
export const listProfiles = async (req: Request, res: Response): Promise<void> => {
  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid query',
      statusCode: 400,
    });
    return;
  }

  const { page, limit, sector, location, certificationStatus } = parsed.data;
  const result = await profileService.getFeed(
    { sector, location, certificationStatus },
    { page, limit },
  );
  res.status(200).json(result);
};

/**
 * `GET /profiles/:id` — public, but mounted behind `optionalAuth` (see
 * `routes/profiles.ts`) rather than no middleware at all, specifically so
 * `req.user` is populated when the caller happens to be the profile's own
 * owner previewing their own not-yet-approved profile.
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getProfileById(req.params.id as string, req.user?.id);
  if (!profile) {
    res.status(404).json({ error: 'not_found', message: 'Profile not found', statusCode: 404 });
    return;
  }
  res.status(200).json(profile);
};

/** `GET /profiles/me` — applicant only, always their own profile. */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getProfileByUserId(req.user!.id);
  if (!profile) {
    res.status(404).json({ error: 'not_found', message: 'Profile not found', statusCode: 404 });
    return;
  }
  res.status(200).json(profile);
};

/** `POST /profiles/me` — applicant only, create-or-update. */
export const upsertMyProfile = async (req: Request, res: Response): Promise<void> => {
  const parsed = upsertProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
      statusCode: 400,
    });
    return;
  }

  const profile = await profileService.upsertMyProfile(req.user!.id, parsed.data);
  res.status(200).json(profile);
};
