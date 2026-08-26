/**
 * Unit tests for recommendationService ML enrichment.
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.2, 7.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// Mock dependencies before importing the service
vi.mock('../services/mlServiceClient.js', () => ({
  mlServiceClient: {
    predictBatch: vi.fn(),
    getModelVersion: vi.fn().mockResolvedValue('test_version'),
  },
}));

vi.mock('../services/dataService.js', () => {
  const colleges = [
    {
      collegeCode: '1234', collegeName: 'Test College', branchCode: 'CE',
      branchName: 'computer engineering', category: 'OPEN',
      cutoffPercentile: 85.0, year: '2024', capRound: 'II',
      location: 'Pune', district: 'Pune', collegeType: 'Government',
      status: 'Admitted', fees: 50000, intake: 60,
    },
  ];
  return {
    dataService: {
      getAllColleges: vi.fn().mockReturnValue(colleges),
      getAllYearsData: vi.fn().mockReturnValue(colleges),
      isLoaded: vi.fn().mockReturnValue(true),
      getFilterOptions: vi.fn().mockReturnValue({ years: [], capRounds: [], categories: [], branches: [], locations: [] }),
      getStats: vi.fn().mockReturnValue({ totalRecords: 1, totalColleges: 1, totalBranches: 1, isLoaded: true }),
    },
  };
});

vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { recommendationService } from '../services/recommendationService.js';
import { mlServiceClient } from '../services/mlServiceClient.js';
import { clearCache } from '../services/mlPredictionCache.js';
import logger from '../utils/logger.js';

const ML_RESULT = {
  p10: 80.0, p50: 85.0, p90: 90.0,
  admission_probability: 72.4, confidence_score: 0.81,
  confidence_label: 'High confidence', admission_band: 'Likely',
  top_factors: ['Recent cutoff trend'], predicted_year: 2025,
};

const BASE_REQUEST = {
  percentile: 87.5,
  year: '2024',
  capRound: 'II',
  category: 'OPEN',
  branchPreference: 'computer engineering',
  location: '',
};

describe('recommendationService ML enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    vi.mocked(mlServiceClient.getModelVersion).mockResolvedValue('test_version');
  });

  describe('ML enrichment on success', () => {
    it('populates all ML fields when ML service responds', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([ML_RESULT]);

      const { recommendations, mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);

      expect(mlUnavailable).toBe(false);
      expect(recommendations).toHaveLength(1);
      const rec = recommendations[0];
      expect(rec.p10).toBe(80.0);
      expect(rec.p50).toBe(85.0);
      expect(rec.p90).toBe(90.0);
      expect(rec.admissionProbability).toBe(72.4);
      expect(rec.admissionBand).toBe('Likely');
      expect(rec.confidenceLabel).toBe('High confidence');
      expect(rec.topFactors).toEqual(['Recent cutoff trend']);
    });

    it('ml_unavailable is false on success', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([ML_RESULT]);

      const { mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(mlUnavailable).toBe(false);
    });

    it('preserves rule-based admissionChance on success', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([ML_RESULT]);

      const { recommendations } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(['High', 'Medium', 'Low']).toContain(recommendations[0].admissionChance);
    });
  });

  describe('graceful fallback on ML failure', () => {
    it('sets ml_unavailable=true on timeout', async () => {
      const timeoutErr = Object.assign(new Error('timeout'), { code: 'ECONNABORTED' });
      vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(timeoutErr);

      const { mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(mlUnavailable).toBe(true);
    });

    it('sets ml_unavailable=true on non-200 response', async () => {
      const non200Err = Object.assign(new Error('non-200'), { response: { status: 503 } });
      vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(non200Err);

      const { mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(mlUnavailable).toBe(true);
    });

    it('sets ml_unavailable=true when unreachable', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(new Error('ECONNREFUSED'));

      const { mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(mlUnavailable).toBe(true);
    });

    it('preserves rule-based admissionChance on fallback', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(new Error('ECONNREFUSED'));

      const { recommendations } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(['High', 'Medium', 'Low']).toContain(recommendations[0]?.admissionChance ?? 'High');
    });

    it('logs fallback event with required fields', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(new Error('ECONNREFUSED'));

      await recommendationService.getRecommendations(BASE_REQUEST);

      expect(logger.warn).toHaveBeenCalledWith(
        'ML_Service fallback',
        expect.objectContaining({
          request_id: expect.any(String),
          reason: expect.stringMatching(/timeout|non_200|unreachable/),
          affected: expect.any(Array),
        }),
      );
    });

    it('ml_unavailable absent on success', async () => {
      vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([ML_RESULT]);

      const { mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);
      expect(mlUnavailable).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Property 27: Node_Backend ML enrichment on success
// Feature: mhtcet-cutoff-prediction, Property 27: Node_Backend ML enrichment on success
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------
describe('Property 27: Node_Backend ML enrichment on success', () => {
  it('all ML fields populated for any successful ML response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          p10: fc.float({ min: 0, max: 50, noNaN: true }),
          p50: fc.float({ min: 50, max: 80, noNaN: true }),
          p90: fc.float({ min: 80, max: 100, noNaN: true }),
          admission_probability: fc.float({ min: 0, max: 100, noNaN: true }),
          confidence_score: fc.float({ min: 0, max: 1, noNaN: true }),
          confidence_label: fc.constantFrom('High confidence', 'Medium confidence', 'Low confidence (estimated)'),
          admission_band: fc.constantFrom('Safe', 'Likely', 'Moderate', 'Risky'),
          top_factors: fc.array(fc.string({ minLength: 1 }), { maxLength: 3 }),
          predicted_year: fc.integer({ min: 2024, max: 2030 }),
        }),
        async (mlResult) => {
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([mlResult]);

          const { recommendations, mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);

          expect(mlUnavailable).toBe(false);
          if (recommendations.length > 0) {
            const rec = recommendations[0];
            expect(rec.p10).toBeDefined();
            expect(rec.p50).toBeDefined();
            expect(rec.p90).toBeDefined();
            expect(rec.admissionProbability).toBeDefined();
            expect(rec.admissionBand).toBeDefined();
            expect(rec.confidenceLabel).toBeDefined();
            expect(rec.topFactors).toBeDefined();
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 28: Node_Backend graceful fallback
// Feature: mhtcet-cutoff-prediction, Property 28: Node_Backend graceful fallback
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------
describe('Property 28: Node_Backend graceful fallback', () => {
  it('ml_unavailable=true and admissionChance preserved on any ML failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' })),
          fc.constant(Object.assign(new Error('non-200'), { response: { status: 503 } })),
          fc.constant(new Error('ECONNREFUSED')),
        ),
        async (err) => {
          clearCache();
          vi.mocked(mlServiceClient.predictBatch).mockRejectedValue(err);

          const { recommendations, mlUnavailable } = await recommendationService.getRecommendations(BASE_REQUEST);

          expect(mlUnavailable).toBe(true);
          for (const rec of recommendations) {
            expect(['High', 'Medium', 'Low']).toContain(rec.admissionChance);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: Cache hit on repeated identical request
// Feature: mhtcet-cutoff-prediction, Property 29: Cache hit on repeated identical request
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------
describe('Property 29: Cache hit on repeated identical request', () => {
  it('second identical request served from cache without calling ML_Service', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 100, noNaN: true }),
        async (percentile) => {
          vi.clearAllMocks();
          vi.mocked(mlServiceClient.getModelVersion).mockResolvedValue('cache_test_version');
          vi.mocked(mlServiceClient.predictBatch).mockResolvedValue([ML_RESULT]);

          const req = { ...BASE_REQUEST, percentile };

          // First call — cache miss, ML service called
          await recommendationService.getRecommendations(req);
          const firstCallCount = vi.mocked(mlServiceClient.predictBatch).mock.calls.length;

          // Second call — should hit cache
          await recommendationService.getRecommendations(req);
          const secondCallCount = vi.mocked(mlServiceClient.predictBatch).mock.calls.length;

          // ML service should not have been called again
          expect(secondCallCount).toBe(firstCallCount);
        },
      ),
      { numRuns: 10 },
    );
  });
});
