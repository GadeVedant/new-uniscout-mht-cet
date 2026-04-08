/**
 * mlPredictionCache: in-process TTL cache for ML prediction results.
 * Cache key: SHA256(college_code|branch_name|category|cap_round|model_version)
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.5
 */
import { createHash } from 'crypto';
import logger from '../utils/logger.js';
import { mlServiceClient, type MLPredictionRequest, type MLPredictionResult } from './mlServiceClient.js';
import { dataService } from './dataService.js';

const ML_CACHE_TTL_MS = parseInt(process.env.ML_CACHE_TTL_SECONDS ?? '3600') * 1000;
const ML_CACHE_WARM_TOP_N = parseInt(process.env.ML_CACHE_WARM_TOP_N ?? '100');

interface CacheEntry {
  result: MLPredictionResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------
export function cacheKey(req: MLPredictionRequest, modelVersion: string): string {
  return createHash('sha256')
    .update(`${req.college_code}|${req.branch_name}|${req.category}|${req.cap_round}|${modelVersion}`)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// get / set
// ---------------------------------------------------------------------------
export function get(req: MLPredictionRequest, modelVersion: string): MLPredictionResult | null {
  const key = cacheKey(req, modelVersion);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function set(req: MLPredictionRequest, modelVersion: string, result: MLPredictionResult): void {
  const key = cacheKey(req, modelVersion);
  cache.set(key, { result, expiresAt: Date.now() + ML_CACHE_TTL_MS });
}

/** Clear all cache entries (for testing). */
export function clearCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Cache warming
// ---------------------------------------------------------------------------

/**
 * Pre-fetch predictions for the top N most-queried combinations.
 * Falls back to top colleges by prestige score if no request history exists.
 * Non-blocking: logs a warning and returns silently if ML service is unavailable.
 */
export async function warmCache(topN: number = ML_CACHE_WARM_TOP_N): Promise<void> {
  try {
    const modelVersion = await mlServiceClient.getModelVersion();
    if (!modelVersion) {
      logger.warn('Cache warming skipped: ML_Service unavailable at startup');
      return;
    }

    const topCombinations = getTopCombinations(topN);
    if (topCombinations.length === 0) {
      logger.info('Cache warming: no combinations found, skipping');
      return;
    }

    const results = await mlServiceClient.predictBatch(topCombinations);
    results.forEach((result, i) => {
      set(topCombinations[i], modelVersion, result);
    });
    logger.info(`Cache warming: pre-fetched ${results.length} predictions`);
  } catch (err) {
    logger.warn('Cache warming skipped: ML_Service unavailable at startup', { err });
  }
}

/**
 * Build top N prediction requests from loaded college data.
 * Uses top colleges sorted by cutoff percentile (proxy for prestige).
 */
function getTopCombinations(topN: number): MLPredictionRequest[] {
  if (!dataService.isLoaded()) return [];

  const colleges = dataService.getAllColleges();
  // Deduplicate by (college_code, branch_name, category, cap_round)
  const seen = new Set<string>();
  const combinations: MLPredictionRequest[] = [];

  // Sort by cutoff descending (highest prestige first)
  const sorted = [...colleges].sort((a, b) => b.cutoffPercentile - a.cutoffPercentile);

  for (const c of sorted) {
    if (combinations.length >= topN) break;
    const capRound = c.capRound as 'I' | 'II' | 'III';
    if (!['I', 'II', 'III'].includes(capRound)) continue;

    const key = `${c.collegeCode}|${c.branchName}|${c.category}|${capRound}`;
    if (seen.has(key)) continue;
    seen.add(key);

    combinations.push({
      college_code: c.collegeCode,
      branch_name: c.branchName,
      category: c.category,
      cap_round: capRound,
      student_percentile: c.cutoffPercentile,
      exam_type: 'mhtcet',
      district: c.district,
    });
  }

  return combinations;
}

export const mlPredictionCache = { get, set, warmCache, cacheKey };
