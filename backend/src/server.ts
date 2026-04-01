import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/validation.js';
import { dataService } from './services/dataService.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'UNISCOUT College Recommendation System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      filters: '/api/filters',
      branches: '/api/branches',
      locations: '/api/locations',
      categories: '/api/categories',
      recommendations: 'POST /api/recommendations',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    // Load data before starting server
    logger.info('Loading college data...');
    await dataService.loadData();
    
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📚 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 CORS enabled for: ${config.corsOrigin}`);
      logger.info(`📊 Data loaded successfully`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();

export default app;
