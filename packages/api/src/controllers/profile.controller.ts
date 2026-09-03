import type { Request, Response } from 'express';
import * as profileService from '../services/profile.service.js';
import { currentUser } from '../utils/current-user.js';
import { parseId } from '../validators/common.js';
import { addSkillSchema, feedQuerySchema, upsertProfileSchema } from '../validators/profile.js';

// Services throw HttpError and Zod throws ZodError; both become the uniform
// error body in middleware/error-handler.ts, so handlers only describe the
// success path.

/** `GET /profiles` — the public, paginated feed. */
export const listProfiles = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await profileService.getFeed(feedQuerySchema.parse(req.query)));
};

/** `GET /profiles/:id` — public; `optionalAuth` populates `req.user` so the
 *  owner can preview their own not-yet-approved profile. */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await profileService.getPublicProfile(parseId(req.params.id), req.user?.id));
};

/** `GET /profiles/me` — applicant only. */
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await profileService.getOwnProfile(currentUser(req).id));
};

/** `POST /profiles/me` — applicant only, create-or-update. */
export const upsertMyProfile = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(
      await profileService.upsertOwnProfile(
        currentUser(req).id,
        upsertProfileSchema.parse(req.body),
      ),
    );
};

/** `POST /profiles/me/skills` — tag a skill, or update its level. */
export const addMySkill = async (req: Request, res: Response): Promise<void> => {
  res
    .status(200)
    .json(await profileService.addSkill(currentUser(req).id, addSkillSchema.parse(req.body)));
};

/** `DELETE /profiles/me/skills/:skillId`. */
export const removeMySkill = async (req: Request, res: Response): Promise<void> => {
  await profileService.removeSkill(currentUser(req).id, parseId(req.params.skillId));
  res.status(204).send();
};
