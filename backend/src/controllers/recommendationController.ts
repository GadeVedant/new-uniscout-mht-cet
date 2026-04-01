import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService.js';
import { dataService } from '../services/dataService.js';
import logger from '../utils/logger.js';
import type { RecommendationRequest, ApiResponse, CollegeRecommendation, FilterOptions } from '../types/index.js';

/**
 * Get college recommendations based on user criteria
 * POST /api/recommendations
 */
export const getRecommendations = async (
  req: Request<{}, ApiResponse<CollegeRecommendation[]>, RecommendationRequest>,
  res: Response<ApiResponse<CollegeRecommendation[]>>
): Promise<void> => {
  try {
    const requestBody = req.body;

    // Normalize CAP round
    const capRound = ['1', 'I', 'i'].includes(requestBody.capRound) ? 'I' : 
                     ['2', 'II', 'ii'].includes(requestBody.capRound) ? 'II' : 
                     requestBody.capRound;

    const request: RecommendationRequest = {
      percentile: parseFloat(String(requestBody.percentile)),
      year: requestBody.year,
      capRound,
      category: requestBody.category,
      branchPreference: requestBody.branchPreference,
      location: requestBody.location,
    };

    logger.info(`Recommendation request received: ${JSON.stringify(request)}`);

    const recommendations = recommendationService.getRecommendations(request);

    res.json({
      success: true,
      data: recommendations,
      metadata: {
        totalResults: recommendations.length,
        query: request,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`Error getting recommendations: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get available filter options
 * GET /api/filters
 */
export const getFilterOptions = async (
  _req: Request,
  res: Response<ApiResponse<FilterOptions>>
): Promise<void> => {
  try {
    const filterOptions = dataService.getFilterOptions();
    
    res.json({
      success: true,
      data: filterOptions,
    });
  } catch (error) {
    logger.error(`Error getting filter options: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get filter options',
    });
  }
};

/**
 * Health check endpoint
 * GET /api/health
 */
export const healthCheck = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const stats = recommendationService.getStats();
  const isDataLoaded = dataService.isLoaded();

  res.json({
    success: true,
    status: 'healthy',
    data: {
      dataLoaded: isDataLoaded,
      ...stats,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Get all unique branches
 * GET /api/branches
 */
export const getBranches = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const filterOptions = dataService.getFilterOptions();
    
    res.json({
      success: true,
      data: filterOptions.branches,
    });
  } catch (error) {
    logger.error(`Error getting branches: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get branches',
    });
  }
};

/**
 * Get all unique locations
 * GET /api/locations
 */
export const getLocations = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const filterOptions = dataService.getFilterOptions();
    
    res.json({
      success: true,
      data: filterOptions.locations,
    });
  } catch (error) {
    logger.error(`Error getting locations: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get locations',
    });
  }
};

/**
 * Get all unique categories
 * GET /api/categories
 */
export const getCategories = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const filterOptions = dataService.getFilterOptions();
    
    res.json({
      success: true,
      data: filterOptions.categories,
    });
  } catch (error) {
    logger.error(`Error getting categories: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
    });
  }
};
