/**
 * Unit tests for mlPredictionCache.
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, cacheKey, clearCache } from '../services/mlPredictionCache.js';
import type { MLPredictionRequest, MLPredictionResult } from '../services/mlServiceClient.js';

const SAMPLE_REQUEST: MLPredictionRequest = {
  college_code: '1234',
  branch_name: 'computer engineering',
  category: 'OPEN',
  cap_round: 'II',
  student_percentile: 87.5,
};

const SAMPLE_RESULT: MLPredictionResult = {
  p10: 80.0, p50: 85.0, p90: 90.0,
  admission_probability: 72.4, confidence_score: 0.81,
  confidence_label: 'High confidence', admission_band: 'Likely',
  top_factors: ['Recent cutoff trend'], predicted_year: 2025,
};

const MODEL_V1 = '20240115_143022';
const MODEL_V2 = '20240116_090000';

describe('mlPredictionCache', () => {
  beforeEach(() => {
    clearCache();
  });
  describe('cacheKey', () => {
    it('produces a 64-char hex string', () => {
      const key = cacheKey(SAMPLE_REQUEST, MODEL_V1);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('same inputs produce same key', () => {
      expect(cacheKey(SAMPLE_REQUEST, MODEL_V1)).toBe(cacheKey(SAMPLE_REQUEST, MODEL_V1));
    });

    it('different model version produces different key', () => {
      expect(cacheKey(SAMPLE_REQUEST, MODEL_V1)).not.toBe(cacheKey(SAMPLE_REQUEST, MODEL_V2));
    });

    it('different college_code produces different key', () => {
      const req2 = { ...SAMPLE_REQUEST, college_code: '9999' };
      expect(cacheKey(SAMPLE_REQUEST, MODEL_V1)).not.toBe(cacheKey(req2, MODEL_V1));
    });
  });

  describe('get / set', () => {
    it('returns null on cache miss', () => {
      const req = { ...SAMPLE_REQUEST, college_code: 'MISS_TEST' };
      expect(get(req, MODEL_V1)).toBeNull();
    });

    it('returns result on cache hit', () => {
      set(SAMPLE_REQUEST, MODEL_V1, SAMPLE_RESULT);
      const result = get(SAMPLE_REQUEST, MODEL_V1);
      expect(result).not.toBeNull();
      expect(result?.p50).toBe(85.0);
    });

    it('returns null after TTL expiry', async () => {
      // Use a unique key to avoid interference
      const req = { ...SAMPLE_REQUEST, college_code: 'TTL_TEST' };

      // Temporarily override Date.now to simulate expiry
      const realNow = Date.now;
      const fakeNow = realNow();
      vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

      set(req, MODEL_V1, SAMPLE_RESULT);
      expect(get(req, MODEL_V1)).not.toBeNull();

      // Advance time past TTL (default 3600s = 3600000ms)
      vi.spyOn(Date, 'now').mockReturnValue(fakeNow + 3_601_000);
      expect(get(req, MODEL_V1)).toBeNull();

      vi.restoreAllMocks();
    });

    it('returns null for different model version (cache invalidation)', () => {
      const req = { ...SAMPLE_REQUEST, college_code: 'VERSION_TEST' };
      set(req, MODEL_V1, SAMPLE_RESULT);
      expect(get(req, MODEL_V2)).toBeNull();
    });
  });
});
