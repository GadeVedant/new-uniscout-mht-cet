/**
 * Pharmacy Category Map — CROSS-SUFFIX MATCHING
 *
 * B Pharmacy uses H/O/S suffixed codes (GOPENH, GOPENO, GOPENS).
 * D Pharmacy uses only S-suffixed codes (GOPENS, GOBCS, etc.).
 *
 * When a user selects any suffix variant (H, O, or S) we match ALL
 * three variants so both B Pharmacy and D Pharmacy data is included.
 */

// Map from any suffixed code → all its sibling suffixed codes
// e.g. GOPENH → [GOPENH, GOPENO, GOPENS]
const SUFFIX_SIBLINGS: Record<string, string[]> = {};

const BASES = [
  'GOPEN','LOPEN',
  'GOBC','LOBC',
  'GSEBC','LSEBC',
  'GSC','LSC',
  'GST','LST',
  'GVJ','LVJ','LVJ',
  'GSTS','LSTS',
  'GNT1','LNT1',
  'GNT2','LNT2',
  'GNT3','LNT3',
];
const SUFFIXES = ['S','H','O'];

for (const base of BASES) {
  const siblings = SUFFIXES.map(s => base + s);
  for (const code of siblings) {
    SUFFIX_SIBLINGS[code] = siblings;
  }
}

/**
 * Returns the exact set of CSV category codes that should match
 * a user-selected category code.
 *
 * GOPENH → [GOPENH, GOPENS, GOPENO]  (all suffix variants)
 * GOPENS → [GOPENS, GOPENH, GOPENO]  (all suffix variants)
 */
export function expandPharmacyCategory(category: string): string[] {
  const upper = category.trim().toUpperCase();
  const codes = new Set<string>([upper]);

  // Add all sibling suffix variants (covers H↔S↔O cross-matching for D Pharmacy)
  if (SUFFIX_SIBLINGS[upper]) {
    SUFFIX_SIBLINGS[upper].forEach(c => codes.add(c));
  }

  return [...codes];
}

/**
 * Returns true if a CSV row's category matches the user-selected category.
 * GOPENS will NOT match GOPENH or GOPENO rows.
 */
export function pharmacyCategoryMatches(csvCategory: string, userCategory: string): boolean {
  return expandPharmacyCategory(userCategory)
    .includes(csvCategory.trim().toUpperCase());
}

/** Estimated percentile discount for reserved vs Open category. */
export const PHARMACY_CATEGORY_DISCOUNT: Record<string, number> = {
  // Open — no discount
  GOPENS: 0, GOPENH: 0, GOPENO: 0, LOPENS: 0, LOPENH: 0, LOPENO: 0, GOPEN: 0, LOPEN: 0,
  // EWS
  EWS: 0.5,
  // OBC
  GOBCS: 3, GOBCH: 3, GOBCO: 3, LOBCS: 3, LOBCH: 3, LOBCO: 3, GOBC: 3, LOBC: 3,
  // SEBC
  GSEBCS: 5, GSEBCH: 5, GSEBCO: 5, LSEBCS: 5, LSEBCH: 5, LSEBCO: 5, GSEBC: 5, LSEBC: 5,
  // VJ
  GVJS: 8, GVJH: 8, GVJO: 8, LVJS: 8, LVJH: 8, LVJO: 8,
  // NT
  GNT1S: 8, GNT1H: 8, GNT1O: 8, LNT1S: 8, LNT1H: 8, LNT1O: 8, GNTA: 8, LNTA: 8,
  GNT2S: 8, GNT2H: 8, GNT2O: 8, LNT2S: 8, LNT2H: 8, LNT2O: 8, GNTB: 8, LNTB: 8,
  GNT3S: 8, GNT3H: 8, GNT3O: 8, LNT3S: 8, LNT3H: 8, LNT3O: 8, GNTC: 8, LNTC: 8,
  GNTD: 8, LNTD: 8,
  // SC
  GSCS: 15, GSCH: 15, GSCO: 15, LSCS: 15, LSCH: 15, LSCO: 15, GSC: 15, LSC: 15,
  // ST
  GSTS: 20, GSTH: 20, GSTO: 20, LSTS: 20, LSTH: 20, LSTO: 20, GST: 20, LST: 20,
  // Special
  TFWS: 0, MI: 0, ORPHAN: 0,
};

export function getPharmacyCategoryDiscount(category: string): number {
  return PHARMACY_CATEGORY_DISCOUNT[category.trim().toUpperCase()] ?? 0;
}

/** Open category codes — no discount applied. */
export const PHARMACY_OPEN_CATS = new Set([
  'gopens','gopenh','gopeno','lopens','lopenh','lopeno','gopen','lopen',
]);
