/**
 * StrategyController
 * POST /api/strategy/round2
 *
 * Request body: { percentile: number, category: string, branch: string, colleges?: CollegeRecommendation[] }
 * Response: { success: true, data: Round2StrategyResponse, metadata: { dataVersion } }
 * Errors: 400 (missing fields), 422 (invalid percentile), 500 (unexpected)
 */
import { Request, Response } from 'express';
import { strategyService } from '../services/strategyService.js';
import { dataService } from '../services/dataService.js';
import logger from '../utils/logger.js';
import type { CollegeRecommendation } from '../types/index.js';

export const getRound2Strategy = (req: Request, res: Response): void => {
  try {
    const { percentile, category, branch, colleges } = req.body as {
      percentile: unknown;
      category: unknown;
      branch: unknown;
      colleges?: CollegeRecommendation[];
    };

    // Validate required fields
    const missing: string[] = [];
    if (category == null || category === '') missing.push('category');
    if (branch == null || branch === '') missing.push('branch');
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    // Validate percentile
    const pct = parseFloat(String(percentile));
    if (isNaN(pct) || pct < 0 || pct > 100) {
      res.status(422).json({ success: false, error: 'percentile must be a number between 0 and 100' });
      return;
    }

    const safeColleges: CollegeRecommendation[] = Array.isArray(colleges) ? colleges : [];

    const missedColleges = strategyService.computeMissedColleges(pct, String(category), String(branch));
    const freezeOrFloat = strategyService.computeFreezeOrFloat(safeColleges, missedColleges);
    const round2Opportunities = strategyService.computeRound2Opportunities(String(category), String(branch));

    res.json({
      success: true,
      data: { missedColleges, freezeOrFloat, round2Opportunities },
      metadata: { dataVersion: dataService.getStats().totalRecords },
    });
  } catch (err) {
    logger.error(`StrategyController error: ${err}`);
    res.status(500).json({ success: false, error: 'Failed to compute Round 2 strategy' });
  }
};
