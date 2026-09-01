import type { Request, Response } from 'express';
import { getAdminDashboard } from '../services/dashboard.service.js';

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getAdminDashboard());
};
