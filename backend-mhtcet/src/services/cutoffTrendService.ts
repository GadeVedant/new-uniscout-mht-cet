/**
 * CutoffTrendService
 * Computes cutoff trend direction and Round 2 opportunity flags
 * from the in-memory dataset loaded by dataService.
 */
import { dataService } from './dataService.js';

export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface TrendResult {
  cutoffTrend: TrendDirection;
  round2Opportunity: boolean;
  round2Delta: number | null;
}

class CutoffTrendService {
  /**
   * Returns trend direction and Round 2 opportunity for a given
   * college + branch + category + capRound combination.
   */
  getTrend(
    collegeCode: string,
    branchName: string,
    category: string,
    capRound: string,
  ): TrendResult {
    // getAllYearsData() provides multi-year records needed to compute trends.
    // getAllColleges() is deduped to the latest year only — trend would always be 'stable'.
    const all = dataService.getAllYearsData();
    const branchLower = branchName.toLowerCase();
    const catLower = category.toLowerCase();

    // ── Cutoff trend ──────────────────────────────────────────────────────────
    const sameRound = all.filter(
      (c) =>
        c.collegeCode === collegeCode &&
        c.branchName.toLowerCase() === branchLower &&
        c.category.toLowerCase() === catLower &&
        c.capRound === capRound,
    );

    const byYear = new Map<number, number>();
    for (const c of sameRound) {
      const yr = parseInt(c.year, 10);
      if (isNaN(yr)) continue;
      const existing = byYear.get(yr);
      if (existing === undefined || c.cutoffPercentile > existing) {
        byYear.set(yr, c.cutoffPercentile);
      }
    }

    const sortedYears = [...byYear.keys()].sort((a, b) => b - a); // desc
    let cutoffTrend: TrendDirection = 'stable';
    if (sortedYears.length >= 2) {
      const latest = byYear.get(sortedYears[0])!;
      // compare against 2-years-prior if available, else 1-year-prior
      const priorYear = sortedYears.find((y) => y <= sortedYears[0] - 2) ?? sortedYears[1];
      const prior = byYear.get(priorYear)!;
      const delta = latest - prior;
      if (delta > 1.0) cutoffTrend = 'rising';
      else if (delta < -1.0) cutoffTrend = 'falling';
    }

    // ── Round 2 opportunity ───────────────────────────────────────────────────
    // Find paired Round I / Round II rows for same (collegeCode, branch, category) per year
    const round1Rows = all.filter(
      (c) =>
        c.collegeCode === collegeCode &&
        c.branchName.toLowerCase() === branchLower &&
        c.category.toLowerCase() === catLower &&
        c.capRound === 'I',
    );
    const round2Rows = all.filter(
      (c) =>
        c.collegeCode === collegeCode &&
        c.branchName.toLowerCase() === branchLower &&
        c.category.toLowerCase() === catLower &&
        c.capRound === 'II',
    );

    // Build year → cutoff maps for each round
    const r1ByYear = new Map<number, number>();
    for (const c of round1Rows) {
      const yr = parseInt(c.year, 10);
      if (!isNaN(yr)) r1ByYear.set(yr, c.cutoffPercentile);
    }
    const r2ByYear = new Map<number, number>();
    for (const c of round2Rows) {
      const yr = parseInt(c.year, 10);
      if (!isNaN(yr)) r2ByYear.set(yr, c.cutoffPercentile);
    }

    // Compute deltas for years that have both rounds
    const deltas: number[] = [];
    for (const [yr, r1] of r1ByYear) {
      const r2 = r2ByYear.get(yr);
      if (r2 !== undefined) {
        deltas.push(r1 - r2); // positive = cutoff dropped in Round 2
      }
    }

    let round2Opportunity = false;
    let round2Delta: number | null = null;
    if (deltas.length >= 2) {
      const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      round2Delta = parseFloat(avg.toFixed(2));
      round2Opportunity = avg >= 3.0;
    }

    return { cutoffTrend, round2Opportunity, round2Delta };
  }
}

export const cutoffTrendService = new CutoffTrendService();
