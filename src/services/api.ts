/**
 * API Service for UNISCOUT College Recommendation System
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
}

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

export interface FilterOptions {
  years: string[];
  capRounds: string[];
  categories: string[];
  branches: string[];
  locations: string[];
}

// API Functions
export const api = {
  /**
   * Get college recommendations based on user criteria
   */
  async getRecommendations(request: RecommendationRequest): Promise<ApiResponse<CollegeRecommendation[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
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
};

export default api;
