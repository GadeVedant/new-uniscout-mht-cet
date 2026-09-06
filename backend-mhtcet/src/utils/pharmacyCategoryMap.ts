/**
 * Pharmacy Category Map
 * Covers both B Pharmacy (H/O/S suffix variants) and
 * D Pharmacy (bare codes like GOPEN, GOBC, GNTA/B/C/D) category codes.
 *
 * When a user selects e.g. "GOPENS", expand it to every variant that
 * may appear in the pharmacy CSVs so nothing is missed.
 */

// ── Full expansion map ────────────────────────────────────────────────────
const PHARMACY_CATEGORY_GROUPS: Record<string, string[]> = {

  // ── GOPEN / LOPEN (B Pharmacy style) ────────────────────────────────────
  GOPENS: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  GOPENH: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  GOPENO: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  LOPENS: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  LOPENH: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  LOPENO: ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  // D Pharmacy bare codes
  GOPEN:  ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],
  LOPEN:  ['GOPENS','GOPENH','GOPENO','LOPENS','LOPENH','LOPENO','GOPEN','LOPEN'],

  // ── GSC / LSC ────────────────────────────────────────────────────────────
  GSCS: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  GSCH: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  GSCO: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  LSCS: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  LSCH: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  LSCO: ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  GSC:  ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],
  LSC:  ['GSCS','GSCH','GSCO','LSCS','LSCH','LSCO','GSC','LSC'],

  // ── GST / LST ────────────────────────────────────────────────────────────
  GSTS: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  GSTH: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  GSTO: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  LSTS: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  LSTH: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  LSTO: ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  GST:  ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],
  LST:  ['GSTS','GSTH','GSTO','LSTS','LSTH','LSTO','GST','LST'],

  // ── GOBC / LOBC ──────────────────────────────────────────────────────────
  GOBCS: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  GOBCH: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  GOBCO: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  LOBCS: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  LOBCH: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  LOBCO: ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  GOBC:  ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],
  LOBC:  ['GOBCS','GOBCH','GOBCO','LOBCS','LOBCH','LOBCO','GOBC','LOBC'],

  // ── GSEBC / LSEBC ────────────────────────────────────────────────────────
  GSEBCS: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  GSEBCH: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  GSEBCO: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  LSEBCS: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  LSEBCH: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  LSEBCO: ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  GSEBC:  ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],
  LSEBC:  ['GSEBCS','GSEBCH','GSEBCO','LSEBCS','LSEBCH','LSEBCO','GSEBC','LSEBC'],

  // ── GVJ / LVJ ────────────────────────────────────────────────────────────
  GVJS: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],
  GVJH: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],
  GVJO: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],
  LVJS: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],
  LVJH: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],
  LVJO: ['GVJS','GVJH','GVJO','LVJS','LVJH','LVJO'],

  // ── GNT1 / LNT1 ─────────────────────────────────────────────────────────
  GNT1S: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  GNT1H: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  GNT1O: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  LNT1S: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  LNT1H: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  LNT1O: ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  GNTA:  ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],
  LNTA:  ['GNT1S','GNT1H','GNT1O','LNT1S','LNT1H','LNT1O','GNTA','LNTA'],

  // ── GNT2 / LNT2 ─────────────────────────────────────────────────────────
  GNT2S: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  GNT2H: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  GNT2O: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  LNT2S: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  LNT2H: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  LNT2O: ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  GNTB:  ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],
  LNTB:  ['GNT2S','GNT2H','GNT2O','LNT2S','LNT2H','LNT2O','GNTB','LNTB'],

  // ── GNT3 / LNT3 ─────────────────────────────────────────────────────────
  GNT3S: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  GNT3H: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  GNT3O: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  LNT3S: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  LNT3H: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  LNT3O: ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  GNTC:  ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],
  LNTC:  ['GNT3S','GNT3H','GNT3O','LNT3S','LNT3H','LNT3O','GNTC','LNTC'],

  // ── NT-D (D Pharmacy specific extra NT group) ────────────────────────────
  GNTD: ['GNTD','LNTD'],
  LNTD: ['GNTD','LNTD'],

  // ── EWS ─────────────────────────────────────────────────────────────────
  EWS: ['EWS'],

  // ── TFWS ────────────────────────────────────────────────────────────────
  TFWS: ['TFWS'],

  // ── MI / ORPHAN ──────────────────────────────────────────────────────────
  MI:     ['MI'],
  ORPHAN: ['ORPHAN'],

  // ── DEF (Defence) ────────────────────────────────────────────────────────
  DEFOPENS:  ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFOPEN:   ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFROBCS:  ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFROBC:   ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFRSCS:   ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFRSC:    ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFRSEBCS: ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFRSEBC:  ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  DEFRNTB:   ['DEFOPENS','DEFOPEN','DEFROBCS','DEFROBC','DEFRSCS','DEFRSC','DEFRSEBCS','DEFRSEBC','DEFRNTB'],
  // Also handle engineering-style DEF codes that may appear
  DEFOBCS:  ['DEFOBCS'],
  DEFSCS:   ['DEFSCS'],
  DEFRSTS:  ['DEFRSTS'],

  // ── PWD ──────────────────────────────────────────────────────────────────
  PWDOPENS:  ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDOPEN:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDOPENH:  ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDROBCS:  ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDROBC:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDROBCH:  ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSCS:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSC:    ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSCH:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSEBCS: ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSEBCH: ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRSTH:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRVJH:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRNTA:   ['PWDOPENS','PWDOPEN','PWDOPENH','PWDROBCS','PWDROBC','PWDROBCH','PWDRSCS','PWDRSC','PWDRSCH','PWDRSEBCS','PWDRSEBCH','PWDRSTH','PWDRVJH','PWDRNTA'],
  PWDRNT2H:  ['PWDRNT2H'],
  PWDOBCH:   ['PWDOBCH'],
};

// ── Discount table (same hierarchy as engineering) ────────────────────────
export const PHARMACY_CATEGORY_DISCOUNT: Record<string, number> = {
  // Open
  GOPENS:0, GOPENH:0, GOPENO:0, LOPENS:0, LOPENH:0, LOPENO:0, GOPEN:0, LOPEN:0,
  // EWS
  EWS: 0.5,
  // OBC
  GOBCS:3, GOBCH:3, GOBCO:3, LOBCS:3, LOBCH:3, LOBCO:3, GOBC:3, LOBC:3,
  // SEBC
  GSEBCS:5, GSEBCH:5, GSEBCO:5, LSEBCS:5, LSEBCH:5, LSEBCO:5, GSEBC:5, LSEBC:5,
  // VJ
  GVJS:8, GVJH:8, GVJO:8, LVJS:8, LVJH:8, LVJO:8,
  // NT
  GNT1S:8, GNT1H:8, GNT1O:8, LNT1S:8, LNT1H:8, LNT1O:8, GNTA:8, LNTA:8,
  GNT2S:8, GNT2H:8, GNT2O:8, LNT2S:8, LNT2H:8, LNT2O:8, GNTB:8, LNTB:8,
  GNT3S:8, GNT3H:8, GNT3O:8, LNT3S:8, LNT3H:8, LNT3O:8, GNTC:8, LNTC:8,
  GNTD:8, LNTD:8,
  // SC
  GSCS:15, GSCH:15, GSCO:15, LSCS:15, LSCH:15, LSCO:15, GSC:15, LSC:15,
  // ST
  GSTS:20, GSTH:20, GSTO:20, LSTS:20, LSTH:20, LSTO:20, GST:20, LST:20,
  // TFWS / MI / ORPHAN
  TFWS:0, MI:0, ORPHAN:0,
};

/** Expand a user-selected category code to all matching CSV codes. */
export function expandPharmacyCategory(category: string): string[] {
  const upper = category.trim().toUpperCase();
  return PHARMACY_CATEGORY_GROUPS[upper] ?? [upper];
}

/** True if a CSV row's category matches the user-selected category. */
export function pharmacyCategoryMatches(csvCategory: string, userCategory: string): boolean {
  const expanded = expandPharmacyCategory(userCategory);
  return expanded.includes(csvCategory.trim().toUpperCase());
}

/** Estimated percentile discount for reserved vs Open category. */
export function getPharmacyCategoryDiscount(category: string): number {
  const upper = category.trim().toUpperCase();
  return PHARMACY_CATEGORY_DISCOUNT[upper] ?? 0;
}

/** Open category codes — no discount applied. */
export const PHARMACY_OPEN_CATS = new Set([
  'gopens','gopenh','gopeno','lopens','lopenh','lopeno','gopen','lopen',
]);
