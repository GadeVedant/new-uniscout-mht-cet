/**
 * FormFillingController
 * POST /api/form-filling/generate
 */
import { Request, Response } from 'express';
import { formFillingService } from '../services/formFillingService.js';
import { dataService } from '../services/dataService.js';
import logger from '../utils/logger.js';
import type { FormFillingRequest } from '../types/index.js';

export const generateFormFillingList = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<FormFillingRequest>;

    // Validate required fields
    const pct = parseFloat(String(body.percentile));
    if (isNaN(pct) || pct < 0 || pct > 100) {
      res.status(422).json({ success: false, error: 'percentile must be a number between 0 and 100' });
      return;
    }
    if (!body.category) {
      res.status(422).json({ success: false, error: 'Missing required field: category' });
      return;
    }
    if (!body.capRound) {
      res.status(422).json({ success: false, error: 'Missing required field: capRound' });
      return;
    }
    if (!Array.isArray(body.branchPreferences) || body.branchPreferences.length === 0) {
      res.status(400).json({ success: false, error: 'branchPreferences must be a non-empty array' });
      return;
    }

    // Validate optional fields
    if (body.budget !== undefined && body.budget !== null) {
      const bgt = Number(body.budget);
      if (isNaN(bgt) || bgt < 0) {
        res.status(422).json({ success: false, error: 'budget must be a non-negative number' });
        return;
      }
    }
    if (body.priorityMode !== undefined && body.priorityMode !== 'college' && body.priorityMode !== 'branch') {
      res.status(422).json({ success: false, error: "priorityMode must be 'college' or 'branch'" });
      return;
    }

    const request: FormFillingRequest = {
      percentile: pct,
      category: body.category,
      capRound: body.capRound,
      branchPreferences: body.branchPreferences,
      budget: body.budget,
      preferredDistricts: body.preferredDistricts ?? [],
      priorityMode: body.priorityMode ?? 'college',
    };

    const { response, mlUnavailable, budgetWarning, categoryFallback } = await formFillingService.generatePreferenceList(request);

    res.json({
      success: true,
      data: response,
      metadata: {
        dataVersion: dataService.getStats().totalRecords,
        ...(mlUnavailable ? { ml_unavailable: true } : {}),
        ...(budgetWarning ? { warning: 'Budget filter resulted in fewer than 5 colleges' } : {}),
        ...(categoryFallback ? { category_fallback: true } : {}),
      },
    });
  } catch (err) {
    logger.error(`FormFillingController error: ${err}`);
    res.status(500).json({ success: false, error: 'Failed to generate preference list' });
  }
};
