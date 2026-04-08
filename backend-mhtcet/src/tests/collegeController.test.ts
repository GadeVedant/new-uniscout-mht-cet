/**
 * Unit + property tests for getCutoffHistory controller.
 *
 * Feature: college-detail-page
 * Requirements: 9.2, 9.4, 9.5, 9.6, 9.7
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Request, Response } from 'express';

vi.mock('../services/dataService.js', () => ({
  dataService: {
    getAllColleges: vi.fn(),
    getStats: vi.fn().mockReturnValue({ totalRecords: 100 }),
  },
}));

vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getCutoffHistory } from '../controllers/collegeController.js';
import { dataService } from '../services/dataService.js';

const SAMPLE_COLLEGES = [
  { collegeCode: 'C001', branchName: 'computer engineering', category: 'OPEN', capRound: 'II', year: '2022', cutoffPercentile: 85.0 },
  { collegeCode: 'C001', branchName: 'computer engineering', category: 'OPEN', capRound: 'II', year: '2023', cutoffPercentile: 86.5 },
  { collegeCode: 'C001', branchName: 'computer engineering', category: 'OPEN', capRound: 'II', year: '2024', cutoffPercentile: 87.2 },
  // duplicate year — lower cutoff should be dropped
  { collegeCode: 'C001', branchName: 'computer engineering', category: 'OPEN', capRound: 'II', year: '2024', cutoffPercentile: 84.0 },
  // different college
  { collegeCode: 'C002', branchName: 'computer engineering', category: 'OPEN', capRound: 'II', year: '2022', cutoffPercentile: 80.0 },
];

function makeReq(params: Record<string, string>, query: Record<string, string>): Request {
  return { params, query } as unknown as Request;
}

function makeRes(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as unknown as Response;
  return { res, json, status };
}

describe('getCutoffHistory', () => {
  beforeEach(() => {
    vi.mocked(dataService.getAllColleges).mockReturnValue(SAMPLE_COLLEGES as any);
  });

  it('returns sorted ascending by year for valid request', () => {
    const req = makeReq({ collegeCode: 'C001' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
    const { res, json } = makeRes();
    getCutoffHistory(req, res);
    expect(json).toHaveBeenCalledOnce();
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(true);
    const years = body.data.map((e: any) => e.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('deduplicates years keeping highest cutoffPercentile', () => {
    const req = makeReq({ collegeCode: 'C001' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
    const { res, json } = makeRes();
    getCutoffHistory(req, res);
    const body = json.mock.calls[0][0];
    const entry2024 = body.data.find((e: any) => e.year === 2024);
    expect(entry2024.cutoffPercentile).toBe(87.2);
  });

  it('returns 3 entries for C001 (2022, 2023, 2024)', () => {
    const req = makeReq({ collegeCode: 'C001' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
    const { res, json } = makeRes();
    getCutoffHistory(req, res);
    const body = json.mock.calls[0][0];
    expect(body.data).toHaveLength(3);
  });

  it('returns HTTP 400 when branch is missing', () => {
    const req = makeReq({ collegeCode: 'C001' }, { category: 'OPEN', capRound: 'II' });
    const { res, status, json } = makeRes();
    getCutoffHistory(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error).toContain('branch');
  });

  it('returns HTTP 400 when category is missing', () => {
    const req = makeReq({ collegeCode: 'C001' }, { branch: 'computer engineering', capRound: 'II' });
    const { res, status, json } = makeRes();
    getCutoffHistory(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error).toContain('category');
  });

  it('lists all missing params in error message', () => {
    const req = makeReq({ collegeCode: 'C001' }, {});
    const { res, status, json } = makeRes();
    getCutoffHistory(req, res);
    expect(status).toHaveBeenCalledWith(400);
    const msg: string = json.mock.calls[0][0].error;
    expect(msg).toContain('branch');
    expect(msg).toContain('category');
    expect(msg).toContain('capRound');
  });

  it('returns HTTP 200 with empty array for unknown collegeCode', () => {
    const req = makeReq({ collegeCode: 'UNKNOWN' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
    const { res, json } = makeRes();
    getCutoffHistory(req, res);
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('returns HTTP 200 with empty array when no matching branch/category/capRound', () => {
    const req = makeReq({ collegeCode: 'C001' }, { branch: 'civil engineering', category: 'OPEN', capRound: 'II' });
    const { res, json } = makeRes();
    getCutoffHistory(req, res);
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Property 7: Cutoff history endpoint returns data sorted ascending by year
  // Feature: college-detail-page, Property 7
  // Validates: Requirements 9.2, 5.2
  // ---------------------------------------------------------------------------
  it('Property 7: result is always sorted ascending by year', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            year: fc.integer({ min: 2020, max: 2025 }).map(String),
            cutoffPercentile: fc.float({ min: 50, max: 99, noNaN: true }),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (records) => {
          const colleges = records.map((r) => ({
            collegeCode: 'TEST',
            branchName: 'computer engineering',
            category: 'OPEN',
            capRound: 'II',
            ...r,
          }));
          vi.mocked(dataService.getAllColleges).mockReturnValue(colleges as any);

          const req = makeReq({ collegeCode: 'TEST' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
          const { res, json } = makeRes();
          getCutoffHistory(req, res);

          const data: Array<{ year: number }> = json.mock.calls[0][0].data;
          for (let i = 1; i < data.length; i++) {
            if (data[i].year <= data[i - 1].year) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 8: Deduplication retains max cutoff per year
  // Feature: college-detail-page, Property 8
  // Validates: Requirements 9.7
  // ---------------------------------------------------------------------------
  it('Property 8: deduplication retains max cutoff per year', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            year: fc.integer({ min: 2020, max: 2025 }).map(String),
            cutoffPercentile: fc.float({ min: 50, max: 99, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (records) => {
          const colleges = records.map((r) => ({
            collegeCode: 'TEST',
            branchName: 'computer engineering',
            category: 'OPEN',
            capRound: 'II',
            ...r,
          }));
          vi.mocked(dataService.getAllColleges).mockReturnValue(colleges as any);

          const req = makeReq({ collegeCode: 'TEST' }, { branch: 'computer engineering', category: 'OPEN', capRound: 'II' });
          const { res, json } = makeRes();
          getCutoffHistory(req, res);

          const data: Array<{ year: number; cutoffPercentile: number }> = json.mock.calls[0][0].data;

          // For each returned year, verify it equals the max cutoff in the input
          for (const entry of data) {
            const maxForYear = Math.max(
              ...records
                .filter((r) => parseInt(r.year) === entry.year)
                .map((r) => r.cutoffPercentile),
            );
            if (Math.abs(entry.cutoffPercentile - maxForYear) > 0.001) return false;
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 9: Missing query parameters return HTTP 400
  // Feature: college-detail-page, Property 9
  // Validates: Requirements 9.5
  // ---------------------------------------------------------------------------
  it('Property 9: missing query params always return HTTP 400 listing missing names', () => {
    const allParams = { branch: 'computer engineering', category: 'OPEN', capRound: 'II' };
    fc.assert(
      fc.property(
        fc.subarray(['branch', 'category', 'capRound'] as const, { minLength: 1 }),
        (toRemove) => {
          const query = Object.fromEntries(
            Object.entries(allParams).filter(([k]) => !toRemove.includes(k as any)),
          );
          const req = makeReq({ collegeCode: 'C001' }, query);
          const { res, status, json } = makeRes();
          getCutoffHistory(req, res);

          if (status.mock.calls[0]?.[0] !== 400) return false;
          const msg: string = json.mock.calls[0][0].error ?? '';
          return toRemove.every((p) => msg.includes(p));
        },
      ),
      { numRuns: 100 },
    );
  });
});
