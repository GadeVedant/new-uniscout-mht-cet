/**
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
 * Returns all CAP category codes that match the user-selected category.
 * Falls back to exact match if not in the map.
 */
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
