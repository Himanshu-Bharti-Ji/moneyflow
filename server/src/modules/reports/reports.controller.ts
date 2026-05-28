import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { getReportData } from './reports.service.js';

const uid = (r: Request) => (r as AuthRequest).userId;

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();

    // Default: current month
    const startStr = req.query.startDate as string | undefined;
    const endStr   = req.query.endDate   as string | undefined;

    const startDate = startStr
      ? new Date(startStr + 'T00:00:00.000Z')
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const endDate = endStr
      ? new Date(endStr + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    res.json(await getReportData(uid(req), startDate, endDate));
  } catch (err) { next(err); }
}
