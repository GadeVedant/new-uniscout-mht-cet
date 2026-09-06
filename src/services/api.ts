/**
 * API Service for Uniscout College Recommendation System
 * Handles all communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
export interface RecommendationRequest {
  percentile: number;
  year: string;
  capRound: string;
  category: string;
  branchPreference: string;
  location: string;
}

export interface CollegeRecommendation {
  id: string;
  name: string;
  code: string;
  branch: string;
  branchCode: string;
  location: string;
  district: string;
  category: string;
  cutoffPercentile: number;
  percentileDifference: number;
  collegeType: string;
  fees: string;
  seats: number;
  admissionChance: 'High' | 'Medium' | 'Low';
  capRound: string;
  year: string;
  // ML-enriched fields
  p10?: number;
  p50?: number;
  p90?: number;
  admissionProbabilityP10?: number;
  admissionProbabilityP90?: number;
  admissionProbability?: number;
  admissionBand?: 'Safe' | 'Likely' | 'Moderate' | 'Risky';
  confidenceLabel?: string;
  topFactors?: string[];
  cutoffTrend?: 'rising' | 'falling' | 'stable';
  // Placement fields
  avgPackage?: string | null;
  highestPackage?: string | null;
  // Estimated cutoff flag (no actual category data — derived from Open cutoff with discount)
  estimatedCutoff?: boolean;
  // Round 2 strategy fields
  round2Opportunity?: boolean;
  round2Delta?: number | null;
}

export interface CutoffHistoryEntry {
  year: number;
  cutoffPercentile: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    totalResults?: number;
    query?: RecommendationRequest;
    timestamp?: string;
    ml_unavailable?: boolean;
    location_fallback?: boolean;
    dataVersion?: number;
    warning?: string;
  };
}

export interface FilterOptions {
  years: string[];
  capRounds: string[];
  categories: string[];
  branches: string[];
  locations: string[];
}

export interface Round2StrategyRequest {
  percentile: number;
  category: string;
  branch: string;
  capRound: string;
}

export interface MissedCollege {
  collegeCode: string;
  collegeName: string;
  branchName: string;
  category: string;
  round1Cutoff: number;
  expectedRound2Cutoff: number;
  expectedDrop: number;
  round2Probability: number;
}

export interface FreezeOrFloatResult {
  recommendation: 'Freeze' | 'Float';
  reasoning: string;
  betterOption?: MissedCollege;
}

export interface Round2Opportunity {
  collegeCode: string;
  collegeName: string;
  branchName: string;
  category: string;
  round1Cutoff: number;
  expectedRound2Cutoff: number;
  expectedDrop: number;
  round2Opportunity: true;
}

export interface Round2StrategyResponse {
  missedColleges: MissedCollege[];
  freezeOrFloat: FreezeOrFloatResult;
  round2Opportunities: Round2Opportunity[];
}

export interface FormFillingRequest {
  percentile: number;
  category: string;
  capRound: string;
  branchPreferences: string[];
  budget?: number; // max annual fees in LPA
  preferredDistricts: string[]; // max 3
  priorityMode: 'branch' | 'college';
}

export interface PreferenceEntry {
  rank: number;
  collegeName: string;
  collegeId: string;
  location: string;
  branchName: string;
  entryReason: string;
  cutoffPercentile: number;
  admissionBand: 'Safe' | 'Likely' | 'Moderate' | 'Risky';
  admissionProbability: number;
  fees: string;
  seats?: number;
  avgPackage?: string | null;
}

export interface FormFillingResponse {
  safePicks: PreferenceEntry[];
  targetPicks: PreferenceEntry[];
  dreamPicks: PreferenceEntry[];
  mlAvailable: boolean;
  budgetWarning: boolean;
  /** True when reserved-category data was missing and Open (GOPENS) cutoffs were used as fallback */
  categoryFallback?: boolean;
}

// API Functions

/** Sleep helper for retry backoff */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on transient failures (network errors, 503, 404 cold-start).
 * Retries up to `maxRetries` times with exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Retry on server-side transient codes (cold-start 404/503/502/504)
      if (attempt < maxRetries && [404, 502, 503, 504].includes(res.status)) {
        await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Network request failed after retries');
}

export const api = {
  /**
   * Get college recommendations based on user criteria.
   * Automatically retries on network errors and cold-start 404/503s.
   */
  async getRecommendations(request: RecommendationRequest): Promise<ApiResponse<CollegeRecommendation[]>> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error — please check your connection and try again.');
      }
      throw error;
    }
  },

  /**
   * Get pharmacy college recommendations (PCB — B Pharmacy / D Pharmacy).
   * Uses a separate backend dataset that never mixes with engineering data.
   */
  async getPharmacyRecommendations(request: RecommendationRequest): Promise<ApiResponse<CollegeRecommendation[]>> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/pharmacy/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pharmacy recommendations:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error — please check your connection and try again.');
      }
      throw error;
    }
  },

  /**
   * Get available filter options
   */
  async getFilterOptions(): Promise<ApiResponse<FilterOptions>> {
    try {
      const response = await fetch(`${API_BASE_URL}/filters`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  },

  /**
   * Get all available branches
   */
  async getBranches(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/branches`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  },

  /**
   * Get all available locations
   */
  async getLocations(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/locations`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ dataLoaded: boolean; totalColleges: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  },

  /**
   * Get cutoff history for a specific college-branch-category-capRound combination
   */
  async getCutoffHistory(
    collegeCode: string,
    branch: string,
    category: string,
    capRound: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<CutoffHistoryEntry[]>> {
    const params = new URLSearchParams({ branch, category, capRound });
    const response = await fetch(
      `${API_BASE_URL}/colleges/${encodeURIComponent(collegeCode)}/cutoff-history?${params}`,
      { signal },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Get CAP Round 2 Strategy
   */
  async getRound2Strategy(request: Round2StrategyRequest, signal?: AbortSignal): Promise<ApiResponse<Round2StrategyResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/strategy/round2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching round 2 strategy:', error);
      throw error;
    }
  },

  /**
   * Generate Smart Form Filling List
   */
  async generateFormFillingList(request: FormFillingRequest): Promise<ApiResponse<FormFillingResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/form-filling/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error generating form filling list:', error);
      throw error;
    }
  },
};

export default api;
