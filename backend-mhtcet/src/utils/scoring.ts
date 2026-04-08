/**
 * Shared scoring utilities — backend mirror of src/lib/scoring.ts
 * Import from here; never redefine these functions locally.
 */
import type { CollegeRecommendation } from '../types/index.js';

// ── Weights (overridable via env) ─────────────────────────────────────────────
export const SCORING_WEIGHT_PROB = parseFloat(process.env.SCORING_WEIGHT_PROB ?? '0.50');
export const SCORING_WEIGHT_PLACEMENT = parseFloat(process.env.SCORING_WEIGHT_PLACEMENT ?? '0.25');
export const SCORING_WEIGHT_PRESTIGE = parseFloat(process.env.SCORING_WEIGHT_PRESTIGE ?? '0.25');

// ── Prestige scores by college type ──────────────────────────────────────────
export const PRESTIGE_SCORES: Record<string, number> = {
  'autonomous': 0.9,
  'government': 0.85,
  'aided': 0.7,
  'unaided': 0.5,
  'private': 0.5,
};

function prestigeScore(collegeType: string): number {
  const key = collegeType.toLowerCase().trim();
  for (const [k, v] of Object.entries(PRESTIGE_SCORES)) {
    if (key.includes(k)) return v;
  }
  return 0.5;
}

/**
 * Resolves a normalised admission probability [0–1] from ML or legacy fields.
 */
export function resolveAdmissionProbability(college: CollegeRecommendation): number {
  if (college.admissionProbability != null) {
    return Math.min(1, Math.max(0, college.admissionProbability / 100));
  }
  // Legacy fallback
  if (college.admissionChance === 'High') return 0.85;
  if (college.admissionChance === 'Medium') return 0.60;
  return 0.35;
}

/**
 * Parses annual fees from a formatted string like "₹1,20,000" or "1.2 LPA".
 * Divides by 4 when value looks like a 4-year total (> 5,00,000).
 * Returns null when unparseable.
 */
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

/**
 * Parses a package string like "₹6.5 LPA" or "6.5" into a number.
 */
export function parsePackageLPA(pkg: string | null | undefined): number | null {
  if (!pkg) return null;
  const cleaned = pkg.replace(/[₹,\s]/g, '').toLowerCase().replace('lpa', '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n === 0 ? null : n;
}

/**
 * Computes a weighted composite score for a college.
 * Used by form filling and comparison features.
 */
export function computeWeightedScore(
  college: CollegeRecommendation,
  maxAvgPackage: number,
  weights = { prob: SCORING_WEIGHT_PROB, placement: SCORING_WEIGHT_PLACEMENT, prestige: SCORING_WEIGHT_PRESTIGE },
): number {
  const prob = resolveAdmissionProbability(college);
  const pkg = parsePackageLPA(college.avgPackage ?? null);
  const placementScore = pkg != null && maxAvgPackage > 0 ? pkg / maxAvgPackage : 0;
  const prestige = prestigeScore(college.collegeType);

  const total = weights.prob + weights.placement + weights.prestige;
  return (
    (weights.prob * prob + weights.placement * placementScore + weights.prestige * prestige) / total
  );
}

/**
 * Generates a human-readable entry reason based on the top contributing factors.
 */
export function generateEntryReason(college: CollegeRecommendation, maxAvgPackage: number): string {
  const prob = resolveAdmissionProbability(college);
  const pkg = parsePackageLPA(college.avgPackage ?? null);
  const placementScore = pkg != null && maxAvgPackage > 0 ? pkg / maxAvgPackage : 0;
  const prestige = prestigeScore(college.collegeType);

  const factors: Array<{ label: string; score: number }> = [
    { label: 'admission probability', score: prob * SCORING_WEIGHT_PROB },
    { label: 'placement outcome', score: placementScore * SCORING_WEIGHT_PLACEMENT },
    { label: 'college prestige', score: prestige * SCORING_WEIGHT_PRESTIGE },
  ];

  factors.sort((a, b) => b.score - a.score);

  if (prob < 0.20) return 'Best available option in your range';

  const top2 = factors.slice(0, 2).map((f) => f.label);
  return `Strong ${top2.join(' and ')}`;
}
