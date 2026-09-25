/**
 * Pharmacy Category Map
 *
 * B Pharmacy has H / O / S suffix variants (GOPENH, GOPENO, GOPENS).
 * D Pharmacy has ONLY S-suffix codes (GOPENS, GOBCS, etc.) — no H or O.
 *
 * Matching rules:
 *  1. Exact match always wins (GOPENS matches GOPENS).
 *  2. D Pharmacy fallback: if the user selects GOPENH or GOPENO and a CSV
 *     row has the S-variant of the same base (GOPENS), it also matches —
 *     but ONLY in that direction (H/O → S). This means D Pharmacy always
 *     shows up regardless of suffix chosen.
 *  3. GOPENS does NOT match GOPENH or GOPENO rows in B Pharmacy — each
 *     seat type has its own distinct cutoff there.
 */

// For a given H or O code, return its S-variant fallback
// e.g. GOPENH → GOPENS,  GOBCH → GOBCS,  GNT1H → GNT1S
function toSVariant(code: string): string | null {
  if (code.endsWith('H') || code.endsWith('O')) {
    return code.slice(0, -1) + 'S';
  }
  return null;
}

/**
 * Returns true if a CSV row's category matches the user-selected category.
 *
 * - Exact match: always true.
 * - D Pharmacy fallback: GOPENH / GOPENO also match GOPENS rows
 *   (because D Pharmacy only has State Level seats).
 * - GOPENS does NOT match GOPENH / GOPENO rows (those are B Pharmacy only).
 */
export function pharmacyCategoryMatches(csvCategory: string, userCategory: string): boolean {
  const csv  = csvCategory.trim().toUpperCase();
  const user = userCategory.trim().toUpperCase();

  // 1. Exact match
  if (csv === user) return true;

  // 2. D Pharmacy fallback: user selected H or O variant → also match S variant in CSV
  //    e.g. user=GOPENH, csv=GOPENS → match (D Pharmacy has no H rows)
  const sVariant = toSVariant(user);
  if (sVariant && csv === sVariant) return true;

  return false;
}

export function expandPharmacyCategory(category: string): string[] {
  const upper = category.trim().toUpperCase();
  const codes = new Set<string>([upper]);
  const sv = toSVariant(upper);
  if (sv) codes.add(sv);
  return [...codes];
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
