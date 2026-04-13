ena/**
 * Category expansion map.
 * When a user selects a broad category (e.g. "GOPENS"), expand it to include
 * all related seat types (State, Home University, Other than Home University)
 * across both General (G) and Local (L) prefixes.
 *
 * CAP category code pattern:
 *   [G|L|DEF|PWD] + [OPEN|SC|ST|OBC|SEBC|NT1|NT2|NT3|VJ] + [S|H|O]
 *   G = General (State Level quota), L = Local (Home University quota)
 *   S = State Level, H = Home University, O = Other than Home University
 */

// Maps a user-facing category code to all matching CAP codes
const CATEGORY_GROUPS: Record<string, string[]> = {
  // Open / General
  GOPENS: ['GOPENS', 'GOPENH', 'GOPENO', 'LOPENS', 'LOPENH', 'LOPENO'],
  GOPENH: ['GOPENS', 'GOPENH', 'GOPENO', 'LOPENS', 'LOPENH', 'LOPENO'],
  GOPENO: ['GOPENS', 'GOPENH', 'GOPENO', 'LOPENS', 'LOPENH', 'LOPENO'],

  // SC
  GSCS: ['GSCS', 'GSCH', 'GSCO', 'LSCS', 'LSCH', 'LSCO'],
  GSCH: ['GSCS', 'GSCH', 'GSCO', 'LSCS', 'LSCH', 'LSCO'],
  GSCO: ['GSCS', 'GSCH', 'GSCO', 'LSCS', 'LSCH', 'LSCO'],

  // ST
  GSTS: ['GSTS', 'GSTH', 'GSTO', 'LSTS', 'LSTH', 'LSTO'],
  GSTH: ['GSTS', 'GSTH', 'GSTO', 'LSTS', 'LSTH', 'LSTO'],
  GSTO: ['GSTS', 'GSTH', 'GSTO', 'LSTS', 'LSTH', 'LSTO'],

  // OBC
  GOBCS: ['GOBCS', 'GOBCH', 'GOBCO', 'LOBCS', 'LOBCH', 'LOBCO'],
  GOBCH: ['GOBCS', 'GOBCH', 'GOBCO', 'LOBCS', 'LOBCH', 'LOBCO'],
  GOBCO: ['GOBCS', 'GOBCH', 'GOBCO', 'LOBCS', 'LOBCH', 'LOBCO'],

  // SEBC (EBC)
  GSEBCS: ['GSEBCS', 'GSEBCH', 'GSEBCO', 'LSEBCS', 'LSEBCH', 'LSEBCO'],
  GSEBCH: ['GSEBCS', 'GSEBCH', 'GSEBCO', 'LSEBCS', 'LSEBCH', 'LSEBCO'],
  GSEBCO: ['GSEBCS', 'GSEBCH', 'GSEBCO', 'LSEBCS', 'LSEBCH', 'LSEBCO'],

  // NT1
  GNT1S: ['GNT1S', 'GNT1H', 'GNT1O', 'LNT1S', 'LNT1H', 'LNT1O'],
  GNT1H: ['GNT1S', 'GNT1H', 'GNT1O', 'LNT1S', 'LNT1H', 'LNT1O'],
  GNT1O: ['GNT1S', 'GNT1H', 'GNT1O', 'LNT1S', 'LNT1H', 'LNT1O'],

  // NT2
  GNT2S: ['GNT2S', 'GNT2H', 'GNT2O', 'LNT2S', 'LNT2H', 'LNT2O'],
  GNT2H: ['GNT2S', 'GNT2H', 'GNT2O', 'LNT2S', 'LNT2H', 'LNT2O'],
  GNT2O: ['GNT2S', 'GNT2H', 'GNT2O', 'LNT2S', 'LNT2H', 'LNT2O'],

  // NT3
  GNT3S: ['GNT3S', 'GNT3H', 'GNT3O', 'LNT3S', 'LNT3H', 'LNT3O'],
  GNT3H: ['GNT3S', 'GNT3H', 'GNT3O', 'LNT3S', 'LNT3H', 'LNT3O'],
  GNT3O: ['GNT3S', 'GNT3H', 'GNT3O', 'LNT3S', 'LNT3H', 'LNT3O'],

  // VJ/DT
  GVJS: ['GVJS', 'GVJH', 'GVJO', 'LVJS', 'LVJH', 'LVJO'],
  GVJH: ['GVJS', 'GVJH', 'GVJO', 'LVJS', 'LVJH', 'LVJO'],
  GVJO: ['GVJS', 'GVJH', 'GVJO', 'LVJS', 'LVJH', 'LVJO'],

  // EWS — only state level exists
  EWS: ['EWS'],

  // TFWS — only one type
  TFWS: ['TFWS'],
};

/**
 * Estimated percentile discount from Open category to reserved categories.
 * Based on MHT CET historical cutoff hierarchy:
 * Open > EWS (~0.5) > OBC (~3) > SEBC (~5) > VJ/NT (~8) > SC (~15) > ST (~20)
 * These are approximate percentile point reductions applied to Open cutoff
 * when no actual reserved-category data exists for a college.
 */
export const CATEGORY_DISCOUNT: Record<string, number> = {
  // Open — no discount
  GOPENS: 0, GOPENH: 0, GOPENO: 0,
  // EWS — very close to Open
  EWS: 0.5,
  // OBC
  GOBCS: 3, GOBCH: 3, GOBCO: 3,
  // SEBC
  GSEBCS: 5, GSEBCH: 5, GSEBCO: 5,
  // VJ/DT
  GVJS: 8, GVJH: 8, GVJO: 8,
  // NT1, NT2, NT3
  GNT1S: 8, GNT1H: 8, GNT1O: 8,
  GNT2S: 8, GNT2H: 8, GNT2O: 8,
  GNT3S: 8, GNT3H: 8, GNT3O: 8,
  // SC
  GSCS: 15, GSCH: 15, GSCO: 15,
  // ST
  GSTS: 20, GSTH: 20, GSTO: 20,
  // TFWS — similar to Open
  TFWS: 0,
};

/**
 * Returns the estimated percentile discount for a category vs Open.
 * Used when no actual reserved-category cutoff data exists for a college.
 */
export function getCategoryDiscount(category: string): number {
  const upper = category.trim().toUpperCase();
  return CATEGORY_DISCOUNT[upper] ?? 0;
}
export function expandCategory(category: string): string[] {
  const upper = category.trim().toUpperCase();
  return CATEGORY_GROUPS[upper] ?? [upper];
}

/**
 * Returns true if a college's category matches the user-selected category
 * (including all related seat types).
 */
export function categoryMatches(collegeCategory: string, userCategory: string): boolean {
  const expanded = expandCategory(userCategory);
  return expanded.includes(collegeCategory.trim().toUpperCase());
}
