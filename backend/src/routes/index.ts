import { Router } from 'express';
import {
  getRecommendations,
  getFilterOptions,
  healthCheck,
  getBranches,
  getLocations,
  getCategories,
} from '../controllers/recommendationController.js';
import {
  recommendationValidation,
  handleValidationErrors,
} from '../middleware/validation.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', healthCheck);

/**
 * @route   GET /api/filters
 * @desc    Get all available filter options
 * @access  Public
 */
router.get('/filters', getFilterOptions);

/**
 * @route   GET /api/branches
 * @desc    Get all unique branches
 * @access  Public
 */
router.get('/branches', getBranches);

/**
 * @route   GET /api/locations
 * @desc    Get all unique locations
 * @access  Public
 */
router.get('/locations', getLocations);

/**
 * @route   GET /api/categories
 * @desc    Get all unique categories
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   POST /api/recommendations
 * @desc    Get college recommendations based on criteria
 * @access  Public
 */
router.post(
  '/recommendations',
  recommendationValidation,
  handleValidationErrors,
  getRecommendations
);

export default router;
