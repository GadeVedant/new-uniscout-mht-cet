import { Request, Response, NextFunction } from 'express';
import { validationResult, body, ValidationChain } from 'express-validator';
import logger from '../utils/logger.js';

// Validation rules for recommendation request
export const recommendationValidation: ValidationChain[] = [
  body('percentile')
    .notEmpty()
    .withMessage('Percentile is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Percentile must be between 0 and 100'),
  
  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isString()
    .withMessage('Year must be a string'),
  
  body('capRound')
    .notEmpty()
    .withMessage('CAP Round is required')
    .isIn(['I', 'II', 'III', '1', '2', '3'])
    .withMessage('Invalid CAP Round'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isString()
    .withMessage('Category must be a string'),
  
  body('branchPreference')
    .notEmpty()
    .withMessage('Branch preference is required')
    .isString()
    .withMessage('Branch preference must be a string'),
  
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isString()
    .withMessage('Location must be a string'),
];

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn(`Validation errors: ${JSON.stringify(errors.array())}`);
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

// Error handling middleware
export const errorHandler = (
  err: Error, 
  _req: Request, 
  res: Response, 
  _next: NextFunction
): void => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack || '');

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const { method, path } = req;
  logger.warn(`404 - Route not found: ${method} ${path}`);
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};
