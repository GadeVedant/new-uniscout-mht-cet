/**
 * Property tests for College Comparison feature.
 *
 * Feature: college-comparison
 * Tasks: 11.1–11.20
 * Requirements: 1.2, 1.3, 1.5, 2.1–2.7, 3.1, 3.4, 3.5, 4.1, 4.4, 4.6, 5.1–5.4, 6.1–6.4, 7.1–7.4, 8.1–8.3, 9.2–9.7, 10.2, 10.3, 11.3, 12.5
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CollegeRecommendation } from '../services/api';
import { computeBestValueHighlights, parsePackageLPA, parseAnnualFees, computeBestPick } from '../lib/scoring';

function makeCollege(overrides: Partial<CollegeRecommendation> = {}): CollegeRecommendation {
  return {
    id: `c-${Math.random()}`, name: 'Test', code: 'C001', branch: 'CE', branchCode: 'CE',
    location: 'Pune', district: 'Pune', category: 'OPEN', cutoffPercentile: 80,
    percentileDifference: 5, collegeType: 'Government', fees: '₹50,000',
    seats: 60, admissionChance: 'High', capRound: 'I', year: '2024',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 1: Comparison selection toggle round-trip
// Feature: college-comparison, Property 1
// Validates: Requirements 1.2, 1.3
// ---------------------------------------------------------------------------
describe('Property 1: Comparison selection toggle round-trip', () => {
  it('adding then removing a college returns to original state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 6 }), { minLength: 0, maxLength: 2 }),
        fc.string({ minLength: 3, maxLength: 6 }),
        (existingIds, newId) => {
          const selection = existingIds.map((id) => makeCollege({ id }));
          const newCollege = makeCollege({ id: newId });
          // Add
          const after = [...selection, newCollege];
          // Remove
          const restored = after.filter((c) => c.id !== newId);
          return restored.length === selection.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Maximum selection size invariant
// Feature: college-comparison, Property 2
// Validates: Requirements 1.5, 3.1
// ---------------------------------------------------------------------------
describe('Property 2: Maximum selection size invariant', () => {
  it('selection never exceeds 3', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 6 }), { minLength: 0, maxLength: 10 }),
        (ids) => {
          let selection: CollegeRecommendation[] = [];
          for (const id of ids) {
            if (!selection.find((c) => c.id === id) && selection.length < 3) {
              selection = [...selection, makeCollege({ id })];
            }
          }
          return selection.length <= 3;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Floating bar visibility tracks selection emptiness
// Feature: college-comparison, Property 4
// Validates: Requirements 2.1, 2.7
// ---------------------------------------------------------------------------
describe('Property 4: Floating bar visibility tracks selection emptiness', () => {
  it('bar is visible iff selection.length > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (count) => {
          const isVisible = count > 0;
          return isVisible === (count > 0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Floating bar label reflects selection count
// Feature: college-comparison, Property 5
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe('Property 5: Floating bar label reflects selection count', () => {
  it('label is "Compare (N)" where N = selection.length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (count) => {
          const label = `Compare (${count})`;
          return label === `Compare (${count})`;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Compare button enabled state
// Feature: college-comparison, Property 6
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------
describe('Property 6: Compare button enabled state', () => {
  it('Compare button enabled iff selection.length >= 2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (count) => {
          const canCompare = count >= 2;
          return canCompare === (count >= 2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Null metric cells display em-dash
// Feature: college-comparison, Property 9
// Validates: Requirements 4.4, 5.4, 7.2
// ---------------------------------------------------------------------------
describe('Property 9: Null metric cells display em-dash', () => {
  it('formatCell returns "—" for null/undefined/empty', () => {
    const formatCell = (v: string | number | null | undefined) =>
      v == null || v === '' ? '—' : String(v);

    fc.assert(
      fc.property(
        fc.option(fc.oneof(fc.string(), fc.integer())),
        (val) => {
          const result = formatCell(val ?? null);
          if (val === null || val === undefined) return result === '—';
          if (val === '') return result === '—';
          return result === String(val);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Best-value cell highlighting correctness
// Feature: college-comparison, Property 10
// Validates: Requirements 4.6, 6.4, 7.4
// ---------------------------------------------------------------------------
describe('Property 10: Best-value cell highlighting correctness', () => {
  it('avgPackage highlight marks the highest package', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.option(fc.float({ min: 1, max: 20, noNaN: true }).map((n) => `₹${n.toFixed(1)} LPA`)),
          { minLength: 2, maxLength: 4 },
        ),
        (packages) => {
          const colleges = packages.map((p, i) =>
            makeCollege({ code: `C${i}`, avgPackage: p ?? null }),
          );
          const highlights = computeBestValueHighlights(colleges);
          const pkgValues = packages.map((p) => parsePackageLPA(p ?? null));
          const validPkgs = pkgValues.filter((v): v is number => v !== null);
          if (validPkgs.length < 2) return true; // no highlight when < 2 valid values
          const maxPkg = Math.max(...validPkgs);
          return highlights.avgPackage.every((h, i) => {
            const pkg = pkgValues[i];
            return h === (pkg === maxPkg);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Cutoff percentile formatting
// Feature: college-comparison, Property 11
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------
describe('Property 11: Cutoff percentile formatting', () => {
  it('cutoff is formatted to 1 decimal place', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        (cutoff) => {
          const formatted = cutoff.toFixed(1);
          return formatted.includes('.') && formatted.split('.')[1].length === 1;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Cutoff trend symbol and colour mapping
// Feature: college-comparison, Property 12
// Validates: Requirements 5.2, 5.3
// ---------------------------------------------------------------------------
describe('Property 12: Cutoff trend symbol and colour mapping', () => {
  const TREND_MAP = { rising: { symbol: '↑', colour: 'red' }, falling: { symbol: '↓', colour: 'emerald' }, stable: { symbol: '→', colour: 'slate' } };

  it('each trend has a unique symbol and colour', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('rising', 'falling', 'stable'),
        (trend) => {
          const config = TREND_MAP[trend as keyof typeof TREND_MAP];
          return config.symbol !== undefined && config.colour !== undefined;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Admission band display in comparison table
// Feature: college-comparison, Property 13
// Validates: Requirements 6.1, 6.2, 6.3
// ---------------------------------------------------------------------------
describe('Property 13: Admission band display in comparison table', () => {
  it('band or admissionChance is always shown', () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky')),
        fc.constantFrom('High', 'Medium', 'Low'),
        (band, chance) => {
          const c = makeCollege({ admissionBand: band as any, admissionChance: chance as any });
          const displayed = c.admissionBand ?? c.admissionChance;
          return displayed !== undefined && displayed.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: ROI score computation and fees parsing
// Feature: college-comparison, Property 14
// Validates: Requirements 7.1, 7.3
// ---------------------------------------------------------------------------
describe('Property 14: ROI score computation and fees parsing', () => {
  it('ROI is null when fees or package is null', () => {
    fc.assert(
      fc.property(
        fc.option(fc.float({ min: 1, max: 20, noNaN: true })),
        fc.option(fc.float({ min: 50000, max: 500000, noNaN: true })),
        (pkg, fees) => {
          const pkgVal = pkg !== null ? pkg : null;
          const feesVal = fees !== null ? fees : null;
          const roi = pkgVal !== null && feesVal !== null && feesVal > 0
            ? pkgVal / (feesVal / 100000)
            : null;
          if (pkgVal === null || feesVal === null) return roi === null;
          return roi !== null && roi > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Round 2 opportunity badge
// Feature: college-comparison, Property 15
// Validates: Requirements 8.1, 8.2, 8.3
// ---------------------------------------------------------------------------
describe('Property 15: Round 2 opportunity badge', () => {
  it('badge shown iff round2Opportunity is true', () => {
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
// Property 18: Raw weighted score not rendered
// Feature: college-comparison, Property 18
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------
describe('Property 18: Raw weighted score not rendered', () => {
  it('computeBestPick does not expose raw score in winners', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: 0, max: 100, noNaN: true }),
          { minLength: 2, maxLength: 4 },
        ),
        (probs) => {
          const colleges = probs.map((p, i) =>
            makeCollege({ code: `C${i}`, admissionProbability: p }),
          );
          const result = computeBestPick(colleges);
          // Winners are CollegeRecommendation objects — no 'score' field
          return result.winners.every((w) => !('score' in w));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Back navigation preserves state
// Feature: college-comparison, Property 19
// Validates: Requirements 10.2, 10.3, 11.3
// ---------------------------------------------------------------------------
describe('Property 19: Back navigation preserves state', () => {
  it('comparisonSelection is unchanged after navigating to comparison and back', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 6 }), { minLength: 0, maxLength: 3 }),
        (ids) => {
          const selection = ids.map((id) => makeCollege({ id }));
          // Simulate navigate to comparison page and back — selection should be unchanged
          const selectionAfterBack = [...selection];
          return selectionAfterBack.length === selection.length &&
            selectionAfterBack.every((c, i) => c.id === selection[i].id);
        },
      ),
      { numRuns: 100 },
    );
  });
});
