/**
 * Type definitions for UNISCOUT Backend
 */

// College data structure from Excel
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

// Recommendation request body
export interface RecommendationRequest {
  percentile: number;
  year: string;
  capRound: string;
  category: string;
  branchPreference: string;
  location: string;
}

// Processed college recommendation
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
}

// API Response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    totalResults: number;
    query: RecommendationRequest;
    timestamp: string;
  };
}

// Filter options for frontend dropdown
export interface FilterOptions {
  years: string[];
  capRounds: string[];
  categories: string[];
  branches: string[];
  locations: string[];
}

// Raw row from Excel
export interface ExcelRow {
  [key: string]: string | number | undefined;
}
