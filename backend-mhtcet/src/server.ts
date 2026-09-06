import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/validation.js';
import { dataService } from './services/dataService.js';
import { pharmacyDataService } from './services/pharmacyDataService.js';
import { placementLoader } from './services/placementLoader.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = [
      config.corsOrigin,
      config.corsOrigin.replace(/\/$/, ''), // without trailing slash
      config.corsOrigin + '/',              // with trailing slash
      'https://uniscout-frontend.onrender.com',
      'https://www.uniscout.co.in',
      'https://www.uniscout.co.in',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.maxRequests }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

app.use('/api', routes);
app.get('/', (_req, res) => res.json({ success: true, message: 'UNISCOUT MHT-CET Backend', version: '1.0.0' }));
// Convenience shortcut — Render health checks use /health
app.get('/health', (_req, res) => res.redirect('/api/health'));
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  const startTime = Date.now();
  try {
    logger.info(`Data dir: ${config.dataDir}`);
    logger.info(`Data dir exists: ${fs.existsSync(config.dataDir)}`);
    await dataService.loadData();
    await pharmacyDataService.loadData();
    await placementLoader.load(process.env.PLACEMENT_DATA_PATH ?? './data/placement_data_2025_26.csv');
    app.listen(config.port, () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const msg = `MHT-CET backend running on port ${config.port} (started in ${elapsed}s)`;
      logger.info(msg);
      // Also write directly to stdout so it always appears in terminal
      process.stdout.write(`\n✅ ${msg}\n\n`);
    });
  } catch (err) {
    logger.error(`Failed to start: ${err}`);
    process.exit(1);
  }
}

start();
