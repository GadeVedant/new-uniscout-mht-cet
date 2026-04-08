/**
 * Frontend shared scoring utilities.
 * Single source of truth — never redefine these locally.
 */
import type { CollegeRecommendation } from '../services/api';

export const DEFAULT_WEIGHTS = { prob: 0.50, placement: 0.25, prestige: 0.25 };
export const FALLBACK_WEIGHTS_NO_PACKAGE = { prob: 0.65, placement: 0, prestige: 0.35 };

export const PRESTIGE_SCORES: Record<string, number> = {
  autonomous: 0.9,
  government: 0.85,
  aided: 0.7,
  unaided: 0.5,
  private: 0.5,
};

function prestigeScore(collegeType: string): number {
  const key = collegeType.toLowerCase().trim();
  for (const [k, v] of Object.entries(PRESTIGE_SCORES)) {
    if (key.includes(k)) return v;
  }
  return 0.5;
}

export function resolveAdmissionProbability(college: CollegeRecommendation): number {
  if (college.admissionProbability != null) {
    return Math.min(1, Math.max(0, college.admissionProbability / 100));
  }
  if (college.admissionChance === 'High') return 0.85;
  if (college.admissionChance === 'Medium') return 0.60;
  return 0.35;
}

export function parseAnnualFees(fees: string | undefined | null): number | null {
  if (!fees || fees === 'N/A') return null;
  const cleaned = fees.replace(/[₹,\s]/g, '').toLowerCase();
  if (cleaned.includes('lpa')) {
    const n = parseFloat(cleaned.replace('lpa', '').replace('(total)', '').trim());
    return isNaN(n) || n === 0 ? null : n;
  }
  const n = parseFloat(cleaned);
  if (isNaN(n) || n === 0) return null;
  return n > 500000 ? n / 4 : n;
}

export function parsePackageLPA(pkg: string | null | undefined): number | null {
  if (!pkg) return null;
  const cleaned = pkg.replace(/[₹,\s]/g, '').toLowerCase().replace('lpa', '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n === 0 ? null : n;
}

export function computeWeightedScore(
  college: CollegeRecommendation,
  maxAvgPackage: number,
  weights = DEFAULT_WEIGHTS,
): number {
  const prob = resolveAdmissionProbability(college);
  const pkg = parsePackageLPA(college.avgPackage ?? null);
  const placementScore = pkg != null && maxAvgPackage > 0 ? pkg / maxAvgPackage : 0;
  const prestige = prestigeScore(college.collegeType);
  const w = pkg != null ? weights : FALLBACK_WEIGHTS_NO_PACKAGE;
  const total = w.prob + w.placement + w.prestige;
  return (w.prob * prob + w.placement * placementScore + w.prestige * prestige) / total;
}

export function generateEntryReason(college: CollegeRecommendation, maxAvgPackage: number): string {
  const prob = resolveAdmissionProbability(college);
  if (prob < 0.20) return 'Best available option in your range';
  const pkg = parsePackageLPA(college.avgPackage ?? null);
  const placementScore = pkg != null && maxAvgPackage > 0 ? pkg / maxAvgPackage : 0;
  const prestige = prestigeScore(college.collegeType);
  const factors = [
    { label: 'admission probability', score: prob * DEFAULT_WEIGHTS.prob },
    { label: 'placement outcome', score: placementScore * DEFAULT_WEIGHTS.placement },
    { label: 'college prestige', score: prestige * DEFAULT_WEIGHTS.prestige },
  ].sort((a, b) => b.score - a.score);
  return `Strong ${factors.slice(0, 2).map((f) => f.label).join(' and ')}`;
}

export interface ScoredCollege {
  college: CollegeRecommendation;
  score: number;
}

export interface BestPickResult {
  winners: CollegeRecommendation[];
  isTie: boolean;
}

export function computeWeightedScores(
  colleges: CollegeRecommendation[],
  weights = DEFAULT_WEIGHTS,
): ScoredCollege[] {
  const maxPkg = Math.max(
    0,
    ...colleges.map((c) => parsePackageLPA(c.avgPackage ?? null) ?? 0),
  );
  return colleges.map((c) => ({ college: c, score: computeWeightedScore(c, maxPkg, weights) }));
}

export function computeBestPick(colleges: CollegeRecommendation[]): BestPickResult {
  if (colleges.length === 0) return { winners: [], isTie: false };
  const scored = computeWeightedScores(colleges);
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  const winners = scored.filter((s) => Math.abs(s.score - best) < 0.001).map((s) => s.college);
  return { winners, isTie: winners.length > 1 };
}

export function computeBestValueHighlights(
  colleges: CollegeRecommendation[],
): Record<string, boolean[]> {
  const n = colleges.length;
  const highlight = (vals: (number | null)[], higherIsBetter: boolean): boolean[] => {
    const valid = vals.filter((v): v is number => v != null);
    if (valid.length < 2) return Array(n).fill(false);
    const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
    return vals.map((v) => v === best);
  };

  const cutoffs = colleges.map((c) => c.cutoffPercentile);
  const probs = colleges.map((c) => resolveAdmissionProbability(c));
  const pkgs = colleges.map((c) => parsePackageLPA(c.avgPackage ?? null));
  const maxPkg = Math.max(0, ...pkgs.filter((v): v is number => v != null));
  const fees = colleges.map((c) => parseAnnualFees(c.fees));
  const roi = colleges.map((c, i) => {
    const p = pkgs[i];
    const f = fees[i];
    return p != null && f != null && f > 0 ? p / (f / 100000) : null;
  });

  return {
    cutoffPercentile: highlight(cutoffs, false),
    admissionProbability: highlight(probs, true),
    avgPackage: highlight(pkgs, true),
    roi: highlight(roi, true),
  };
}
