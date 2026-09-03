import { Router } from 'express';
import { listSkills } from '../controllers/skills.controller.js';

export const skillsRouter = Router();

skillsRouter.get('/', listSkills);
