import { Router } from 'express';
import { getRecommendations, getFilterOptions, healthCheck, getBranches, getLocations, getCategories } from '../controllers/recommendationController.js';
import { getCutoffHistory } from '../controllers/collegeController.js';
import { getRound2Strategy } from '../controllers/strategyController.js';
import { generateFormFillingList } from '../controllers/formFillingController.js';
import { recommendationValidation, handleValidationErrors } from '../middleware/validation.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/filters', getFilterOptions);
router.get('/branches', getBranches);
router.get('/locations', getLocations);
router.get('/categories', getCategories);
router.post('/recommendations', recommendationValidation, handleValidationErrors, getRecommendations);
router.get('/colleges/:collegeCode/cutoff-history', getCutoffHistory);
router.post('/strategy/round2', getRound2Strategy);
router.post('/form-filling/generate', generateFormFillingList);

export default router;
