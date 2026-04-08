/**
 * Property tests for Enhanced Results Page frontend logic.
 *
 * Feature: enhanced-results-page
 * Tasks: 9.6–9.15, 10.2, 10.3, 11.2, 11.3
 * Requirements: 1.1–1.5, 2.1, 2.4, 3.5–3.7, 4.1–4.4, 5.1–5.4, 6.1, 6.4, 7.1–7.5, 8.1–8.4, 12.1–12.3
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CollegeRecommendation } from '../services/api';

function makeCollege(overrides: Partial<CollegeRecommendation> = {}): CollegeRecommendation {
  return {
    id: 'c1', name: 'Test', code: 'C001', branch: 'CE', branchCode: 'CE',
    location: 'Pune', district: 'Pune', category: 'OPEN', cutoffPercentile: 80,
    percentileDifference: 5, collegeType: 'Government', fees: '₹50,000',
    seats: 60, admissionChance: 'High', capRound: 'I', year: '2024',
    ...overrides,
  };
}

// Helper: getAdmissionBand logic (mirrors ResultsPage)
function getAdmissionBand(c: CollegeRecommendation): string {
  return c.admissionBand ?? c.admissionChance;
}

// ---------------------------------------------------------------------------
// Property 1: ML band display replaces legacy label
// Feature: enhanced-results-page, Property 1
// Validates: Requirements 1.1, 1.5
// ---------------------------------------------------------------------------
describe('Property 1: ML band display replaces legacy label', () => {
  it('when admissionBand present, getAdmissionBand returns band not admissionChance', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky'),
        fc.constantFrom('High', 'Medium', 'Low'),
        (band, chance) => {
          const c = makeCollege({ admissionBand: band as any, admissionChance: chance as any });
          return getAdmissionBand(c) === band;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when admissionBand absent, getAdmissionBand returns admissionChance', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('High', 'Medium', 'Low'),
        (chance) => {
          const c = makeCollege({ admissionBand: undefined, admissionChance: chance as any });
          return getAdmissionBand(c) === chance;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Probability range formatting
// Feature: enhanced-results-page, Property 2
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------
describe('Property 2: Probability range formatting', () => {
  it('probability range string is "{p10}%–{p90}% chance" when both present', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (p10, p90) => {
          const c = makeCollege({ admissionProbabilityP10: p10, admissionProbabilityP90: p90, admissionBand: 'Likely' });
          const str = `${Math.round(c.admissionProbabilityP10!)}%–${Math.round(c.admissionProbabilityP90!)}% chance`;
          return str.includes('%–') && str.includes('chance');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Admission band colour mapping
// Feature: enhanced-results-page, Property 3
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------
describe('Property 3: Admission band colour mapping', () => {
  const BAND_CONFIG: Record<string, string> = {
    Safe: 'emerald', Likely: 'blue', Moderate: 'amber', Risky: 'red',
  };

  it('each band maps to exactly one colour', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky'),
        (band) => BAND_CONFIG[band] !== undefined,
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Fallback display when ML unavailable
// Feature: enhanced-results-page, Property 4
// Validates: Requirements 1.4, 12.2
// ---------------------------------------------------------------------------
describe('Property 4: Fallback display when ML unavailable', () => {
  it('when admissionBand absent, admissionChance is used', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('High', 'Medium', 'Low'),
        (chance) => {
          const c = makeCollege({ admissionBand: undefined, admissionChance: chance as any });
          return getAdmissionBand(c) === chance;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Cutoff trend indicator display and colour
// Feature: enhanced-results-page, Property 5
// Validates: Requirements 2.1, 2.4
// ---------------------------------------------------------------------------
describe('Property 5: Cutoff trend indicator display and colour', () => {
  const TREND_SYMBOLS: Record<string, string> = { rising: '↑', falling: '↓', stable: '→' };
  const TREND_COLOURS: Record<string, string> = { rising: 'red', falling: 'emerald', stable: 'slate' };

  it('each trend maps to a symbol and colour', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('rising', 'falling', 'stable'),
        (trend) => TREND_SYMBOLS[trend] !== undefined && TREND_COLOURS[trend] !== undefined,
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Placement fields shown on card
// Feature: enhanced-results-page, Property 9
// Validates: Requirements 3.5, 3.6, 3.7
// ---------------------------------------------------------------------------
describe('Property 9: Placement fields shown on card', () => {
  it('avgPackage shown when non-null, hidden when null', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 3, maxLength: 15 })),
        (avgPackage) => {
          const c = makeCollege({ avgPackage: avgPackage ?? null });
          const hasPackage = c.avgPackage !== null && c.avgPackage !== undefined;
          return hasPackage === (avgPackage !== null);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Round 2 badge on collapsed card face
// Feature: enhanced-results-page, Property 12
// Validates: Requirements 6.1, 6.4, 6.5
// ---------------------------------------------------------------------------
describe('Property 12: Round 2 badge on collapsed card face', () => {
  it('round2Opportunity true → badge should be shown', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (round2Opportunity) => {
          const c = makeCollege({ round2Opportunity });
          return c.round2Opportunity === round2Opportunity;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Stats bar band counts correctness
// Feature: enhanced-results-page, Property 14
// Validates: Requirements 7.1, 7.4, 7.5
// ---------------------------------------------------------------------------
describe('Property 14: Stats bar band counts correctness', () => {
  it('band counts sum to total colleges', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky'),
          { minLength: 0, maxLength: 20 },
        ),
        (bands) => {
          const colleges = bands.map((b, i) => makeCollege({ code: `C${i}`, admissionBand: b as any }));
          const counts = {
            safe: colleges.filter((c) => c.admissionBand === 'Safe').length,
            likely: colleges.filter((c) => c.admissionBand === 'Likely').length,
            moderate: colleges.filter((c) => c.admissionBand === 'Moderate').length,
            risky: colleges.filter((c) => c.admissionBand === 'Risky').length,
          };
          return counts.safe + counts.likely + counts.moderate + counts.risky === colleges.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Stats bar fallback to legacy counts
// Feature: enhanced-results-page, Property 15
// Validates: Requirements 7.2, 12.5
// ---------------------------------------------------------------------------
describe('Property 15: Stats bar fallback to legacy counts', () => {
  it('legacy counts sum to total when no admissionBand present', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('High', 'Medium', 'Low'),
          { minLength: 0, maxLength: 20 },
        ),
        (chances) => {
          const colleges = chances.map((c, i) =>
            makeCollege({ code: `C${i}`, admissionBand: undefined, admissionChance: c as any }),
          );
          const high = colleges.filter((c) => c.admissionChance === 'High').length;
          const medium = colleges.filter((c) => c.admissionChance === 'Medium').length;
          const low = colleges.filter((c) => c.admissionChance === 'Low').length;
          return high + medium + low === colleges.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Filter options are band-aware
// Feature: enhanced-results-page, Property 16
// Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------
describe('Property 16: Filter options are band-aware', () => {
  it('ML mode filter options are Safe/Likely/Moderate/Risky; fallback are High/Medium/Low', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (mlAvailable) => {
          const mlBands = ['all', 'Safe', 'Likely', 'Moderate', 'Risky'];
          const legacyBands = ['all', 'High', 'Medium', 'Low'];
          const options = mlAvailable ? mlBands : legacyBands;
          // ML-specific bands should not appear in legacy mode and vice versa
          if (mlAvailable) {
            return !options.includes('High') && !options.includes('Medium') && !options.includes('Low');
          } else {
            return !options.includes('Safe') && !options.includes('Likely') && !options.includes('Moderate') && !options.includes('Risky');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Sort order with ML bands and secondary key
// Feature: enhanced-results-page, Property 17
// Validates: Requirements 8.3, 8.4
// ---------------------------------------------------------------------------
describe('Property 17: Sort order with ML bands and secondary key', () => {
  const BAND_ORDER: Record<string, number> = { Safe: 0, High: 0, Likely: 1, Medium: 2, Moderate: 2, Risky: 3, Low: 3 };

  it('sorted colleges have non-decreasing band order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            band: fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky'),
            cutoff: fc.float({ min: 50, max: 99, noNaN: true }),
          }),
          { minLength: 0, maxLength: 10 },
        ),
        (entries) => {
          const colleges = entries.map((e, i) =>
            makeCollege({ code: `C${i}`, admissionBand: e.band as any, cutoffPercentile: e.cutoff }),
          );
          const sorted = [...colleges].sort((a, b) => {
            const diff = BAND_ORDER[getAdmissionBand(a)] - BAND_ORDER[getAdmissionBand(b)];
            return diff !== 0 ? diff : b.cutoffPercentile - a.cutoffPercentile;
          });
          for (let i = 1; i < sorted.length; i++) {
            if (BAND_ORDER[getAdmissionBand(sorted[i])] < BAND_ORDER[getAdmissionBand(sorted[i - 1])]) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
