import type { Request, Response } from 'express';
import { listSkills as listSkillCatalog } from '../services/skills.service.js';

/** `GET /skills` — the shared catalog, public: names only, nothing about who holds them. */
export const listSkills = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await listSkillCatalog());
};
