/**
 * RecommendationService: rule-based filtering + ML enrichment.
 *
 * Feature: mhtcet-cutoff-prediction
 * Requirements: 7.1–7.5, 10.3
 */
import { randomUUID } from 'crypto';
import { dataService } from './dataService.js';
import { mlServiceClient, type MLPredictionRequest } from './mlServiceClient.js';
import { get as cacheGet, set as cacheSet } from './mlPredictionCache.js';
import { cutoffTrendService } from './cutoffTrendService.js';
import { placementLoader } from './placementLoader.js';
import logger from '../utils/logger.js';
import type { RecommendationRequest, CollegeRecommendation, CollegeData, ApiResponse } from '../types/index.js';

// Branch alias map for strict matching
const BRANCH_ALIASES: Record<string, string[]> = {
  'computer engineering': ['computer engineering', 'comp engg', 'comp engineering'],
  'computer science and engineering': ['computer science and engineering', 'computer science & engineering', 'cse', 'computer science'],
  'information technology': ['information technology', 'it'],
  'electronics and telecommunication engineering': ['electronics and telecommunication engineering', 'electronics & telecommunication engineering', 'entc', 'e&tc', 'electronics and telecommunication'],
  'mechanical engineering': ['mechanical engineering', 'mech engineering', 'mech engg'],
  'civil engineering': ['civil engineering', 'civil engg'],
  'electrical engineering': ['electrical engineering', 'electrical engg'],
  'artificial intelligence and data science': ['artificial intelligence and data science', 'artificial intelligence & data science', 'ai and data science', 'ai & data science', 'aids'],
  'artificial intelligence and machine learning': ['artificial intelligence and machine learning', 'artificial intelligence & machine learning', 'ai and machine learning', 'ai & machine learning', 'aiml'],
};

// Cached model version fetched at startup
let _modelVersion: string | null = null;

class RecommendationService {
  /**
   * Initialise: fetch model version from ML service for cache key construction.
   * Non-blocking — if ML service is unavailable, model version stays null.
   */
  async init(): Promise<void> {
    _modelVersion = await mlServiceClient.getModelVersion();
    if (_modelVersion) {
      logger.info(`RecommendationService: ML model version = ${_modelVersion}`);
    } else {
      logger.warn('RecommendationService: ML service unavailable at startup, ML enrichment disabled until service is reachable');
    }
  }

  // ---------------------------------------------------------------------------
  // 15.1 getRecommendations — rule-based filter + ML enrichment
  // ---------------------------------------------------------------------------
  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<{ recommendations: CollegeRecommendation[]; mlUnavailable: boolean }> {
    const requestId = randomUUID();
    const { percentile, year, capRound, category, branchPreference, location } = request;
    logger.info(`MHT-CET recommendation: percentile=${percentile}, year=${year}, capRound=${capRound}, category=${category}, requestId=${requestId}`);

    // ---- Rule-based filter ----
    const applyFilters = (withLocation: boolean) => dataService.getAllColleges().filter(c => {
      if (year && c.year !== year) return false;
      if (capRound && c.capRound !== capRound) return false;
      if (category) {
        const norm = category.toLowerCase().trim();
        const cNorm = c.category.toLowerCase().trim();
        if (norm !== 'open') {
          if (cNorm !== norm && cNorm !== 'open') return false;
        } else {
          if (cNorm !== 'open') return false;
        }
      }
      if (branchPreference && !this.branchMatches(branchPreference, c.branchName)) return false;
      if (withLocation && location) {
        const loc = location.toLowerCase();
        if (!c.location.toLowerCase().includes(loc) && !c.district.toLowerCase().includes(loc)) return false;
      }
      return true;
    });

    let filtered = applyFilters(true);

    // If location filter yields no results, fall back to all locations
    if (filtered.length === 0 && location) {
      logger.info(`No results for location="${location}", falling back to all locations`);
      filtered = applyFilters(false);
    }

    logger.info(`Filtered to ${filtered.length} colleges`);

    const recommendations = filtered
      .map(c => this.buildRecommendation(c, percentile))
      .filter(r => r.percentileDifference >= -5)
      .sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        const diff = order[a.admissionChance] - order[b.admissionChance];
        return diff !== 0 ? diff : b.cutoffPercentile - a.cutoffPercentile;
      })
      .slice(0, 50);

    // ---- ML enrichment ----
    const mlUnavailable = await this.enrichWithML(recommendations, percentile, capRound, requestId);

    // ---- Trend + placement enrichment (always runs, independent of ML) ----
    for (const rec of recommendations) {
      const trend = cutoffTrendService.getTrend(rec.code, rec.branch, rec.category, rec.capRound);
      rec.cutoffTrend = trend.cutoffTrend;
      rec.round2Opportunity = trend.round2Opportunity;
      rec.round2Delta = trend.round2Delta;

      const placement = placementLoader.getPlacement(rec.code, rec.name);
      rec.avgPackage = placement.avgPackage;
      rec.highestPackage = placement.highestPackage;
    }

    return { recommendations, mlUnavailable };
  }

  // ---------------------------------------------------------------------------
  // 15.2 ML enrichment with graceful fallback
  // ---------------------------------------------------------------------------
  private async enrichWithML(
    recommendations: CollegeRecommendation[],
    studentPercentile: number,
    capRound: string,
    requestId: string,
  ): Promise<boolean> {
    if (recommendations.length === 0) return false;

    const modelVersion = _modelVersion ?? 'unknown';
    const validCapRounds = new Set(['I', 'II', 'III']);
    const normalizedCapRound = validCapRounds.has(capRound) ? (capRound as 'I' | 'II' | 'III') : 'I';

    // Build ML requests, check cache for each
    const mlRequests: MLPredictionRequest[] = recommendations.map(r => ({
      college_code: r.code,
      branch_name: r.branch,
      category: r.category,
      cap_round: normalizedCapRound,
      student_percentile: studentPercentile,
      exam_type: 'mhtcet',
      district: r.district,
    }));

    // Separate cache hits from misses
    const cacheMissIndices: number[] = [];
    const cacheMissRequests: MLPredictionRequest[] = [];

    mlRequests.forEach((req, i) => {
      const cached = cacheGet(req, modelVersion);
      if (cached) {
        this.applyMLResult(recommendations[i], cached);
      } else {
        cacheMissIndices.push(i);
        cacheMissRequests.push(req);
      }
    });

    if (cacheMissRequests.length === 0) return false;

    // Call ML service for cache misses
    try {
      const results = await mlServiceClient.predictBatch(cacheMissRequests, requestId);
      results.forEach((result, j) => {
        const i = cacheMissIndices[j];
        this.applyMLResult(recommendations[i], result);
        cacheSet(cacheMissRequests[j], modelVersion, result);
      });
      return false;
    } catch (err: unknown) {
      // 15.2 Graceful fallback
      const reason = this.classifyError(err);
      logger.warn('ML_Service fallback', {
        request_id: requestId,
        reason,
        affected: cacheMissRequests.map(r => ({
          college_code: r.college_code,
          branch_name: r.branch_name,
          category: r.category,
          cap_round: r.cap_round,
        })),
      });
      return true;
    }
  }

  private applyMLResult(rec: CollegeRecommendation, result: import('./mlServiceClient.js').MLPredictionResult): void {
    rec.p10 = result.p10;
    rec.p50 = result.p50;
    rec.p90 = result.p90;
    rec.admissionProbability = result.admission_probability;
    rec.admissionProbabilityP10 = result.p10 != null ? Math.round(result.p10) : undefined;
    rec.admissionProbabilityP90 = result.p90 != null ? Math.round(result.p90) : undefined;
    rec.admissionBand = result.admission_band as 'Safe' | 'Likely' | 'Moderate' | 'Risky';
    rec.confidenceLabel = result.confidence_label;
    rec.topFactors = result.top_factors;
    // Backward-compat: map band → admissionChance
    if (rec.admissionBand === 'Safe' || rec.admissionBand === 'Likely') rec.admissionChance = 'High';
    else if (rec.admissionBand === 'Moderate') rec.admissionChance = 'Medium';
    else if (rec.admissionBand === 'Risky') rec.admissionChance = 'Low';
  }

  private classifyError(err: unknown): 'timeout' | 'non_200' | 'unreachable' {
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      if (e['code'] === 'ECONNABORTED' || e['code'] === 'ETIMEDOUT') return 'timeout';
      if (e['response']) return 'non_200';
    }
    return 'unreachable';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private buildRecommendation(college: CollegeData, percentile: number): CollegeRecommendation {
    const diff = parseFloat((percentile - college.cutoffPercentile).toFixed(2));
    const chance: 'High' | 'Medium' | 'Low' = diff >= 3 ? 'High' : diff >= 0 ? 'Medium' : 'Low';
    return {
      id: `${college.collegeCode}-${college.branchCode}-${college.category}`,
      name: college.collegeName,
      code: college.collegeCode,
      branch: college.branchName,
      branchCode: college.branchCode,
      location: college.location,
      district: college.district,
      category: college.category,
      cutoffPercentile: college.cutoffPercentile,
      percentileDifference: diff,
      collegeType: college.collegeType,
      fees: college.fees ? `₹${college.fees.toLocaleString('en-IN')}` : 'N/A',
      seats: college.intake || 0,
      admissionChance: chance,
      capRound: college.capRound,
      year: college.year,
    };
  }

  private branchMatches(preference: string, collegeBranch: string): boolean {
    const pref = preference.toLowerCase().trim();
    const branch = collegeBranch.toLowerCase().trim();
    if (branch === pref) return true;
    for (const [canonical, aliases] of Object.entries(BRANCH_ALIASES)) {
      if (aliases.includes(pref) || pref === canonical) {
        if (aliases.includes(branch) || branch === canonical) return true;
      }
    }
    return false;
  }
}

export const recommendationService = new RecommendationService();
