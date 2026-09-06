/**
 * PharmacyRecommendationService
 * Identical filtering logic to engineering RecommendationService but:
 *  - Uses pharmacyDataService (pharmacy-only CSV data)
 *  - Uses pharmacyCategoryMap (covers B/D Pharmacy category codes)
 *  - No ML enrichment (pharmacy model not trained yet)
 *  - No fees in output (seats only)
 */
import { randomUUID } from 'crypto';
import { pharmacyDataService } from './pharmacyDataService.js';
import { pharmacyCategoryMatches, getPharmacyCategoryDiscount, PHARMACY_OPEN_CATS } from '../utils/pharmacyCategoryMap.js';
import { cutoffTrendService } from './cutoffTrendService.js';
import logger from '../utils/logger.js';
import type { RecommendationRequest, CollegeRecommendation, CollegeData } from '../types/index.js';

class PharmacyRecommendationService {

  async getRecommendations(request: RecommendationRequest): Promise<{
    recommendations: CollegeRecommendation[];
    locationFallback: boolean;
  }> {
    const requestId = randomUUID();
    const { percentile, capRound, category, branchPreference, location } = request;
    logger.info(`Pharmacy recommendation: percentile=${percentile}, capRound=${capRound}, category=${category}, branch=${branchPreference}, requestId=${requestId}`);

    // Word-boundary location match (same as engineering)
    const matchesLocTerm = (field: string, term: string): boolean =>
      field === term ||
      field.startsWith(term + ' ') ||
      field.endsWith(' ' + term) ||
      field.includes(' ' + term + ' ');

    // ── Rule-based filter ────────────────────────────────────────────────────
    const applyFilters = (withLocation: boolean) =>
      pharmacyDataService.getAllColleges().filter(c => {
        if (capRound && c.capRound !== capRound) return false;
        if (category && !pharmacyCategoryMatches(c.category, category)) return false;
        if (branchPreference) {
          const pref   = branchPreference.toLowerCase().trim();
          const branch = c.branchName.toLowerCase().trim();
          if (branch !== pref && !branch.includes(pref) && !pref.includes(branch)) return false;
        }
        if (withLocation && location) {
          const locs = location.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
          if (locs.length > 0) {
            const cLoc  = c.location.toLowerCase();
            const cDist = c.district.toLowerCase();
            if (!locs.some(l => matchesLocTerm(cLoc, l) || matchesLocTerm(cDist, l))) return false;
          }
        }
        return true;
      });

    let filtered = applyFilters(true);
    let locationFallback = false;

    if (filtered.length === 0 && location) {
      logger.info(`Pharmacy: no results for location="${location}", falling back`);
      filtered = applyFilters(false);
      locationFallback = true;
    }

    const locList = location
      ? location.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
      : [];

    // ── Category fallback (Open → reserved with discount) ───────────────────
    const isReserved = !PHARMACY_OPEN_CATS.has(category.toLowerCase());
    let supplemental: CollegeData[] = [];

    if (isReserved && category) {
      const discount = getPharmacyCategoryDiscount(category);
      const codesWithData = new Set(filtered.map(c => `${c.collegeCode}|${c.branchName}`));
      const suppLocs = !locationFallback && location
        ? location.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
        : [];

      const openRecords = pharmacyDataService.getAllColleges().filter(c => {
        if (capRound && c.capRound !== capRound) return false;
        if (!pharmacyCategoryMatches(c.category, 'GOPENS')) return false;
        if (branchPreference) {
          const pref   = branchPreference.toLowerCase().trim();
          const branch = c.branchName.toLowerCase().trim();
          if (branch !== pref && !branch.includes(pref) && !pref.includes(branch)) return false;
        }
        if (suppLocs.length > 0) {
          const cLoc  = c.location.toLowerCase();
          const cDist = c.district.toLowerCase();
          if (!suppLocs.some(l => matchesLocTerm(cLoc, l) || matchesLocTerm(cDist, l))) return false;
        }
        return !codesWithData.has(`${c.collegeCode}|${c.branchName}`);
      });

      supplemental = openRecords.map(c => ({
        ...c,
        cutoffPercentile: Math.max(0, parseFloat((c.cutoffPercentile - discount).toFixed(2))),
        category,
        estimatedCutoff: true,
      }));
    }

    // ── Build + filter recommendations ───────────────────────────────────────
    const allRecs = [...filtered, ...supplemental]
      .map(c => this.buildRecommendation(c, percentile))
      .filter(r => r.percentileDifference >= -5);

    // Dedup — keep lowest cutoff per college+branch
    const best = new Map<string, CollegeRecommendation>();
    for (const rec of allRecs) {
      const key = `${rec.code}|${rec.branch}`;
      const existing = best.get(key);
      if (!existing || rec.cutoffPercentile < existing.cutoffPercentile) {
        best.set(key, rec);
      }
    }

    // ── Sort: location first → chance → cutoff desc ──────────────────────────
    const order = { High: 0, Medium: 1, Low: 2 };
    const recommendations = [...best.values()]
      .sort((a, b) => {
        const aInLoc = locList.length > 0
          ? locList.some(l => matchesLocTerm(a.location.toLowerCase(), l) || matchesLocTerm(a.district.toLowerCase(), l))
          : false;
        const bInLoc = locList.length > 0
          ? locList.some(l => matchesLocTerm(b.location.toLowerCase(), l) || matchesLocTerm(b.district.toLowerCase(), l))
          : false;
        if (aInLoc !== bInLoc) return aInLoc ? -1 : 1;
        const diff = order[a.admissionChance] - order[b.admissionChance];
        return diff !== 0 ? diff : b.cutoffPercentile - a.cutoffPercentile;
      })
      .slice(0, 50);

    // ── Trend enrichment (no placement data for pharmacy) ────────────────────
    for (const rec of recommendations) {
      const trend = cutoffTrendService.getTrend(rec.code, rec.branch, rec.category, rec.capRound);
      rec.cutoffTrend       = trend.cutoffTrend;
      rec.round2Opportunity = trend.round2Opportunity;
      rec.round2Delta       = trend.round2Delta;
      rec.avgPackage        = null;
      rec.highestPackage    = null;
    }

    logger.info(`Pharmacy: returning ${recommendations.length} results`);
    return { recommendations, locationFallback };
  }

  private buildRecommendation(college: CollegeData, percentile: number): CollegeRecommendation {
    const diff   = parseFloat((percentile - college.cutoffPercentile).toFixed(2));
    const chance: 'High' | 'Medium' | 'Low' = diff >= 10 ? 'High' : diff >= 0 ? 'Medium' : 'Low';
    return {
      id:                  `${college.collegeCode}-${college.branchName}-${college.category}`,
      name:                college.collegeName,
      code:                college.collegeCode,
      branch:              college.branchName,
      branchCode:          '',
      location:            college.location,
      district:            college.district,
      category:            college.category,
      cutoffPercentile:    college.cutoffPercentile,
      percentileDifference: diff,
      collegeType:         college.collegeType,
      fees:                'N/A',          // no fees for pharmacy
      seats:               college.intake ?? 0,
      admissionChance:     chance,
      capRound:            college.capRound,
      year:                college.year,
      estimatedCutoff:     (college as any).estimatedCutoff,
    };
  }
}

export const pharmacyRecommendationService = new PharmacyRecommendationService();
