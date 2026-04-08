import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // Single file (legacy) — kept for local dev only, not used in production
  dataFilePath: process.env.DATA_FILE_PATH
    ? path.resolve(__dirname, '../../..', process.env.DATA_FILE_PATH)
    : path.resolve(__dirname, '..', 'data', 'cap1_2024.csv'), // fallback to a real CSV
  // Folder of multiple files — used if DATA_DIR is set (takes priority over dataFilePath)
  dataDir: (() => {
    if (process.env.DATA_DIR) {
      const d = process.env.DATA_DIR;
      return path.isAbsolute(d) ? d : path.resolve(__dirname, '../..', d);
    }
    // Default: dist/data (copied there during build)
    return path.resolve(__dirname, '..', 'data');
  })(),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;
