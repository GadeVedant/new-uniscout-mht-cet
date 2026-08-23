/**
 * FormFillingService — generates a ranked preference list for CAP form filling.
 */
import { dataService } from './dataService.js';
import { mlServiceClient } from './mlServiceClient.js';
import { categoryMatches } from '../utils/categoryMap.js';
import { placementLoader } from './placementLoader.js';
import {
  resolveAdmissionProbability,
  computeWeightedScore,
  generateEntryReason,
  parseAnnualFees,
} from '../utils/scoring.js';
import logger from '../utils/logger.js';
import type { CollegeRecommendation, FormFillingRequest, PreferenceEntry, FormFillingResponse } from '../types/index.js';

const FORM_FILLING_MAX_ENTRIES = parseInt(process.env.FORM_FILLING_MAX_ENTRIES ?? '50', 10);

// Branch alias map (mirrors recommendationService)
const BRANCH_ALIASES: Record<string, string[]> = {
  'computer engineering': ['computer engineering', 'comp engg', 'comp engineering'],
  'computer science and engineering': ['computer science and engineering', 'computer science & engineering', 'cse', 'computer science'],
  'information technology': ['information technology', 'it'],
  'electronics and telecommunication engineering': ['electronics and telecommunication engineering', 'electronics & telecommunication engineering', 'entc', 'e&tc', 'electronics and telecommunication', 'electronics and telecommunication engg', 'electronics & telecommunication engg'],
  'mechanical engineering': ['mechanical engineering', 'mech engineering', 'mech engg'],
  'civil engineering': ['civil engineering', 'civil engg'],
  'electrical engineering': ['electrical engineering', 'electrical engg'],
  'artificial intelligence and data science': ['artificial intelligence and data science', 'artificial intelligence & data science', 'ai and data science', 'ai & data science', 'aids', 'artificial intelligence (ai) and data science'],
  'artificial intelligence and machine learning': ['artificial intelligence and machine learning', 'artificial intelligence & machine learning', 'ai and machine learning', 'ai & machine learning', 'aiml'],
  'artificial intelligence': ['artificial intelligence and data science', 'artificial intelligence & data science', 'ai and data science', 'ai & data science', 'aids', 'artificial intelligence (ai) and data science', 'artificial intelligence and machine learning', 'artificial intelligence & machine learning', 'ai and machine learning', 'ai & machine learning', 'aiml'],
};

function branchMatches(preference: string, collegeBranch: string): boolean {
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

function assignTier(
  admissionBand: string | undefined,
  admissionChance: string,
  cutoff: number,
  studentPercentile: number,
): 'safe' | 'target' | 'dream' | null {
  const diff = studentPercentile - cutoff; // positive = student is above cutoff

  // Rule-based tier from percentile difference (always reliable)
  let ruleTier: 'safe' | 'target' | 'dream' | null;
  if (diff >= 3) ruleTier = 'safe';
  else if (diff >= 0) ruleTier = 'target';
  else if (diff >= -5) ruleTier = 'dream';
  else ruleTier = null; // too far below cutoff — exclude

  // ML band — only trust it when it's more optimistic or equally conservative
  // Never let ML downgrade a rule-based safe/target to risky
  if (admissionBand === 'Safe' || admissionBand === 'Likely') return 'safe';
  if (admissionBand === 'Moderate') return ruleTier === 'safe' ? 'safe' : 'target';

  // For 'Risky' or undefined ML band, fall back to rule-based
  return ruleTier;
}

class FormFillingService {
  async generatePreferenceList(request: FormFillingRequest): Promise<{
    response: FormFillingResponse;
    mlUnavailable: boolean;
    budgetWarning: boolean;
  }> {
    const { percentile, category, capRound, branchPreferences, budget, preferredDistricts, priorityMode } = request;

    // ── 1. Filter candidates ──────────────────────────────────────────────────
    const all = dataService.getAllColleges();
    let candidates = all.filter((c) => {
      if (c.capRound !== capRound) return false;
      if (!categoryMatches(c.category, category)) return false;
      return branchPreferences.some((pref) => branchMatches(pref, c.branchName));
    });

    // Fallback 1: if no results, try without capRound filter
    if (candidates.length === 0) {
      logger.info(`FormFilling: no results for capRound=${capRound}, trying without round filter`);
      candidates = all.filter((c) => {
        if (!categoryMatches(c.category, category)) return false;
        return branchPreferences.some((pref) => branchMatches(pref, c.branchName));
      });
    }

    // Fallback 2: if still no results, relax to GOPENS group
    if (candidates.length === 0) {
      logger.info(`FormFilling: no results for category=${category}, trying GOPENS fallback`);
      candidates = all.filter((c) => {
        if (!categoryMatches(c.category, 'GOPENS')) return false;
        return branchPreferences.some((pref) => branchMatches(pref, c.branchName));
      });
    }

    // Dedup: keep one record per college+branch — lowest cutoff (most accessible for the category)
    const bestPerCollegeBranch = new Map<string, typeof candidates[0]>();
    for (const c of candidates) {
      const key = `${c.collegeCode}|${c.branchName}`;
      const existing = bestPerCollegeBranch.get(key);
      if (!existing || c.cutoffPercentile < existing.cutoffPercentile) {
        bestPerCollegeBranch.set(key, c);
      }
    }
    candidates = [...bestPerCollegeBranch.values()];

    // ── 2. District filter (hard filter with fallback) ──
    if (preferredDistricts.length > 0) {
      const districtLower = preferredDistricts.map((d) => d.toLowerCase().trim());
      const inDistrict = candidates.filter((c) =>
        districtLower.some((d) => c.district?.toLowerCase().includes(d) || c.location?.toLowerCase().includes(d))
      );
      if (inDistrict.length > 0) {
        candidates = inDistrict;
        logger.info(`FormFilling: district filter kept ${candidates.length} colleges in [${preferredDistricts.join(', ')}]`);
      } else {
        logger.info(`FormFilling: no colleges in [${preferredDistricts.join(', ')}], keeping all ${candidates.length} colleges`);
      }
    }

    // ── 3. Budget filter ──────────────────────────────────────────────────────
    let budgetWarning = false;
    if (budget != null && budget > 0) {
      const beforeBudget = candidates.length;
      candidates = candidates.filter((c) => {
        const annual = parseAnnualFees(c.fees ? `₹${c.fees}` : null);
        if (annual === null) return true; // unknown fees — include
        return annual / 100000 <= budget; // budget is in Lakhs
      });
      if (candidates.length === 0 || candidates.length < 5) budgetWarning = true;
      if (beforeBudget > 0 && candidates.length < beforeBudget) {
        logger.info(`FormFilling: budget filter removed ${beforeBudget - candidates.length} colleges`);
      }
    }

    // ── 3. Build CollegeRecommendation stubs ──────────────────────────────────
    const recs: CollegeRecommendation[] = candidates.map((c) => {
      const diff = parseFloat((percentile - c.cutoffPercentile).toFixed(2));
      const chance: 'High' | 'Medium' | 'Low' = diff >= 3 ? 'High' : diff >= 0 ? 'Medium' : 'Low';
      return {
        id: `${c.collegeCode}-${c.branchCode}-${c.category}`,
        name: c.collegeName,
        code: c.collegeCode,
        branch: c.branchName,
        branchCode: c.branchCode,
        location: c.location,
        district: c.district,
        category: c.category,
        cutoffPercentile: c.cutoffPercentile,
        percentileDifference: diff,
        collegeType: c.collegeType,
        fees: c.fees ? `₹${c.fees.toLocaleString('en-IN')}` : 'N/A',
        seats: c.intake || 0,
        admissionChance: chance,
        capRound: c.capRound,
        year: c.year,
      };
    });

    // ── 4. ML enrichment ──────────────────────────────────────────────────────
    let mlUnavailable = false;
    try {
      const mlRequests = recs.map((r) => ({
        college_code: r.code,
        branch_name: r.branch,
        category: r.category,
        cap_round: capRound as 'I' | 'II' | 'III',
        student_percentile: percentile,
        exam_type: 'mhtcet' as const,
        district: r.district,
      }));
      const results = await mlServiceClient.predictBatch(mlRequests, 'form-filling');
      results.forEach((result, i) => {
        recs[i].admissionProbability = result.admission_probability;
        recs[i].confidenceLabel = result.confidence_label;
        recs[i].topFactors = result.top_factors;

        // Trust the ML band when it's a real prediction (not a fallback).
        // Only fall back to rule-based if ML returned a fallback_reason (no training data).
        if (result.fallback_reason) {
          const diff = recs[i].percentileDifference ?? 0;
          recs[i].admissionBand = diff >= 10 ? 'Safe' : diff >= 5 ? 'Likely' : diff >= 0 ? 'Moderate' : 'Risky';
        } else {
          recs[i].admissionBand = result.admission_band as 'Safe' | 'Likely' | 'Moderate' | 'Risky';
        }
      });
    } catch {
      mlUnavailable = true;
      logger.warn('FormFillingService: ML unavailable, using rule-based fallback');
    }

    // ── 5. Score + tier assignment ────────────────────────────────────────────
    // Get max avg package from placement data for scoring
    const allPlacements = recs.map(r => {
      const p = placementLoader.getPlacement(r.code, r.name);
      r.avgPackage = p.avgPackage;
      r.highestPackage = p.highestPackage;
      const pkg = p.avgPackage ? parseFloat(p.avgPackage.replace(/[^0-9.]/g, '')) : 0;
      return isNaN(pkg) ? 0 : pkg;
    });
    const maxAvgPackage = Math.max(0, ...allPlacements);

    type TieredEntry = { rec: CollegeRecommendation; tier: 'safe' | 'target' | 'dream'; score: number; branchRank: number };
    const tiered: TieredEntry[] = [];

    for (const rec of recs) {
      const tier = assignTier(rec.admissionBand, rec.admissionChance, rec.cutoffPercentile, percentile);
      if (!tier) continue;

      const score = computeWeightedScore(rec, maxAvgPackage);
      const branchRank = branchPreferences.findIndex((p) => branchMatches(p, rec.branch));

      tiered.push({ rec, tier, score, branchRank: branchRank === -1 ? 99 : branchRank });
    }

    // ── 6. Sort within tiers ──────────────────────────────────────────────────
    const sortFn = (a: TieredEntry, b: TieredEntry) => {
      if (priorityMode === 'branch') {
        if (a.branchRank !== b.branchRank) return a.branchRank - b.branchRank;
        return b.score - a.score;
      }
      return b.score - a.score;
    };

    const safe = tiered.filter((e) => e.tier === 'safe').sort(sortFn);
    const target = tiered.filter((e) => e.tier === 'target').sort(sortFn);
    const dream = tiered.filter((e) => e.tier === 'dream').sort(sortFn);

    // ── 7. Assemble final list ────────────────────────────────────────────────
    let rank = 1;
    const toEntry = (e: TieredEntry): PreferenceEntry => ({
      rank: rank++,
      collegeName: e.rec.name,
      collegeId: e.rec.id,
      location: e.rec.location,
      branchName: e.rec.branch,
      entryReason: generateEntryReason(e.rec, maxAvgPackage),
      cutoffPercentile: e.rec.cutoffPercentile,
      admissionBand: (e.rec.admissionBand ?? (e.rec.admissionChance === 'High' ? 'Safe' : e.rec.admissionChance === 'Medium' ? 'Moderate' : 'Risky')) as 'Safe' | 'Likely' | 'Moderate' | 'Risky',
      admissionProbability: Math.round(resolveAdmissionProbability(e.rec) * 100),
      fees: e.rec.fees,
      seats: e.rec.seats || undefined,
      avgPackage: e.rec.avgPackage,
    });

    const allEntries = [...safe, ...target, ...dream].slice(0, FORM_FILLING_MAX_ENTRIES);

    const safePicks = allEntries.filter((e) => e.tier === 'safe').map(toEntry);
    const targetPicks = allEntries.filter((e) => e.tier === 'target').map(toEntry);
    const dreamPicks = allEntries.filter((e) => e.tier === 'dream').map(toEntry);

    return {
      response: { safePicks, targetPicks, dreamPicks, mlAvailable: !mlUnavailable, budgetWarning },
      mlUnavailable,
      budgetWarning,
    };
  }
}

export const formFillingService = new FormFillingService();
