/**
 * MLServiceClient: HTTP client for the ML prediction microservice.
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.1, 7.4
 */
import axios from 'axios';
import { randomUUID } from 'crypto';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const ML_TIMEOUT_MS = parseInt(process.env.ML_TIMEOUT_MS ?? '5000', 10); // 5s default, configurable

export interface MLPredictionRequest {
  college_code: string;
  branch_name: string;
  category: string;
  cap_round: 'I' | 'II' | 'III';
  student_percentile: number;
  exam_type?: string;
  district?: string;
}

export interface MLPredictionResult {
  p10: number;
  p50: number;
  p90: number;
  admission_probability: number;
  confidence_score: number;
  confidence_label: string;
  admission_band: string;
  top_factors: string[];
  predicted_year: number;
  fallback_reason?: string;
}

class MLServiceClient {
  /**
   * Send a batch of prediction requests to the ML service.
   * Enforces a 150ms timeout. Throws on timeout / non-200 / unreachable.
   */
  async predictBatch(
    requests: MLPredictionRequest[],
    requestId?: string,
  ): Promise<MLPredictionResult[]> {
    const response = await axios.post<{ results: MLPredictionResult[] }>(
      `${ML_SERVICE_URL}/api/predict-batch`,
      { requests },
      {
        timeout: ML_TIMEOUT_MS,
        headers: { 'X-Request-ID': requestId ?? randomUUID() },
      },
    );
    return response.data.results;
  }

  /**
   * Fetch the current model version from the health endpoint.
   * Returns null if the service is unavailable.
   */
  async getModelVersion(): Promise<string | null> {
    try {
      const response = await axios.get<{ model_version?: string }>(
        `${ML_SERVICE_URL}/health`,
        { timeout: ML_TIMEOUT_MS },
      );
      return response.data.model_version ?? null;
    } catch {
      return null;
    }
  }
}

export const mlServiceClient = new MLServiceClient();
