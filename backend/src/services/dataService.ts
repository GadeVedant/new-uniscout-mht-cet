import * as XLSX from 'xlsx';
import fs from 'fs';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import type { CollegeData, ExcelRow, FilterOptions } from '../types/index.js';

class DataService {
  private collegeData: CollegeData[] = [];
  private isDataLoaded: boolean = false;
  private filterOptions: FilterOptions = {
    years: [],
    capRounds: [],
    categories: [],
    branches: [],
    locations: [],
  };

  /**
   * Initialize and load data from Excel file
   */
  async loadData(): Promise<void> {
    try {
      const filePath = config.dataFilePath;
      logger.info(`Loading data from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Data file not found: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
      
      logger.info(`Found ${rawData.length} rows in Excel file`);
      
      // Log first row to understand structure
      if (rawData.length > 0) {
        logger.debug(`Sample row keys: ${Object.keys(rawData[0]).join(', ')}`);
      }

      // Parse and normalize data
      this.collegeData = this.parseExcelData(rawData);
      this.extractFilterOptions();
      this.isDataLoaded = true;

      logger.info(`Successfully loaded ${this.collegeData.length} college records`);
      logger.info(`Available branches: ${this.filterOptions.branches.length}`);
      logger.info(`Available locations: ${this.filterOptions.locations.length}`);
      logger.info(`Available categories: ${this.filterOptions.categories.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to load data: ${error}`);
      throw error;
    }
  }

  /**
   * Parse Excel data and normalize column names
   */
  private parseExcelData(rawData: ExcelRow[]): CollegeData[] {
    const results: CollegeData[] = [];
    
    rawData.forEach((row, index) => {
      try {
        // Handle different possible column name formats
        const collegeCode = this.getColumnValue(row, ['College Code', 'college_code', 'CollegeCode', 'Inst Code', 'Institute Code']);
        const collegeName = this.getColumnValue(row, ['College Name', 'college_name', 'CollegeName', 'Institute Name', 'Inst Name', 'Name']);
        const branchCode = this.getColumnValue(row, ['Branch Code', 'branch_code', 'BranchCode', 'Course Code']);
        const branchName = this.getColumnValue(row, ['Branch Name', 'branch_name', 'BranchName', 'Course Name', 'Branch', 'Course']);
        const category = this.getColumnValue(row, ['Category', 'category', 'Seat Type', 'SeatType', 'Caste']);
        const cutoffRaw = this.getColumnValue(row, ['Cutoff', 'cutoff', 'Percentile', 'percentile', 'CutOff Percentile', 'Cutoff Percentile', 'Merit No', 'Last Admitted Percentile']);
        const year = this.getColumnValue(row, ['Year', 'year', 'Academic Year', 'Admission Year']);
        const capRound = this.getColumnValue(row, ['CAP Round', 'cap_round', 'CapRound', 'Round', 'Round No', 'CAP Round No']);
        const location = this.getColumnValue(row, ['Location', 'location', 'City', 'Place', 'District', 'Taluka']);
        const district = this.getColumnValue(row, ['District', 'district', 'Dist']);
        const collegeType = this.getColumnValue(row, ['Type', 'type', 'College Type', 'Institute Type', 'Autonomy Status']);
        const status = this.getColumnValue(row, ['Status', 'status', 'Admission Status']);
        const fees = this.getColumnValue(row, ['Fees', 'fees', 'Annual Fees', 'Tuition Fee', 'Fee']);
        const intake = this.getColumnValue(row, ['Intake', 'intake', 'Seats', 'Available Seats', 'Total Seats', 'Sanctioned Intake']);

        // Parse cutoff percentile - handle different formats
        let cutoffPercentile = 0;
        if (cutoffRaw) {
          const parsed = parseFloat(cutoffRaw);
          if (!isNaN(parsed)) {
            cutoffPercentile = parsed;
          }
        }

        // Skip rows without essential data
        if (!collegeName || !branchName) {
          return;
        }

        results.push({
          collegeCode: collegeCode || `COL${index}`,
          collegeName: this.normalizeText(collegeName),
          branchCode: branchCode || '',
          branchName: this.normalizeBranchName(branchName),
          category: this.normalizeCategory(category || 'Open'),
          cutoffPercentile,
          year: year || '2024',
          capRound: this.normalizeCapRound(capRound || 'I'),
          location: this.normalizeText(location || district || 'Maharashtra'),
          district: this.normalizeText(district || location || 'Maharashtra'),
          collegeType: collegeType || 'Private',
          status: status || 'Active',
          fees: fees ? parseFloat(fees) || undefined : undefined,
          intake: intake ? parseInt(intake) || 60 : 60,
        });
      } catch (error) {
        logger.warn(`Failed to parse row ${index}: ${error}`);
      }
    });
    
    return results;
  }

  /**
   * Get column value with multiple possible column names
   */
  private getColumnValue(row: ExcelRow, possibleNames: string[]): string {
    for (const name of possibleNames) {
      // Check exact match
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return String(row[name]).trim();
      }
      // Check case-insensitive match
      const lowerName = name.toLowerCase();
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return String(row[key]).trim();
        }
      }
    }
    return '';
  }

  /**
   * Normalize text values
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normalize branch names to standard format
   */
  private normalizeBranchName(branch: string): string {
    const branchMapping: Record<string, string> = {
      'computer engineering': 'Computer Engineering',
      'computer science': 'Computer Science and Engineering',
      'computer science and engineering': 'Computer Science and Engineering',
      'cse': 'Computer Science and Engineering',
      'ce': 'Computer Engineering',
      'information technology': 'Information Technology',
      'it': 'Information Technology',
      'electronics and telecommunication': 'Electronics and Telecommunication Engineering',
      'entc': 'Electronics and Telecommunication Engineering',
      'electronics and telecommunication engineering': 'Electronics and Telecommunication Engineering',
      'mechanical engineering': 'Mechanical Engineering',
      'mech': 'Mechanical Engineering',
      'me': 'Mechanical Engineering',
      'civil engineering': 'Civil Engineering',
      'electrical engineering': 'Electrical Engineering',
      'ai': 'Artificial Intelligence and Data Science',
      'ai and ds': 'Artificial Intelligence and Data Science',
      'artificial intelligence': 'Artificial Intelligence and Data Science',
      'artificial intelligence and data science': 'Artificial Intelligence and Data Science',
      'aiml': 'Artificial Intelligence and Machine Learning',
      'ai and ml': 'Artificial Intelligence and Machine Learning',
      'artificial intelligence and machine learning': 'Artificial Intelligence and Machine Learning',
    };

    const normalizedBranch = branch.toLowerCase().trim();
    return branchMapping[normalizedBranch] || this.normalizeText(branch);
  }

  /**
   * Normalize category values
   */
  private normalizeCategory(category: string): string {
    const categoryMapping: Record<string, string> = {
      'open': 'Open',
      'general': 'Open',
      'gopen': 'Open',
      'gopenf': 'Open',
      'lopen': 'Open',
      'sc': 'SC',
      'gsc': 'SC',
      'gsch': 'SC',
      'lsc': 'SC',
      'st': 'ST',
      'gst': 'ST',
      'lst': 'ST',
      'obc': 'OBC',
      'gobc': 'OBC',
      'lobc': 'OBC',
      'sebc': 'OBC',
      'nt': 'NT',
      'gnt': 'NT',
      'gntb': 'NT',
      'gntc': 'NT',
      'gntd': 'NT',
      'lnt': 'NT',
      'vjnt': 'NT',
      'ews': 'EWS',
      'gews': 'EWS',
      'lews': 'EWS',
      'tfws': 'TFWS',
    };

    const normalizedCategory = category.toLowerCase().trim().replace(/[^a-z]/g, '');
    return categoryMapping[normalizedCategory] || category.toUpperCase();
  }

  /**
   * Normalize CAP round values
   */
  private normalizeCapRound(round: string): string {
    const roundStr = round.toString().toLowerCase().trim();
    if (roundStr.includes('1') || roundStr.includes('i') && !roundStr.includes('ii')) {
      return 'I';
    } else if (roundStr.includes('2') || roundStr.includes('ii')) {
      return 'II';
    } else if (roundStr.includes('3') || roundStr.includes('iii')) {
      return 'III';
    }
    return 'I';
  }

  /**
   * Extract unique filter options from data
   */
  private extractFilterOptions(): void {
    const yearsSet = new Set<string>();
    const capRoundsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const branchesSet = new Set<string>();
    const locationsSet = new Set<string>();

    this.collegeData.forEach(college => {
      yearsSet.add(college.year);
      capRoundsSet.add(college.capRound);
      categoriesSet.add(college.category);
      branchesSet.add(college.branchName);
      if (college.location) locationsSet.add(college.location);
      if (college.district) locationsSet.add(college.district);
    });

    this.filterOptions = {
      years: Array.from(yearsSet).sort().reverse(),
      capRounds: Array.from(capRoundsSet).sort(),
      categories: Array.from(categoriesSet).sort(),
      branches: Array.from(branchesSet).sort(),
      locations: Array.from(locationsSet).sort(),
    };
  }

  /**
   * Get all loaded college data
   */
  getAllColleges(): CollegeData[] {
    return this.collegeData;
  }

  /**
   * Get filter options for frontend
   */
  getFilterOptions(): FilterOptions {
    return this.filterOptions;
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.isDataLoaded;
  }
}

// Singleton instance
export const dataService = new DataService();
