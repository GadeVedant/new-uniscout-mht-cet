/**
 * Unit + property tests for CutoffTrendService.
 *
 * Feature: enhanced-results-page
 * Tasks: 5.2, 5.3, 5.4
 * Requirements: 2.2, 2.3, 6.2, 6.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('../services/dataService.js', () => ({
  dataService: {
    getAllColleges: vi.fn(),
    getAllYearsData: vi.fn(),
  },
}));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { cutoffTrendService } from '../services/cutoffTrendService.js';
import { dataService } from '../services/dataService.js';

type CollegeRow = {
  collegeCode: string; branchName: string; category: string;
  capRound: string; year: string; cutoffPercentile: number;
  collegeName?: string; location?: string; district?: string;
  collegeType?: string; status?: string; branchCode?: string;
  fees?: number; intake?: number;
};

function row(overrides: Partial<CollegeRow>): CollegeRow {
  return {
    collegeCode: 'C001', branchName: 'computer engineering', category: 'OPEN',
    capRound: 'I', year: '2022', cutoffPercentile: 80,
    collegeName: 'Test', location: 'Pune', district: 'Pune',
    collegeType: 'Government', status: '', branchCode: 'CE',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Task 5.4: Unit tests for CutoffTrendService
// ---------------------------------------------------------------------------
describe('CutoffTrendService unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mirror getAllYearsData to getAllColleges so tests that mock getAllColleges
    // work transparently — the service now calls getAllYearsData().
    vi.mocked(dataService.getAllYearsData).mockImplementation(
      () => vi.mocked(dataService.getAllColleges).getMockImplementation()?.() ?? [],
    );
  });

  it('returns "rising" when latest cutoff > prior by > 1.0', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ year: '2022', cutoffPercentile: 80 }),
      row({ year: '2023', cutoffPercentile: 81 }),
      row({ year: '2024', cutoffPercentile: 83 }), // delta = 3 > 1
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.cutoffTrend).toBe('rising');
  });

  it('returns "falling" when latest cutoff < prior by > 1.0', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ year: '2022', cutoffPercentile: 85 }),
      row({ year: '2023', cutoffPercentile: 84 }),
      row({ year: '2024', cutoffPercentile: 82 }), // delta = -3 < -1
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.cutoffTrend).toBe('falling');
  });

  it('returns "stable" when delta within ±1.0', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ year: '2022', cutoffPercentile: 80 }),
      row({ year: '2023', cutoffPercentile: 80.5 }),
      row({ year: '2024', cutoffPercentile: 80.8 }), // delta = 0.8 within ±1
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.cutoffTrend).toBe('stable');
  });

  it('returns "stable" when only 1 year of data', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ year: '2024', cutoffPercentile: 80 }),
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.cutoffTrend).toBe('stable');
  });

  it('round2Opportunity true when avg R1-R2 delta >= 3.0 with 2+ paired years', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }), // delta = 4
      row({ capRound: 'I', year: '2023', cutoffPercentile: 86 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 82 }), // delta = 4
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.round2Opportunity).toBe(true);
    expect(result.round2Delta).toBeCloseTo(4.0, 1);
  });

  it('round2Opportunity false when avg R1-R2 delta < 3.0', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 82 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }), // delta = 1
      row({ capRound: 'I', year: '2023', cutoffPercentile: 83 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 82 }), // delta = 1
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.round2Opportunity).toBe(false);
  });

  it('round2Delta is null when fewer than 2 paired years', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }), // only 1 paired year
    ] as any);
    const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
    expect(result.round2Delta).toBeNull();
    expect(result.round2Opportunity).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 6: Trend computation threshold
// Feature: enhanced-results-page, Property 6
// Validates: Requirements 2.2, 2.3
// ---------------------------------------------------------------------------
describe('Property 6: Trend computation threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataService.getAllYearsData).mockImplementation(
      () => vi.mocked(dataService.getAllColleges).getMockImplementation()?.() ?? [],
    );
  });
  it('delta > 1.0 → rising; delta < -1.0 → falling; else stable', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 70, max: 90, noNaN: true }),
        fc.float({ min: -10, max: 10, noNaN: true }),
        (base, delta) => {
          const prior = base;
          const latest = base + delta;
          vi.mocked(dataService.getAllColleges).mockReturnValue([
            row({ year: '2022', cutoffPercentile: prior }),
            row({ year: '2024', cutoffPercentile: latest }),
          ] as any);
          const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');
          if (delta > 1.0) return result.cutoffTrend === 'rising';
          if (delta < -1.0) return result.cutoffTrend === 'falling';
          return result.cutoffTrend === 'stable';
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Round 2 threshold computation
// Feature: enhanced-results-page, Property 13
// Validates: Requirements 6.2, 6.3
// ---------------------------------------------------------------------------
describe('Property 13: Round 2 threshold computation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataService.getAllYearsData).mockImplementation(
      () => vi.mocked(dataService.getAllColleges).getMockImplementation()?.() ?? [],
    );
  });
  it('round2Opportunity true iff avg delta >= 3.0 with >= 2 distinct paired years', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            year: fc.integer({ min: 2020, max: 2025 }),
            r1: fc.float({ min: 70, max: 95, noNaN: true }),
            r2: fc.float({ min: 65, max: 95, noNaN: true }),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (pairs) => {
          const rows: any[] = [];
          for (const p of pairs) {
            rows.push(row({ capRound: 'I', year: String(p.year), cutoffPercentile: p.r1 }));
            rows.push(row({ capRound: 'II', year: String(p.year), cutoffPercentile: p.r2 }));
          }
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
          const result = cutoffTrendService.getTrend('C001', 'computer engineering', 'OPEN', 'I');

          // Deduplicate by year (service keeps last value per year for each round)
          const r1ByYear = new Map<number, number>();
          const r2ByYear = new Map<number, number>();
          for (const p of pairs) {
            r1ByYear.set(p.year, p.r1);
            r2ByYear.set(p.year, p.r2);
          }
          const deltas: number[] = [];
          for (const [yr, r1] of r1ByYear) {
            const r2 = r2ByYear.get(yr);
            if (r2 !== undefined) deltas.push(r1 - r2);
          }

          if (deltas.length < 2) {
            return result.round2Opportunity === false && result.round2Delta === null;
          }
          const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
          return result.round2Opportunity === (avg >= 3.0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
