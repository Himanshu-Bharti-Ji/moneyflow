import { api } from '../../lib/api';
import type { ReportData } from '../../types';

export const reportsApi = {
  get: (startDate: string, endDate: string) =>
    api.get<ReportData>('/reports', { params: { startDate, endDate } }).then((r) => r.data),
};
