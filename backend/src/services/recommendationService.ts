import { dataService } from './dataService.js';
import logger from '../utils/logger.js';
import type { 
  RecommendationRequest, 
  CollegeRecommendation, 
  CollegeData 
} from '../types/index.js';

class RecommendationService {
  /**
   * Get college recommendations based on user criteria
   */
  getRecommendations(request: RecommendationRequest): CollegeRecommendation[] {
    const { percentile, year, capRound, category, branchPreference, location } = request;
    
    logger.info(`Processing recommendation request: percentile=${percentile}, year=${year}, capRound=${capRound}, category=${category}, branch=${branchPreference}, location=${location}`);

    const allColleges = dataService.getAllColleges();
    
    if (allColleges.length === 0) {
      logger.warn('No college data available');
      return [];
    }

    // Filter colleges based on criteria
    const filteredColleges = allColleges.filter(college => {
      // Filter by year if specified
      if (year && college.year !== year) {
        return false;
      }

      // Filter by CAP round if specified
      if (capRound && college.capRound !== capRound) {
        return false;
      }

      // Filter by category - match exact or Open category
      if (category) {
        const normalizedCategory = this.normalizeCategory(category);
        const collegeCategory = this.normalizeCategory(college.category);
        if (collegeCategory !== normalizedCategory && collegeCategory !== 'Open') {
          // If user is from reserved category, they can also see Open seats
          // But if looking specifically for category seats, filter by that
          if (normalizedCategory !== 'Open') {
            return collegeCategory === normalizedCategory || collegeCategory === 'Open';
          }
          return collegeCategory === 'Open';
        }
      }

      // Filter by branch preference - STRICT matching
      if (branchPreference) {
        if (!this.branchMatches(branchPreference, college.branchName)) {
          return false;
        }
      }

      // Filter by location preference
      if (location) {
        const normalizedLocation = location.toLowerCase();
        const collegeLocation = college.location.toLowerCase();
        const collegeDistrict = college.district.toLowerCase();
        
        if (!collegeLocation.includes(normalizedLocation) && 
            !collegeDistrict.includes(normalizedLocation) &&
            !normalizedLocation.includes(collegeLocation) &&
            !normalizedLocation.includes(collegeDistrict)) {
          return false;
        }
      }

      return true;
    });

    logger.info(`Filtered to ${filteredColleges.length} colleges`);

    // Calculate admission chances and sort by relevance
    const recommendations = filteredColleges
      .map(college => this.calculateRecommendation(college, percentile))
      .filter(rec => rec.admissionChance !== 'Low' || rec.percentileDifference >= -5) // Include colleges where user is slightly below cutoff
      .sort((a, b) => {
        // Sort by admission chance (High > Medium > Low)
        const chanceOrder = { High: 0, Medium: 1, Low: 2 };
        const chanceCompare = chanceOrder[a.admissionChance] - chanceOrder[b.admissionChance];
        if (chanceCompare !== 0) return chanceCompare;
        
        // Then by cutoff percentile (higher cutoff = better college)
        return b.cutoffPercentile - a.cutoffPercentile;
      })
      .slice(0, 50); // Limit to top 50 recommendations

    logger.info(`Returning ${recommendations.length} recommendations`);
    return recommendations;
  }

  /**
   * Check if branches match considering variations
   */
  private branchMatches(preference: string, collegeBranch: string): boolean {
    // Strict branch mapping - each branch maps to its exact variations only
    const branchMappings: Record<string, string[]> = {
      'computer engineering': [
        'computer engineering',
        'comp engg',
        'comp engineering'
      ],
      'computer science and engineering': [
        'computer science and engineering',
        'computer science & engineering',
        'cse',
        'computer science'
      ],
      'information technology': [
        'information technology',
        'it'
      ],
      'electronics and telecommunication engineering': [
        'electronics and telecommunication engineering',
        'electronics & telecommunication engineering',
        'entc',
        'e&tc',
        'electronics and telecommunication',
        'electronics & telecommunication'
      ],
      'mechanical engineering': [
        'mechanical engineering',
        'mech engineering',
        'mech engg'
      ],
      'civil engineering': [
        'civil engineering',
        'civil engg'
      ],
      'electrical engineering': [
        'electrical engineering',
        'electrical engg'
      ],
      'artificial intelligence and data science': [
        'artificial intelligence and data science',
        'artificial intelligence & data science',
        'ai and data science',
        'ai & data science',
        'aids'
      ],
      'artificial intelligence and machine learning': [
        'artificial intelligence and machine learning',
        'artificial intelligence & machine learning',
        'ai and machine learning',
        'ai & machine learning',
        'aiml'
      ],
    };

    const normalizedPreference = preference.toLowerCase().trim();
    const normalizedBranch = collegeBranch.toLowerCase().trim();

    // Direct exact match
    if (normalizedBranch === normalizedPreference) {
      return true;
    }

    // Find which branch group the preference belongs to
    let preferenceGroup: string[] | null = null;
    for (const [mainBranch, variations] of Object.entries(branchMappings)) {
      if (normalizedPreference === mainBranch || variations.includes(normalizedPreference)) {
        preferenceGroup = [mainBranch, ...variations];
        break;
      }
    }

    // If we found a group for the preference, check if college branch is in the same group
    if (preferenceGroup) {
      return preferenceGroup.some(variant => 
        normalizedBranch === variant || 
        normalizedBranch.includes(variant) ||
        variant.includes(normalizedBranch)
      );
    }

    // Fallback: check if exact preference is contained in college branch
    return normalizedBranch.includes(normalizedPreference);
  }

  /**
   * Normalize category for comparison
   */
  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'open': 'Open',
      'general': 'Open',
      'gopen': 'Open',
      'sc': 'SC',
      'gsc': 'SC',
      'st': 'ST',
      'gst': 'ST',
      'obc': 'OBC',
      'gobc': 'OBC',
      'sebc': 'OBC',
      'nt': 'NT',
      'gnt': 'NT',
      'vjnt': 'NT',
      'ews': 'EWS',
      'tfws': 'TFWS',
    };

    const normalized = category.toLowerCase().replace(/[^a-z]/g, '');
    return categoryMap[normalized] || category;
  }

  /**
   * Calculate recommendation details for a college
   */
  private calculateRecommendation(college: CollegeData, userPercentile: number): CollegeRecommendation {
    const percentileDifference = userPercentile - college.cutoffPercentile;
    
    // Calculate admission chance
    let admissionChance: 'High' | 'Medium' | 'Low';
    if (percentileDifference >= 3) {
      admissionChance = 'High';
    } else if (percentileDifference >= 0) {
      admissionChance = 'Medium';
    } else if (percentileDifference >= -2) {
      admissionChance = 'Low';
    } else {
      admissionChance = 'Low';
    }

    // Format fees
    const fees = college.fees 
      ? `₹${college.fees.toLocaleString('en-IN')}/year` 
      : '₹85,000 - 1,50,000/year';

    return {
      id: `${college.collegeCode}-${college.branchCode}-${college.category}`,
      name: college.collegeName,
      code: college.collegeCode,
      branch: college.branchName,
      branchCode: college.branchCode,
      location: college.location,
      district: college.district,
      category: college.category,
      cutoffPercentile: college.cutoffPercentile,
      percentileDifference: Math.round(percentileDifference * 100) / 100,
      collegeType: college.collegeType,
      fees,
      seats: college.intake || 60,
      admissionChance,
      capRound: college.capRound,
      year: college.year,
    };
  }

  /**
   * Get statistics about the recommendations
   */
  getStats(): { totalColleges: number; uniqueBranches: number; uniqueLocations: number } {
    const allColleges = dataService.getAllColleges();
    const branches = new Set(allColleges.map(c => c.branchName));
    const locations = new Set(allColleges.map(c => c.location));

    return {
      totalColleges: allColleges.length,
      uniqueBranches: branches.size,
      uniqueLocations: locations.size,
    };
  }
}

export const recommendationService = new RecommendationService();
