export interface CollegeData {
  collegeCode: string;
  collegeName: string;
  branchCode: string;
  branchName: string;
  category: string;
  cutoffPercentile: number;
  year: string;
  capRound: string;
  location: string;
  district: string;
  collegeType: string;
  status: string;
  fees?: number;
  intake?: number;
}

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
  // ML-enriched fields (present when ML_Service is available)
  p10?: number;
  p50?: number;
  p90?: number;
  admissionProbability?: number;
  admissionProbabilityP10?: number;
  admissionProbabilityP90?: number;
  admissionBand?: 'Safe' | 'Likely' | 'Moderate' | 'Risky';
  confidenceLabel?: string;
  topFactors?: string[];
  // Trend + Round 2
  cutoffTrend?: 'rising' | 'falling' | 'stable';
  round2Opportunity?: boolean;
  round2Delta?: number | null;
  // Placement
  avgPackage?: string | null;
  highestPackage?: string | null;
  // Estimated cutoff (when no actual category data exists, derived from Open cutoff)
  estimatedCutoff?: boolean;
}

export interface FilterOptions {
  years: string[];
  capRounds: string[];
  categories: string[];
  branches: string[];
  locations: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    totalResults: number;
    query?: unknown;
    timestamp: string;
    ml_unavailable?: boolean;
  };
}

export interface ExcelRow {
  [key: string]: string | number | undefined;
}

export interface Round2StrategyRequest {
  percentile: number;
  category: string;
  branch: string;
  colleges?: CollegeRecommendation[];
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
  collegePrestScore?: number;
  avgPackage?: number;
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

export interface CutoffHistoryEntry {
  year: number;
  cutoffPercentile: number;
}

export interface FormFillingRequest {
  percentile: number;
  category: string;
  capRound: string;
  branchPreferences: string[];
  budget?: number;
  preferredDistricts: string[];
  priorityMode: 'branch' | 'college';
}

export interface PreferenceEntry {
  rank: number;
  collegeName: string;
  collegeId: string;   // id for detail page navigation
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
