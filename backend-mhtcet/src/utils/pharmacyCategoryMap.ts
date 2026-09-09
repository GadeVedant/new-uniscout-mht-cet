/**
 * Pharmacy Category Map — EXACT MATCHING ONLY
 *
 * Each category code (GOPENS, GOPENH, GOPENO etc.) has completely different
 * cutoff data in the CSV and must be matched EXACTLY.
 *
 * The ONLY cross-matching done is:
 *   - D Pharmacy CSVs use bare codes like "GOPEN" (no suffix).
 *   - When the user selects "GOPENH", we also match bare "GOPEN" rows
 *     so D Pharmacy data is included.
 *   - We do NOT match siblings: GOPENH never matches GOPENS or GOPENO.
 */

// D Pharmacy bare code → the suffixed codes it represents
// (bare GOPEN rows should appear when any H/S/O variant is selected)
const D_PHARMA_BARE: Record<string, string> = {
  GOPENS: 'GOPEN',  GOPENH: 'GOPEN',  GOPENO: 'GOPEN',
  LOPENS: 'LOPEN',  LOPENH: 'LOPEN',  LOPENO: 'LOPEN',
  GSCS:   'GSC',    GSCH:   'GSC',    GSCO:   'GSC',
  LSCS:   'LSC',    LSCH:   'LSC',    LSCO:   'LSC',
  GSTS:   'GST',    GSTH:   'GST',    GSTO:   'GST',
  LSTS:   'LST',    LSTH:   'LST',    LSTO:   'LST',
  GOBCS:  'GOBC',   GOBCH:  'GOBC',   GOBCO:  'GOBC',
  LOBCS:  'LOBC',   LOBCH:  'LOBC',   LOBCO:  'LOBC',
  GSEBCS: 'GSEBC',  GSEBCH: 'GSEBC',  GSEBCO: 'GSEBC',
  LSEBCS: 'LSEBC',  LSEBCH: 'LSEBC',  LSEBCO: 'LSEBC',
  GVJS:   'GVJ',    GVJH:   'GVJ',    GVJO:   'GVJ',
  LVJS:   'LVJ',    LVJH:   'LVJ',    LVJO:   'LVJ',
  GNT1S:  'GNTA',   GNT1H:  'GNTA',   GNT1O:  'GNTA',
  LNT1S:  'LNTA',   LNT1H:  'LNTA',   LNT1O:  'LNTA',
  GNT2S:  'GNTB',   GNT2H:  'GNTB',   GNT2O:  'GNTB',
  LNT2S:  'LNTB',   LNT2H:  'LNTB',   LNT2O:  'LNTB',
  GNT3S:  'GNTC',   GNT3H:  'GNTC',   GNT3O:  'GNTC',
  LNT3S:  'LNTC',   LNT3H:  'LNTC',   LNT3O:  'LNTC',
};

// Reverse: bare D Pharmacy code → what suffixed codes map to it
const BARE_TO_SUFFIXED: Record<string, string[]> = {};
for (const [suffixed, bare] of Object.entries(D_PHARMA_BARE)) {
  if (!BARE_TO_SUFFIXED[bare]) BARE_TO_SUFFIXED[bare] = [bare];
  BARE_TO_SUFFIXED[bare].push(suffixed);
}

/**
 * Returns the exact set of CSV category codes that should match
 * a user-selected category code.
 *
 * GOPENS → ['GOPENS', 'GOPEN']   (exact + bare D Pharmacy code)
 * GOPENH → ['GOPENH', 'GOPEN']   (exact + bare D Pharmacy code)
 * GOPENO → ['GOPENO', 'GOPEN']   (exact + bare D Pharmacy code)
 * GOPEN  → ['GOPEN', 'GOPENS', 'GOPENH', 'GOPENO']  (bare → all its suffixed variants)
 */
export function expandPharmacyCategory(category: string): string[] {
  const upper = category.trim().toUpperCase();
  const codes = new Set<string>([upper]);

  // If selecting a suffixed code, also match bare D Pharmacy code
  if (D_PHARMA_BARE[upper]) {
    codes.add(D_PHARMA_BARE[upper]);
  }

  // If selecting a bare code, also match all its suffixed variants
  if (BARE_TO_SUFFIXED[upper]) {
    BARE_TO_SUFFIXED[upper].forEach(c => codes.add(c));
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
