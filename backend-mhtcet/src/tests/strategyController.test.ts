/**
 * Unit tests for StrategyController.
 *
 * Feature: cap-round2-strategy
 * Task: 3.2
 * Requirements: 6.3, 6.4, 6.5, 9.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/strategyService.js', () => ({
  strategyService: {
    computeMissedColleges: vi.fn().mockReturnValue([]),
    computeFreezeOrFloat: vi.fn().mockReturnValue({ recommendation: 'Freeze', reasoning: 'Test' }),
    computeRound2Opportunities: vi.fn().mockReturnValue([]),
  },
}));
vi.mock('../services/dataService.js', () => ({
  dataService: { getStats: vi.fn().mockReturnValue({ totalRecords: 100 }) },
}));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getRound2Strategy } from '../controllers/strategyController.js';
import { strategyService } from '../services/strategyService.js';
import { dataService } from '../services/dataService.js';

function makeReq(body: Record<string, unknown>): Request {
  return { body } as unknown as Request;
}
function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

describe('StrategyController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(strategyService.computeMissedColleges).mockReturnValue([]);
    vi.mocked(strategyService.computeFreezeOrFloat).mockReturnValue({ recommendation: 'Freeze', reasoning: 'Test' });
    vi.mocked(strategyService.computeRound2Opportunities).mockReturnValue([]);
    vi.mocked(dataService.getStats).mockReturnValue({ totalRecords: 100, totalColleges: 10, totalBranches: 5, isLoaded: true });
  });

  it('returns 400 when category is missing', () => {
    const { res, status, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 85, branch: 'computer engineering' }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error).toContain('category');
  });

  it('returns 400 when branch is missing', () => {
    const { res, status, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 85, category: 'OPEN' }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error).toContain('branch');
  });

  it('returns 422 when percentile is -1', () => {
    const { res, status } = makeRes();
    getRound2Strategy(makeReq({ percentile: -1, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when percentile is 101', () => {
    const { res, status } = makeRes();
    getRound2Strategy(makeReq({ percentile: 101, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 200 when percentile is 0', () => {
    const { res, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 0, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 200 when percentile is 100', () => {
    const { res, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 100, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(json.mock.calls[0][0].success).toBe(true);
  });

  it('treats absent colleges as empty array without error', () => {
    const { res, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 85, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(json.mock.calls[0][0].success).toBe(true);
  });

  it('returns 500 when service throws', () => {
    vi.mocked(strategyService.computeMissedColleges).mockImplementation(() => { throw new Error('boom'); });
    const { res, status } = makeRes();
    getRound2Strategy(makeReq({ percentile: 85, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('response includes dataVersion in metadata', () => {
    const { res, json } = makeRes();
    getRound2Strategy(makeReq({ percentile: 85, category: 'OPEN', branch: 'computer engineering' }), res);
    expect(json.mock.calls[0][0].metadata?.dataVersion).toBeDefined();
  });
});
