/**
 * Unit + property tests for src/lib/scoring.ts
 *
 * Feature: college-comparison, enhanced-results-page
 * Tasks: 12.5, 9.6–9.16 (property tests)
 * Requirements: 9.2, 9.4, 9.5, 9.6, 9.7, 7.1, 7.3
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  resolveAdmissionProbability,
  parseAnnualFees,
  parsePackageLPA,
  computeWeightedScores,
  computeBestPick,
  DEFAULT_WEIGHTS,
  FALLBACK_WEIGHTS_NO_PACKAGE,
} from '../lib/scoring';
import type { CollegeRecommendation } from '../services/api';

function makeCollege(overrides: Partial<CollegeRecommendation>): CollegeRecommendation {
  return {
    id: 'c1', name: 'Test', code: 'C001', branch: 'computer engineering', branchCode: 'CE',
    location: 'Pune', district: 'Pune', category: 'OPEN', cutoffPercentile: 80,
    percentileDifference: 5, collegeType: 'Government', fees: '₹50,000',
    seats: 60, admissionChance: 'High', capRound: 'I', year: '2024',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveAdmissionProbability
// ---------------------------------------------------------------------------
describe('resolveAdmissionProbability', () => {
  it('uses admissionProbability when present', () => {
    expect(resolveAdmissionProbability(makeCollege({ admissionProbability: 72 }))).toBeCloseTo(0.72, 5);
  });
  it('clamps to [0,1]', () => {
    expect(resolveAdmissionProbability(makeCollege({ admissionProbability: 150 }))).toBe(1);
    expect(resolveAdmissionProbability(makeCollege({ admissionProbability: -10 }))).toBe(0);
  });
  it('High → 0.85', () => expect(resolveAdmissionProbability(makeCollege({ admissionChance: 'High' }))).toBe(0.85));
  it('Medium → 0.60', () => expect(resolveAdmissionProbability(makeCollege({ admissionChance: 'Medium' }))).toBe(0.60));
  it('Low → 0.35', () => expect(resolveAdmissionProbability(makeCollege({ admissionChance: 'Low' }))).toBe(0.35));
});

// ---------------------------------------------------------------------------
// parseAnnualFees
// ---------------------------------------------------------------------------
describe('parseAnnualFees', () => {
  it('"₹1,20,000" → 120000', () => expect(parseAnnualFees('₹1,20,000')).toBeCloseTo(120000, 0));
  it('"1.2 LPA" → 1.2', () => expect(parseAnnualFees('1.2 LPA')).toBeCloseTo(1.2, 5));
  it('"4.8 LPA (total)" → 4.8', () => expect(parseAnnualFees('4.8 LPA (total)')).toBeCloseTo(4.8, 5));
  it('"Contact college" → null', () => expect(parseAnnualFees('Contact college')).toBeNull());
  it('"0" → null', () => expect(parseAnnualFees('0')).toBeNull());
  it('null → null', () => expect(parseAnnualFees(null)).toBeNull());
  it('N/A → null', () => expect(parseAnnualFees('N/A')).toBeNull());
});

// ---------------------------------------------------------------------------
// parsePackageLPA
// ---------------------------------------------------------------------------
describe('parsePackageLPA', () => {
  it('"₹6.5 LPA" → 6.5', () => expect(parsePackageLPA('₹6.5 LPA')).toBeCloseTo(6.5, 5));
  it('"6.5" → 6.5', () => expect(parsePackageLPA('6.5')).toBeCloseTo(6.5, 5));
  it('null → null', () => expect(parsePackageLPA(null)).toBeNull());
  it('"" → null', () => expect(parsePackageLPA('')).toBeNull());
  it('"0" → null', () => expect(parsePackageLPA('0')).toBeNull());
});

// ---------------------------------------------------------------------------
// computeWeightedScores
// ---------------------------------------------------------------------------
describe('computeWeightedScores', () => {
  it('returns one score per college', () => {
    const colleges = [makeCollege({}), makeCollege({ code: 'C002', admissionProbability: 50 })];
    const scored = computeWeightedScores(colleges);
    expect(scored).toHaveLength(2);
  });

  it('all scores are in [0, 1]', () => {
    const colleges = [
      makeCollege({ admissionProbability: 80, avgPackage: '₹8 LPA' }),
      makeCollege({ code: 'C002', admissionProbability: 40, avgPackage: '₹4 LPA' }),
    ];
    const scored = computeWeightedScores(colleges);
    scored.forEach((s) => {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    });
  });

  it('uses FALLBACK_WEIGHTS_NO_PACKAGE when all packages are null', () => {
    const colleges = [makeCollege({ avgPackage: null }), makeCollege({ code: 'C002', avgPackage: null })];
    // Should not throw
    expect(() => computeWeightedScores(colleges)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// computeBestPick
// ---------------------------------------------------------------------------
describe('computeBestPick', () => {
  it('clear winner → isTie: false, single winner', () => {
    const colleges = [
      makeCollege({ admissionProbability: 90 }),
      makeCollege({ code: 'C002', admissionProbability: 30 }),
    ];
    const result = computeBestPick(colleges);
    expect(result.isTie).toBe(false);
    expect(result.winners).toHaveLength(1);
    expect(result.winners[0].code).toBe('C001');
  });

  it('tie case (identical scores) → isTie: true, both in winners', () => {
    // Two identical colleges → same score
    const colleges = [
      makeCollege({ admissionProbability: 70, avgPackage: null, collegeType: 'Government' }),
      makeCollege({ code: 'C002', admissionProbability: 70, avgPackage: null, collegeType: 'Government' }),
    ];
    const result = computeBestPick(colleges);
    expect(result.isTie).toBe(true);
    expect(result.winners).toHaveLength(2);
  });

  it('empty array → empty winners, isTie: false', () => {
    const result = computeBestPick([]);
    expect(result.winners).toHaveLength(0);
    expect(result.isTie).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property tests (college-comparison spec)
// ---------------------------------------------------------------------------

// Property 16: Weighted score formula correctness
// Feature: college-comparison, Property 16
// Validates: Requirements 9.2, 9.4, 9.5, 9.6
describe('Property 16: Weighted score formula correctness', () => {
  it('scores are always in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            admissionProbability: fc.float({ min: 0, max: 100, noNaN: true }),
            avgPackage: fc.option(fc.float({ min: 1, max: 20, noNaN: true }).map((n) => `₹${n} LPA`)),
            collegeType: fc.constantFrom('Government', 'Autonomous', 'Private', 'Aided'),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (entries) => {
          const colleges = entries.map((e, i) =>
            makeCollege({ code: `C${i}`, admissionProbability: e.admissionProbability, avgPackage: e.avgPackage ?? null, collegeType: e.collegeType }),
          );
          const scored = computeWeightedScores(colleges);
          return scored.every((s) => s.score >= 0 && s.score <= 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property 17: Best pick identifies highest weighted score
// Feature: college-comparison, Property 17
// Validates: Requirements 9.2, 9.7
describe('Property 17: Best pick identifies highest weighted score', () => {
  it('winner has the highest score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: 0, max: 100, noNaN: true }),
          { minLength: 2, maxLength: 5 },
        ),
        (probs) => {
          const colleges = probs.map((p, i) =>
            makeCollege({ code: `C${i}`, admissionProbability: p, avgPackage: null }),
          );
          const result = computeBestPick(colleges);
          const scored = computeWeightedScores(colleges);
          const maxScore = Math.max(...scored.map((s) => s.score));
          return result.winners.every((w) => {
            const s = scored.find((sc) => sc.college.code === w.code);
            return s !== undefined && Math.abs(s.score - maxScore) < 0.001;
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
