import { Request, Response, NextFunction } from 'express';
import { validationResult, body } from 'express-validator';
import logger from '../utils/logger.js';

export const recommendationValidation = [
  body('percentile').notEmpty().isFloat({ min: 0, max: 100 }).withMessage('Percentile must be 0–100'),
  body('year').notEmpty().isString(),
  body('capRound').notEmpty().isIn(['I', 'II', 'III', '1', '2', '3']).withMessage('Invalid CAP Round'),
  body('category').notEmpty().isString(),
  body('branchPreference').notEmpty().isString(),
  body('location').optional({ checkFalsy: true }).isString(), // optional — empty string = no location filter
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation errors: ${JSON.stringify(errors.array())}`);
    res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    return;
  }
  next();
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error(err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
};
