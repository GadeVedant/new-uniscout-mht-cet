/**
 * Unit tests for FormFillingController.
 *
 * Feature: smart-form-filling
 * Task: 15.1
 * Requirements: 3.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/formFillingService.js', () => ({
  formFillingService: {
    generatePreferenceList: vi.fn().mockResolvedValue({
      response: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: true, budgetWarning: false },
      mlUnavailable: false,
      budgetWarning: false,
    }),
  },
}));
vi.mock('../services/dataService.js', () => ({
  dataService: { getStats: vi.fn().mockReturnValue({ totalRecords: 100 }) },
}));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { generateFormFillingList } from '../controllers/formFillingController.js';

function makeReq(body: Record<string, unknown>): Request {
  return { body } as unknown as Request;
}
function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

const VALID_BODY = {
  percentile: 85,
  category: 'Open',
  capRound: 'I',
  branchPreferences: ['computer engineering'],
  preferredDistricts: [],
  priorityMode: 'college',
};

describe('FormFillingController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with correct response shape for valid request', async () => {
    const { res, json } = makeRes();
    await generateFormFillingList(makeReq(VALID_BODY), res);
    expect(json.mock.calls[0][0].success).toBe(true);
    expect(json.mock.calls[0][0].data).toBeDefined();
  });

  it('returns 422 when percentile is missing', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, percentile: undefined }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when percentile is out of range (< 0)', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, percentile: -1 }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when percentile is out of range (> 100)', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, percentile: 101 }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when category is missing', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, category: undefined }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when capRound is missing', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, capRound: undefined }), res);
    expect(status).toHaveBeenCalledWith(422);
  });

  it('returns 400 when branchPreferences is empty array', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, branchPreferences: [] }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when branchPreferences is not an array', async () => {
    const { res, status } = makeRes();
    await generateFormFillingList(makeReq({ ...VALID_BODY, branchPreferences: 'computer engineering' }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('includes dataVersion in metadata', async () => {
    const { res, json } = makeRes();
    await generateFormFillingList(makeReq(VALID_BODY), res);
    expect(json.mock.calls[0][0].metadata?.dataVersion).toBeDefined();
  });

  it('includes ml_unavailable in metadata when ML fallback used', async () => {
    const { formFillingService } = await import('../services/formFillingService.js');
    vi.mocked(formFillingService.generatePreferenceList).mockResolvedValueOnce({
      response: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: false, budgetWarning: false },
      mlUnavailable: true,
      budgetWarning: false,
    });
    const { res, json } = makeRes();
    await generateFormFillingList(makeReq(VALID_BODY), res);
    expect(json.mock.calls[0][0].metadata?.ml_unavailable).toBe(true);
  });
});
