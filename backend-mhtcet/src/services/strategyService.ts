/**
 * StrategyService — CAP Round 2 Strategy computation.
 * Provides missed colleges, freeze/float advice, and Round 2 opportunities.
 */
import { dataService } from './dataService.js';
import { resolveAdmissionProbability } from '../utils/scoring.js';
import logger from '../utils/logger.js';
import type {
  CollegeRecommendation,
  MissedCollege,
  FreezeOrFloatResult,
  Round2Opportunity,
} from '../types/index.js';

class StrategyService {
  /**
   * Computes the historical average cutoff drop from Round I → Round II
   * for a given college + branch + category combination.
   * Returns null when no paired data exists (falls back to category-wide average).
   */
  computeHistoricalAvgDelta(
    collegeCode: string,
    branchName: string,
    category: string,
  ): number | null {
    const all = dataService.getAllColleges();
    const branchLower = branchName.toLowerCase();
    const catLower = category.toLowerCase();

    const r1ByYear = new Map<string, number>();
    const r2ByYear = new Map<string, number>();

    for (const c of all) {
      if (
        c.collegeCode !== collegeCode ||
        c.branchName.toLowerCase() !== branchLower ||
        c.category.toLowerCase() !== catLower
      ) continue;

      const yr = c.year ?? '';
      if (!yr) continue;

      if (c.capRound === 'I') r1ByYear.set(yr, c.cutoffPercentile);
      else if (c.capRound === 'II') r2ByYear.set(yr, c.cutoffPercentile);
    }

    const deltas: number[] = [];
    for (const [yr, r1] of r1ByYear) {
      const r2 = r2ByYear.get(yr);
      if (r2 !== undefined && r1 > r2) deltas.push(r1 - r2); // only count actual drops
    }

    if (deltas.length >= 2) {
      return deltas.reduce((s, d) => s + d, 0) / deltas.length;
    }

    // Fallback: compute category-wide average delta for this branch
    return this.computeCategoryAvgDelta(branchName, category);
  }

  /**
   * Category-wide average Round I → Round II drop for a branch+category.
   * Used as fallback when a specific college has no paired data.
   */
  private computeCategoryAvgDelta(branchName: string, category: string): number | null {
    const all = dataService.getAllColleges();
    const branchLower = branchName.toLowerCase();
    const catLower = category.toLowerCase();

    // Group by college+year
    type Pair = { r1: number; r2: number };
    const pairs = new Map<string, Pair>();

    for (const c of all) {
      if (c.branchName.toLowerCase() !== branchLower) continue;
      if (c.category.toLowerCase() !== catLower) continue;
      const yr = c.year ?? '';
      if (!yr) continue;
      const key = `${c.collegeCode}||${yr}`;
      const pair = pairs.get(key) ?? { r1: -1, r2: -1 };
      if (c.capRound === 'I') pair.r1 = c.cutoffPercentile;
      else if (c.capRound === 'II') pair.r2 = c.cutoffPercentile;
      pairs.set(key, pair);
    }

    const deltas: number[] = [];
    for (const { r1, r2 } of pairs.values()) {
      if (r1 > 0 && r2 > 0 && r1 > r2) deltas.push(r1 - r2);
    }

    if (deltas.length < 2) return null;
    return deltas.reduce((s, d) => s + d, 0) / deltas.length;
  }

  /**
   * Colleges where Round 1 cutoff exceeds student percentile by (0, 8] pts
   * AND historical avg delta >= 1.5.
   */
  computeMissedColleges(
    percentile: number,
    category: string,
    branch: string,
  ): MissedCollege[] {
    const all = dataService.getAllColleges();
    const catLower = category.toLowerCase();
    const branchLower = branch.toLowerCase();

    // Collect latest Round I cutoff per (collegeCode, branchName, category)
    type Key = string;
    const latestR1 = new Map<Key, { code: string; name: string; branch: string; cutoff: number; year: string }>();

    for (const c of all) {
      if (c.capRound !== 'I') continue;
      if (c.category.toLowerCase() !== catLower) continue;
      if (c.branchName.toLowerCase() !== branchLower) continue;

      const key: Key = `${c.collegeCode}||${c.branchName}||${c.category}`;
      const existing = latestR1.get(key);
      if (!existing || (c.year ?? '') > (existing.year ?? '')) {
        latestR1.set(key, {
          code: c.collegeCode,
          name: c.collegeName,
          branch: c.branchName,
          cutoff: c.cutoffPercentile,
          year: c.year ?? '',
        });
      }
    }

    const results: MissedCollege[] = [];

    for (const [, entry] of latestR1) {
      const delta = entry.cutoff - percentile;
      if (delta <= 0 || delta > 8) continue;

      const avgDelta = this.computeHistoricalAvgDelta(entry.code, entry.branch, category);
      if (avgDelta === null || avgDelta < 1.5) continue;

      const expectedR2Cutoff = parseFloat((entry.cutoff - avgDelta).toFixed(2));
      const r2Delta = entry.cutoff - expectedR2Cutoff;

      // Estimate round2Probability using a simple sigmoid-like mapping
      const margin = percentile - expectedR2Cutoff;
      const round2Probability = Math.round(Math.min(100, Math.max(5, 50 + margin * 10)));

      results.push({
        collegeCode: entry.code,
        collegeName: entry.name,
        branchName: entry.branch,
        category,
        round1Cutoff: entry.cutoff,
        expectedRound2Cutoff: expectedR2Cutoff,
        expectedDrop: parseFloat(r2Delta.toFixed(2)),
        round2Probability,
      });
    }

    return results.sort((a, b) => b.round2Probability - a.round2Probability).slice(0, 10);
  }

  /**
   * Determines whether the student should Freeze or Float their current best option.
   */
  computeFreezeOrFloat(
    colleges: CollegeRecommendation[],
    missedColleges: MissedCollege[],
  ): FreezeOrFloatResult {
    if (colleges.length === 0) {
      return {
        recommendation: 'Freeze',
        reasoning: 'No Round 1 results found. Secure any available seat in Round 2.',
      };
    }

    // Rank best Round 1 option
    const bandOrder: Record<string, number> = { Safe: 4, Likely: 3, Moderate: 2, Risky: 1 };
    const chanceOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

    const best = [...colleges].sort((a, b) => {
      const bA = a.admissionBand ? (bandOrder[a.admissionBand] ?? 0) : (chanceOrder[a.admissionChance] ?? 0);
      const bB = b.admissionBand ? (bandOrder[b.admissionBand] ?? 0) : (chanceOrder[b.admissionChance] ?? 0);
      if (bA !== bB) return bB - bA;
      const pA = resolveAdmissionProbability(a);
      const pB = resolveAdmissionProbability(b);
      return pB - pA;
    })[0];

    // Check if any missed college is significantly better
    const betterOption = missedColleges.find((m) => m.round2Probability >= 50);

    if (betterOption) {
      return {
        recommendation: 'Float',
        reasoning: `${betterOption.collegeName} (${betterOption.branchName}) has historically dropped ${betterOption.expectedDrop.toFixed(1)} pts in Round 2, giving you a ${betterOption.round2Probability}% chance of admission. Consider floating to pursue it.`,
        betterOption,
      };
    }

    const bandLabel = best.admissionBand ?? best.admissionChance;
    return {
      recommendation: 'Freeze',
      reasoning: `Your best current option (${best.name} — ${bandLabel}) is a strong match. No significantly better Round 2 opportunities were found within reach.`,
    };
  }

  /**
   * All colleges in the dataset for given category + branch with avg delta >= 3.0.
   */
  computeRound2Opportunities(category: string, branch: string): Round2Opportunity[] {
    const all = dataService.getAllColleges();
    const catLower = category.toLowerCase();
    const branchLower = branch.toLowerCase();

    const seen = new Set<string>();
    const results: Round2Opportunity[] = [];

    for (const c of all) {
      if (c.capRound !== 'I') continue;
      if (c.category.toLowerCase() !== catLower) continue;
      if (c.branchName.toLowerCase() !== branchLower) continue;

      const key = `${c.collegeCode}||${c.branchName}||${c.category}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const avgDelta = this.computeHistoricalAvgDelta(c.collegeCode, c.branchName, category);
      if (avgDelta === null || avgDelta < 1.5) continue;

      const expectedR2Cutoff = parseFloat((c.cutoffPercentile - avgDelta).toFixed(2));

      results.push({
        collegeCode: c.collegeCode,
        collegeName: c.collegeName,
        branchName: c.branchName,
        category,
        round1Cutoff: c.cutoffPercentile,
        expectedRound2Cutoff: expectedR2Cutoff,
        expectedDrop: parseFloat(avgDelta.toFixed(2)),
        round2Opportunity: true,
      });
    }

    return results.sort((a, b) => b.expectedDrop - a.expectedDrop).slice(0, 20);
  }
}

export const strategyService = new StrategyService();
