/**
 * Unit + property tests for FormFillingService.
 *
 * Feature: smart-form-filling
 * Tasks: 2.2, 2.3, 2.5, 2.6, 2.8, 2.9, 2.10, 2.13, 2.14, 14.1, 14.2
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.7, 7.1, 7.2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('../services/mlServiceClient.js', () => ({
  mlServiceClient: { predictBatch: vi.fn() },
}));
vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { formFillingService } from '../services/formFillingService.js';
import { mlServiceClient } from '../services/mlServiceClient.js';
import { parseAnnualFees } from '../utils/scoring.js';

// We need dataService mock — import after mocking
vi.mock('../services/dataService.js', () => ({
  dataService: { getAllColleges: vi.fn() },
}));
import { dataService } from '../services/dataService.js';

type Row = { collegeCode: string; collegeName: string; branchCode: string; branchName: string; category: string; capRound: string; year: string; cutoffPercentile: number; location: string; district: string; collegeType: string; status: string; fees?: number; intake?: number };

function row(o: Partial<Row>): Row {
  return { collegeCode: 'C001', collegeName: 'Test College', branchCode: 'CE', branchName: 'computer engineering', category: 'open', capRound: 'I', year: '2024', cutoffPercentile: 80, location: 'Pune', district: 'Pune', collegeType: 'Government', status: '', ...o };
}

const ML_RESULT = { p10: 75, p50: 80, p90: 85, admission_probability: 72, confidence_score: 0.8, confidence_label: 'High confidence', admission_band: 'Likely', top_factors: ['trend'], predicted_year: 2025 };

const BASE_REQUEST = { percentile: 85, category: 'Open', capRound: 'I', branchPreferences: ['computer engineering'], preferredDistricts: [], priorityMode: 'college' as const };

// ---------------------------------------------------------------------------
// Task 14.1: Unit tests for parseAnnualFees
// ---------------------------------------------------------------------------
describe('parseAnnualFees', () => {
  it('fees=120000 → 120000', () => expect(parseAnnualFees('₹1,20,000')).toBeCloseTo(120000, 0));
  it('fees=600000 → 150000 (4-year heuristic)', () => expect(parseAnnualFees('₹6,00,000')).toBeCloseTo(150000, 0));
  it('fees=null → null', () => expect(parseAnnualFees(null)).toBeNull());
  it('fees=N/A → null', () => expect(parseAnnualFees('N/A')).toBeNull());
  it('fees=0 → null', () => expect(parseAnnualFees('0')).toBeNull());
});

// ---------------------------------------------------------------------------
// Task 14.1: Unit tests for assignTier (via generatePreferenceList)
// ---------------------------------------------------------------------------
describe('FormFillingService tier assignment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Safe band → safe tier', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([row({ cutoffPercentile: 80, category: 'Open' })] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Safe' }]);
    const { response } = await formFillingService.generatePreferenceList(BASE_REQUEST);
    expect(response.safePicks.length).toBeGreaterThan(0);
  });

  it('Moderate band → target tier', async () => {
    // cutoff = 85, percentile = 85 → diff = 0 → admissionChance = 'Medium' → target tier
    vi.mocked(dataService.getAllColleges).mockReturnValue([row({ cutoffPercentile: 85, category: 'Open' })] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Moderate' }]);
    const { response } = await formFillingService.generatePreferenceList(BASE_REQUEST);
    expect(response.targetPicks.length).toBeGreaterThan(0);
  });

  it('Risky band with diff <= 5 → dream tier', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([row({ cutoffPercentile: 88, category: 'Open' })] as any); // diff = 85-88 = -3, cutoff-percentile = 3 <= 5
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Risky' }]);
    const { response } = await formFillingService.generatePreferenceList(BASE_REQUEST);
    expect(response.dreamPicks.length).toBeGreaterThan(0);
  });

  it('Risky band with diff > 5 → excluded (null tier)', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([row({ cutoffPercentile: 92, category: 'Open' })] as any); // diff = 85-92 = -7 > 5
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Risky' }]);
    const { response } = await formFillingService.generatePreferenceList(BASE_REQUEST);
    expect(response.dreamPicks).toHaveLength(0);
    expect(response.safePicks).toHaveLength(0);
    expect(response.targetPicks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Task 14.1: sortSafeTier — priority mode
// ---------------------------------------------------------------------------
describe('FormFillingService priority mode sort', () => {
  beforeEach(() => vi.clearAllMocks());

  it('branch priority mode sorts safe tier by branch rank first', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ collegeCode: 'C001', branchName: 'information technology', cutoffPercentile: 80 }),
      row({ collegeCode: 'C002', branchName: 'computer engineering', cutoffPercentile: 82 }),
    ] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([
      { ...ML_RESULT, admission_band: 'Safe' },
      { ...ML_RESULT, admission_band: 'Safe' },
    ]);
    const req = { ...BASE_REQUEST, branchPreferences: ['computer engineering', 'information technology'], priorityMode: 'branch' as const };
    const { response } = await formFillingService.generatePreferenceList(req);
    // computer engineering (rank 0) should come before information technology (rank 1)
    if (response.safePicks.length >= 2) {
      expect(response.safePicks[0].branchName.toLowerCase()).toContain('computer');
    }
  });
});

// ---------------------------------------------------------------------------
// Task 14.2: Budget filter and ML fallback
// ---------------------------------------------------------------------------
describe('FormFillingService budget filter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('excludes colleges where annual fees > budget', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ collegeCode: 'C001', category: 'Open', fees: 150000 }),  // 1.5 LPA — within budget of 2
      row({ collegeCode: 'C002', category: 'Open', fees: 300000 }),  // 3 LPA — exceeds budget of 2
    ] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([
      { ...ML_RESULT, admission_band: 'Safe' },
    ]);
    const req = { ...BASE_REQUEST, budget: 2 }; // 2 Lakhs/yr
    const { response } = await formFillingService.generatePreferenceList(req);
    const total = response.safePicks.length + response.targetPicks.length + response.dreamPicks.length;
    // Only C001 (1.5 LPA) should pass; C002 (3 LPA) excluded
    expect(total).toBe(1);
  });

  it('null budget includes all colleges', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ collegeCode: 'C001', category: 'Open', fees: 500000 }),
      row({ collegeCode: 'C002', category: 'Open', fees: 1000000 }),
    ] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([
      { ...ML_RESULT, admission_band: 'Safe' },
      { ...ML_RESULT, admission_band: 'Safe' },
    ]);
    const req = { ...BASE_REQUEST, budget: undefined };
    const { response } = await formFillingService.generatePreferenceList(req);
    expect(response.safePicks.length + response.targetPicks.length + response.dreamPicks.length).toBe(2);
  });

  it('sets mlUnavailable=true when ML service throws', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([row({ category: 'Open' })] as any);
    vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(new Error('ML down'));
    const { mlUnavailable } = await formFillingService.generatePreferenceList(BASE_REQUEST);
    expect(mlUnavailable).toBe(true);
  });

  it('sets budgetWarning when < 5 colleges remain after budget filter', async () => {
    vi.mocked(dataService.getAllColleges).mockReturnValue([
      row({ collegeCode: 'C001', category: 'Open', fees: 150000 }),
    ] as any);
    vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Safe' }]);
    const req = { ...BASE_REQUEST, budget: 2 };
    const { budgetWarning } = await formFillingService.generatePreferenceList(req);
    expect(budgetWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 1: Determinism
// Feature: smart-form-filling, Property 1
// Validates: Requirements 12.1, 12.4
// ---------------------------------------------------------------------------
describe('Property 1: Determinism', () => {
  it('same request produces same output', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 50, max: 95, noNaN: true }),
        async (percentile) => {
          vi.mocked(dataService.getAllColleges).mockReturnValue([
            row({ cutoffPercentile: percentile - 3, category: 'Open' }),
          ] as any);
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Safe' }]);
          const req = { ...BASE_REQUEST, percentile };
          const r1 = await formFillingService.generatePreferenceList(req);
          const r2 = await formFillingService.generatePreferenceList(req);
          return JSON.stringify(r1.response) === JSON.stringify(r2.response);
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Sequential rank numbers
// Feature: smart-form-filling, Property 3
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------
describe('Property 3: Sequential rank numbers', () => {
  it('ranks are sequential starting from 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (count) => {
          const rows = Array.from({ length: count }, (_, i) =>
            row({ collegeCode: `C${i}`, cutoffPercentile: 80 - i, category: 'Open' }),
          );
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows as any);
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue(
            rows.map(() => ({ ...ML_RESULT, admission_band: 'Safe' })),
          );
          const { response } = await formFillingService.generatePreferenceList(BASE_REQUEST);
          const all = [...response.safePicks, ...response.targetPicks, ...response.dreamPicks];
          if (all.length === 0) return true;
          const ranks = all.map((e) => e.rank);
          return ranks[0] === 1 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Budget filter correctness
// Feature: smart-form-filling, Property 4
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------
describe('Property 4: Budget filter correctness', () => {
  it('no returned entry has annual fees exceeding budget', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0.5, max: 3, noNaN: true }),
        async (budgetLPA) => {
          const rows = [
            row({ collegeCode: 'C001', category: 'Open', fees: Math.round(budgetLPA * 100000 * 0.8) }), // within
            row({ collegeCode: 'C002', category: 'Open', fees: Math.round(budgetLPA * 100000 * 1.5) }), // exceeds
          ];
          vi.mocked(dataService.getAllColleges).mockReturnValue(rows as any);
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([
            { ...ML_RESULT, admission_band: 'Safe' },
          ]);
          const req = { ...BASE_REQUEST, budget: budgetLPA };
          const { response } = await formFillingService.generatePreferenceList(req);
          const all = [...response.safePicks, ...response.targetPicks, ...response.dreamPicks];
          // C002 should be excluded — only C001 (within budget) should appear
          return all.length <= 1;
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Annual fees parsing
// Feature: smart-form-filling, Property 5
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe('Property 5: Annual fees parsing', () => {
  it('values > 500000 are divided by 4', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500001, max: 2000000 }),
        (fees) => {
          const result = parseAnnualFees(`₹${fees}`);
          return result !== null && Math.abs(result - fees / 4) < 1;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('values <= 500000 are returned as-is', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500000 }),
        (fees) => {
          const result = parseAnnualFees(`₹${fees}`);
          return result !== null && Math.abs(result - fees) < 1;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Entry reason is always non-empty
// Feature: smart-form-filling, Property 8
// Validates: Requirements 6.7
// ---------------------------------------------------------------------------
describe('Property 8: Entry reason is always non-empty', () => {
  it('every returned entry has a non-empty entryReason', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 50, max: 95, noNaN: true }),
        async (percentile) => {
          vi.mocked(dataService.getAllColleges).mockReturnValue([
            row({ cutoffPercentile: percentile - 3, category: 'Open' }),
          ] as any);
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([{ ...ML_RESULT, admission_band: 'Safe' }]);
          const { response } = await formFillingService.generatePreferenceList({ ...BASE_REQUEST, percentile });
          const all = [...response.safePicks, ...response.targetPicks, ...response.dreamPicks];
          return all.every((e) => typeof e.entryReason === 'string' && e.entryReason.length > 0);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Dream tier cutoff constraint
// Feature: smart-form-filling, Property 9
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------
describe('Property 9: Dream tier cutoff constraint', () => {
  it('dream picks have cutoff - percentile <= 5', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 50, max: 90, noNaN: true }),
        async (percentile) => {
          vi.mocked(dataService.getAllColleges).mockReturnValue([
            row({ cutoffPercentile: percentile + 3, category: 'Open' }), // diff = 3 <= 5 → dream
            row({ collegeCode: 'C002', cutoffPercentile: percentile + 7, category: 'Open' }), // diff = 7 > 5 → excluded
          ] as any);
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([
            { ...ML_RESULT, admission_band: 'Risky' },
            { ...ML_RESULT, admission_band: 'Risky' },
          ]);
          const { response } = await formFillingService.generatePreferenceList({ ...BASE_REQUEST, percentile });
          return response.dreamPicks.every((e) => e.cutoffPercentile - percentile <= 5);
        },
      ),
      { numRuns: 50 },
    );
  });
});
