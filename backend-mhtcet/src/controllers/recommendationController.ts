import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService.js';
import { dataService } from '../services/dataService.js';
import logger from '../utils/logger.js';
import type { RecommendationRequest, ApiResponse, CollegeRecommendation } from '../types/index.js';

export const getRecommendations = async (
  req: Request<object, ApiResponse<CollegeRecommendation[]>, RecommendationRequest>,
  res: Response<ApiResponse<CollegeRecommendation[]>>
): Promise<void> => {
  try {
    const body = req.body;
    const capRound = ['1', 'I', 'i'].includes(body.capRound) ? 'I'
      : ['2', 'II', 'ii'].includes(body.capRound) ? 'II'
      : ['3', 'III', 'iii'].includes(body.capRound) ? 'III'
      : body.capRound;

    const request: RecommendationRequest = {
      percentile: parseFloat(String(body.percentile)),
      year: body.year,
      capRound,
      category: body.category,
      branchPreference: body.branchPreference,
      location: body.location,
    };

    const { recommendations, mlUnavailable, locationFallback } = await recommendationService.getRecommendations(request);
    res.json({
      success: true,
      data: recommendations,
      metadata: {
        totalResults: recommendations.length,
        query: request,
        timestamp: new Date().toISOString(),
        ...(mlUnavailable ? { ml_unavailable: true } : {}),
        ...(locationFallback ? { location_fallback: true } : {}),
      },
    });
  } catch (error) {
    logger.error(`Error: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
};

export const getFilterOptions = (_req: Request, res: Response): void => {
  res.json({ success: true, data: dataService.getFilterOptions() });
};

export const getBranches = (_req: Request, res: Response): void => {
  res.json({ success: true, data: dataService.getFilterOptions().branches });
};

export const getLocations = (_req: Request, res: Response): void => {
  res.json({ success: true, data: dataService.getFilterOptions().locations });
};

export const getCategories = (_req: Request, res: Response): void => {
  res.json({ success: true, data: dataService.getFilterOptions().categories });
};

export const healthCheck = (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'MHT-CET Backend is running', stats: dataService.getStats() });
};
