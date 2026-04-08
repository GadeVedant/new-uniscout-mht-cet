import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // Single file (legacy) — used if DATA_FILE_PATH is set
  dataFilePath: process.env.DATA_FILE_PATH
    ? path.resolve(__dirname, '../../..', process.env.DATA_FILE_PATH)
    : path.resolve(__dirname, '../../..', 'MHTCET_CAP_DATA.xlsx'),
  // Folder of multiple files — used if DATA_DIR is set (takes priority over dataFilePath)
  // Default: go up from dist/config/ → backend-mhtcet/ → repo root → ml-service/data
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)  // absolute if provided, else resolve relative to cwd
    : path.resolve(__dirname, '../../../..', 'ml-service', 'data'),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;
