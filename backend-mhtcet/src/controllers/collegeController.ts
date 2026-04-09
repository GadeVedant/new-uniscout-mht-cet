import { Request, Response } from 'express';
import { dataService } from '../services/dataService.js';
import type { CutoffHistoryEntry } from '../types/index.js';

/**
 * GET /api/colleges/:collegeCode/cutoff-history
 * Query params: branch, category, capRound
 */
export const getCutoffHistory = (req: Request, res: Response): void => {
  const rawCode = req.params.collegeCode;
  const collegeCode = (Array.isArray(rawCode) ? rawCode[0] : rawCode).replace(/^0+/, '') || rawCode;
  const { branch, category, capRound } = req.query as Record<string, string | undefined>;

  // Validate required query params
  const missing: string[] = [];
  if (!branch) missing.push('branch');
  if (!category) missing.push('category');
  if (!capRound) missing.push('capRound');

  if (missing.length > 0) {
    res.status(400).json({
      success: false,
      error: `Missing required query parameters: ${missing.join(', ')}`,
    });
    return;
  }

  const colleges = dataService.getAllColleges();

  // Filter by collegeCode, branchName, category — ignore capRound for history
  // (different years may have different round naming conventions)
  const matches = colleges.filter(
    (c) =>
      c.collegeCode === collegeCode &&
      c.branchName.toLowerCase() === (branch as string).toLowerCase() &&
      c.category.toLowerCase() === (category as string).toLowerCase(),
  );

  // Deduplicate by year — keep lowest cutoffPercentile per year (most competitive/accurate)
  const byYear = new Map<number, number>();
  for (const c of matches) {
    const year = parseInt(c.year, 10);
    if (isNaN(year)) continue;
    const existing = byYear.get(year);
    if (existing === undefined || c.cutoffPercentile < existing) {
      byYear.set(year, c.cutoffPercentile);
    }
  }

  // Sort ascending by year
  const data: CutoffHistoryEntry[] = Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, cutoffPercentile]) => ({ year, cutoffPercentile }));

  res.json({
    success: true,
    data,
    metadata: { dataVersion: dataService.getStats().totalRecords },
  });
};
