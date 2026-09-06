import { Request, Response } from 'express';
import { pharmacyRecommendationService } from '../services/pharmacyRecommendationService.js';
import logger from '../utils/logger.js';
import type { RecommendationRequest, ApiResponse, CollegeRecommendation } from '../types/index.js';

export const getPharmacyRecommendations = async (
  req: Request<object, ApiResponse<CollegeRecommendation[]>, RecommendationRequest>,
  res: Response<ApiResponse<CollegeRecommendation[]>>,
): Promise<void> => {
  try {
    const body = req.body;

    // Normalise capRound (same as engineering)
    const capRound =
      ['1', 'I', 'i'].includes(body.capRound)   ? 'I'   :
      ['2', 'II', 'ii'].includes(body.capRound)  ? 'II'  :
      ['3', 'III', 'iii'].includes(body.capRound) ? 'III' :
      body.capRound;

    const request: RecommendationRequest = {
      percentile:       parseFloat(String(body.percentile)),
      year:             body.year ?? '',
      capRound,
      category:         body.category,
      branchPreference: body.branchPreference,
      location:         body.location ?? '',
    };

    const { recommendations, locationFallback } =
      await pharmacyRecommendationService.getRecommendations(request);

    res.json({
      success: true,
      data: recommendations,
      metadata: {
        totalResults: recommendations.length,
        query:        request,
        timestamp:    new Date().toISOString(),
        ...(locationFallback ? { location_fallback: true } : {}),
      },
    });
  } catch (error) {
    logger.error(`Pharmacy recommendation error: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to get pharmacy recommendations' });
  }
};
