/**
 * Unit tests for MLServiceClient.
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.1, 7.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Re-import after mock
import { mlServiceClient, type MLPredictionRequest } from '../services/mlServiceClient.js';

const SAMPLE_REQUEST: MLPredictionRequest = {
  college_code: '1234',
  branch_name: 'computer engineering',
  category: 'OPEN',
  cap_round: 'II',
  student_percentile: 87.5,
  exam_type: 'mhtcet',
  district: 'Pune',
};

const SAMPLE_RESULT = {
  p10: 80.0, p50: 85.0, p90: 90.0,
  admission_probability: 72.4, confidence_score: 0.81,
  confidence_label: 'High confidence', admission_band: 'Likely',
  top_factors: ['Recent cutoff trend'], predicted_year: 2025,
};

describe('MLServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('predictBatch', () => {
    it('calls the correct endpoint with requests', async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { results: [SAMPLE_RESULT] } });

      const results = await mlServiceClient.predictBatch([SAMPLE_REQUEST]);

      expect(mockedAxios.post).toHaveBeenCalledOnce();
      const [url, body] = (mockedAxios.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/api/predict-batch');
      expect(body).toEqual({ requests: [SAMPLE_REQUEST] });
      expect(results).toHaveLength(1);
      expect(results[0].p50).toBe(85.0);
    });

    it('sends X-Request-ID header when requestId provided', async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { results: [SAMPLE_RESULT] } });

      await mlServiceClient.predictBatch([SAMPLE_REQUEST], 'my-request-id');

      const [, , config] = (mockedAxios.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(config.headers['X-Request-ID']).toBe('my-request-id');
    });

    it('generates a UUID X-Request-ID when none provided', async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { results: [SAMPLE_RESULT] } });

      await mlServiceClient.predictBatch([SAMPLE_REQUEST]);

      const [, , config] = (mockedAxios.post as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(config.headers['X-Request-ID']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('enforces configurable timeout (default 8000ms)', async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { results: [SAMPLE_RESULT] } });

      await mlServiceClient.predictBatch([SAMPLE_REQUEST]);

      const [, , config] = (mockedAxios.post as ReturnType<typeof vi.fn>).mock.calls[0];
      // Default is 8000ms to handle Render free-tier cross-region latency.
      // Override via ML_TIMEOUT_MS env var.
      expect(config.timeout).toBe(8000);
    });

    it('throws on network error', async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(mlServiceClient.predictBatch([SAMPLE_REQUEST])).rejects.toThrow();
    });
  });

  describe('getModelVersion', () => {
    it('returns model version from health endpoint', async () => {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: { model_version: '20240115_143022' } });

      const version = await mlServiceClient.getModelVersion();
      expect(version).toBe('20240115_143022');
    });

    it('returns null when service is unavailable', async () => {
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const version = await mlServiceClient.getModelVersion();
      expect(version).toBeNull();
    });
  });
});
