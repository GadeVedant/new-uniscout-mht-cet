/**
 * Unit + property tests for StrategyService.
 *
 * Feature: cap-round2-strategy
 * Tasks: 2.2, 2.4, 2.5, 2.7, 2.9, 2.10
 * Requirements: 3.1, 3.2, 4.1, 4.7, 5.7, 9.1, 9.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('../services/dataService.js', () => ({
  dataService: { getAllColleges: vi.fn() },
}));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { strategyService } from '../services/strategyService.js';
import { dataService } from '../services/dataService.js';
import type { CollegeRecommendation } from '../types/index.js';

type Row = { collegeCode: string; collegeName: string; branchName: string; category: string; capRound: string; year: string; cutoffPercentile: number; location?: string; district?: string; collegeType?: string; status?: string; branchCode?: string; fees?: number; intake?: number };

function row(o: Partial<Row>): Row {
  return { collegeCode: 'C001', collegeName: 'Test College', branchName: 'computer engineering', category: 'OPEN', capRound: 'I', year: '2022', cutoffPercentile: 85, location: 'Pune', district: 'Pune', collegeType: 'Government', status: '', branchCode: 'CE', ...o };
}

function makeCollege(overrides: Partial<CollegeRecommendation>): CollegeRecommendation {
  return { id: 'c1', name: 'Test', code: 'C001', branch: 'computer engineering', branchCode: 'CE', location: 'Pune', district: 'Pune', category: 'OPEN', cutoffPercentile: 80, percentileDifference: 5, collegeType: 'Government', fees: '₹50,000', seats: 60, admissionChance: 'High', capRound: 'I', year: '2024', ...overrides };
}

// ---------------------------------------------------------------------------
// Task 2.10: Unit tests for StrategyService
// ---------------------------------------------------------------------------
describe('StrategyService.computeHistoricalAvgDelta', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null with only 1 year of paired data', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }),
    ] as any);
    expect(strategyService.computeHistoricalAvgDelta('C001', 'computer engineering', 'OPEN')).toBeNull();
  });

  it('returns correct mean with 2+ years of paired data', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }), // delta 4
      row({ capRound: 'I', year: '2023', cutoffPercentile: 86 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 80 }), // delta 6
    ] as any);
    const result = strategyService.computeHistoricalAvgDelta('C001', 'computer engineering', 'OPEN');
    expect(result).toBeCloseTo(5.0, 5);
  });
});

describe('StrategyService.computeMissedColleges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('excludes college when cutoff delta = 0 (not strictly above percentile)', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 81 }),
      row({ capRound: 'I', year: '2023', cutoffPercentile: 85 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 81 }),
    ] as any);
    const result = strategyService.computeMissedColleges(85, 'OPEN', 'computer engineering');
    expect(result).toHaveLength(0);
  });

  it('includes college when cutoff delta = 8 (boundary)', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 88 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 84 }),
      row({ capRound: 'I', year: '2023', cutoffPercentile: 88 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 84 }),
    ] as any);
    const result = strategyService.computeMissedColleges(80, 'OPEN', 'computer engineering');
    expect(result.length).toBeGreaterThan(0);
  });

  it('excludes college when cutoff delta = 9 (above 8 limit)', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ capRound: 'I', year: '2022', cutoffPercentile: 89 }),
      row({ capRound: 'II', year: '2022', cutoffPercentile: 85 }),
      row({ capRound: 'I', year: '2023', cutoffPercentile: 89 }),
      row({ capRound: 'II', year: '2023', cutoffPercentile: 85 }),
    ] as any);
    const result = strategyService.computeMissedColleges(80, 'OPEN', 'computer engineering');
    expect(result).toHaveLength(0);
  });

  it('result length is at most 10', () => {
    const rows: any[] = [];
    for (let i = 1; i <= 15; i++) {
      const code = `C${String(i).padStart(3, '0')}`;
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2022', cutoffPercentile: 82 + (i % 5) }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2022', cutoffPercentile: 78 + (i % 5) }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2023', cutoffPercentile: 83 + (i % 5) }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2023', cutoffPercentile: 79 + (i % 5) }));
    }
    vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
    const result = strategyService.computeMissedColleges(80, 'OPEN', 'computer engineering');
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('StrategyService.computeFreezeOrFloat', () => {
  it('returns Freeze with fallback reasoning when colleges array is empty', () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([]);
    const result = strategyService.computeFreezeOrFloat([], []);
    expect(result.recommendation).toBe('Freeze');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('uses admissionChance fallback when admissionBand absent', () => {
    const colleges = [makeCollege({ admissionBand: undefined, admissionChance: 'High' })];
    const result = strategyService.computeFreezeOrFloat(colleges, []);
    expect(result.recommendation).toBe('Freeze');
    expect(result.reasoning).toContain('High');
  });

  it('returns Float when a missedCollege has round2Probability >= 50', () => {
    const colleges = [makeCollege({ admissionBand: 'Moderate' })];
    const missed = [{
      collegeCode: 'C002', collegeName: 'Better College', branchName: 'computer engineering',
      category: 'OPEN', round1Cutoff: 84, expectedRound2Cutoff: 80, expectedDrop: 4, round2Probability: 65,
    }];
    const result = strategyService.computeFreezeOrFloat(colleges, missed);
    expect(result.recommendation).toBe('Float');
    expect(result.betterOption).toBeDefined();
  });
});

describe('StrategyService.computeRound2Opportunities', () => {
  it('result length is at most 20', () => {
    const rows: any[] = [];
    for (let i = 1; i <= 30; i++) {
      const code = `C${String(i).padStart(3, '0')}`;
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2022', cutoffPercentile: 80 }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2022', cutoffPercentile: 76 }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2023', cutoffPercentile: 81 }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2023', cutoffPercentile: 77 }));
    }
    vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
    const result = strategyService.computeRound2Opportunities('OPEN', 'computer engineering');
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('result is sorted by expectedDrop descending', () => {
    const rows: any[] = [];
    const drops = [5, 3, 7, 4];
    drops.forEach((drop, i) => {
      const code = `C${String(i + 1).padStart(3, '0')}`;
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2022', cutoffPercentile: 80 }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2022', cutoffPercentile: 80 - drop }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'I', year: '2023', cutoffPercentile: 81 }));
      rows.push(row({ collegeCode: code, collegeName: `College ${i}`, capRound: 'II', year: '2023', cutoffPercentile: 81 - drop }));
    });
    vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
    const result = strategyService.computeRound2Opportunities('OPEN', 'computer engineering');
    for (let i = 1; i < result.length; i++) {
      expect(result[i].expectedDrop).toBeLessThanOrEqual(result[i - 1].expectedDrop);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 1: Combinations with < 2 years of paired data return null
// Feature: cap-round2-strategy, Property 1
// Validates: Requirements 9.1
// ---------------------------------------------------------------------------
describe('Property 1: computeHistoricalAvgDelta minimum data requirement', () => {
  it('returns null when fewer than 2 paired years', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1 }),
        (pairedYears) => {
          const rows: any[] = [];
          for (let i = 0; i < pairedYears; i++) {
            rows.push(row({ capRound: 'I', year: String(2020 + i), cutoffPercentile: 85 }));
            rows.push(row({ capRound: 'II', year: String(2020 + i), cutoffPercentile: 81 }));
          }
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
          const result = strategyService.computeHistoricalAvgDelta('C001', 'computer engineering', 'OPEN');
          return result === null;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Missed college Round 1 cutoff delta is always in (0, 8] pts
// Feature: cap-round2-strategy, Property 2
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe('Property 2: Missed college filter bounds', () => {
  it('all returned missed colleges have R1 cutoff delta in (0, 8]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 95, noNaN: true }),
        (percentile) => {
          const rows: any[] = [];
          for (let i = 0; i < 5; i++) {
            const code = `C${String(i).padStart(3, '0')}`;
            const cutoff = percentile + (i - 2) * 3; // some above, some below, some in range
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2022', cutoffPercentile: cutoff }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2022', cutoffPercentile: cutoff - 4 }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2023', cutoffPercentile: cutoff }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2023', cutoffPercentile: cutoff - 4 }));
          }
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
          const result = strategyService.computeMissedColleges(percentile, 'OPEN', 'computer engineering');
          return result.every((m) => {
            const delta = m.round1Cutoff - percentile;
            return delta > 0 && delta <= 8;
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: round2Probability is always in [0, 100]
// Feature: cap-round2-strategy, Property 3
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe('Property 3: round2Probability bounds', () => {
  it('round2Probability is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 50, max: 95, noNaN: true }),
        (percentile) => {
          const rows: any[] = [];
          for (let i = 0; i < 3; i++) {
            const code = `C${String(i).padStart(3, '0')}`;
            const cutoff = percentile + 2 + i;
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2022', cutoffPercentile: cutoff }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2022', cutoffPercentile: cutoff - 4 }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2023', cutoffPercentile: cutoff }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2023', cutoffPercentile: cutoff - 4 }));
          }
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
          const result = strategyService.computeMissedColleges(percentile, 'OPEN', 'computer engineering');
          return result.every((m) => m.round2Probability >= 0 && m.round2Probability <= 100);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Float advice requires round2Probability >= 50
// Feature: cap-round2-strategy, Property 4
// Validates: Requirements 4.2, 4.3
// ---------------------------------------------------------------------------
describe('Property 4: Float advice requires round2Probability >= 50', () => {
  it('Float is only recommended when a missedCollege has round2Probability >= 50', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ round2Probability: fc.integer({ min: 0, max: 100 }) }),
          { minLength: 0, maxLength: 5 },
        ),
        (missedColleges) => {
          const colleges = [makeCollege({ admissionBand: 'Moderate' })];
          const missed = missedColleges.map((m, i) => ({
            collegeCode: `C${i}`, collegeName: `C${i}`, branchName: 'computer engineering',
            category: 'OPEN', round1Cutoff: 85, expectedRound2Cutoff: 81, expectedDrop: 4,
            round2Probability: m.round2Probability,
          }));
          const result = strategyService.computeFreezeOrFloat(colleges, missed);
          const hasHighProb = missed.some((m) => m.round2Probability >= 50);
          if (result.recommendation === 'Float') return hasHighProb;
          return true; // Freeze is always valid
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Round 2 Opportunities list is sorted by expectedDrop descending
// Feature: cap-round2-strategy, Property 5
// Validates: Requirements 5.3, 5.7
// ---------------------------------------------------------------------------
describe('Property 5: Round 2 Opportunities sorted by expectedDrop desc', () => {
  it('result is always sorted descending by expectedDrop', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            drop: fc.float({ min: 3, max: 10, noNaN: true }),
            idx: fc.integer({ min: 0, max: 99 }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        (entries) => {
          const rows: any[] = [];
          entries.forEach((e, i) => {
            const code = `C${String(i).padStart(3, '0')}`;
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2022', cutoffPercentile: 80 }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2022', cutoffPercentile: 80 - e.drop }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'I', year: '2023', cutoffPercentile: 81 }));
            rows.push(row({ collegeCode: code, collegeName: `C${i}`, capRound: 'II', year: '2023', cutoffPercentile: 81 - e.drop }));
          });
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows);
          const result = strategyService.computeRound2Opportunities('OPEN', 'computer engineering');
          for (let i = 1; i < result.length; i++) {
            if (result[i].expectedDrop > result[i - 1].expectedDrop) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
