import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import type { CollegeData, ExcelRow, FilterOptions } from '../types/index.js';

class DataService {
  private collegeData: CollegeData[] = [];
  private isDataLoaded = false;
  private filterOptions: FilterOptions = { years: [], capRounds: [], categories: [], branches: [], locations: [] };

  async loadData(): Promise<void> {
    if (config.dataDir && fs.existsSync(config.dataDir)) {
      let files = fs.readdirSync(config.dataDir)
        .filter(f => /\.(xlsx|xls|csv)$/i.test(f) && f.startsWith('cap'))
        .sort();

      if (files.length === 0) throw new Error(`No data files found in DATA_DIR: ${config.dataDir}`);

      // Load fees lookup first
      const { byCode: feesMap, byName: feesByName } = this.loadFeesMap(config.dataDir);

      // Memory optimisation: in production, load only the 2 most recent years.
      // Older years are still present for cutoff history via the same records.
      // Set LOAD_ALL_YEARS=true to override.
      if (process.env.NODE_ENV === 'production' && process.env.LOAD_ALL_YEARS !== 'true') {
        // Keep files whose name contains 2023, 2024 or 2025 (3 years of history)
        const recentFiles = files.filter(f => /202[345]/.test(f));
        if (recentFiles.length > 0) {
          logger.info(`Production mode: loading ${recentFiles.length}/${files.length} files (2023-25). Set LOAD_ALL_YEARS=true to load all.`);
          files = recentFiles;
        }
      }

      logger.info(`Loading ${files.length} data file(s) from: ${config.dataDir}`);
      let totalRows = 0;
      for (const file of files) {
        const filePath = path.join(config.dataDir, file);
        const t0 = Date.now();
        let parsed: CollegeData[];
        if (file.endsWith('.csv')) {
          parsed = this.parseCsvToCollegeData(filePath, this.collegeData.length, feesMap, feesByName);
        } else {
          const rows = this.readExcelFile(filePath);
          parsed = this.parseExcelData(rows, this.collegeData.length);
        }
        this.collegeData.push(...parsed);
        totalRows += parsed.length;
        logger.info(`  → ${file}: ${parsed.length} records (${Date.now() - t0}ms)`);
      }
      logger.info(`Total: ${totalRows} rows → ${this.collegeData.length} college records`);
    } else {
      const filePath = config.dataFilePath;
      logger.info(`Loading MHT-CET data from: ${filePath}`);
      if (!fs.existsSync(filePath)) throw new Error(`Data file not found: ${filePath}`);
      this.collegeData = filePath.endsWith('.csv')
        ? this.parseCsvToCollegeData(filePath, 0, new Map())
        : this.parseExcelData(this.readExcelFile(filePath), 0);
    }

    this.extractFilterOptions();
    this.isDataLoaded = true;
    logger.info(`Loaded ${this.collegeData.length} college records`);
  }

  private readExcelFile(filePath: string): ExcelRow[] {
    const workbook = XLSX.readFile(filePath);
    return XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[workbook.SheetNames[0]]);
  }

  /** Load fees from college_fees_*.csv into a Map<collegeCode, annualFees> and Map<collegeName, annualFees> */
  private loadFeesMap(dataDir: string): { byCode: Map<string, number>; byName: Map<string, number> } {
    const byCode = new Map<string, number>();
    const byName = new Map<string, number>();
    const feesFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('college_fees') && f.endsWith('.csv'));
    for (const file of feesFiles) {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
      const lines = content.split(/\r?\n/);
      if (lines.length < 2) continue;
      const headers = this.parseCsvLine(lines[0]);
      const codeIdx = headers.indexOf('college_code');
      const nameIdx = headers.indexOf('college_name');
      const feesIdx = headers.indexOf('annual_fees');
      if (codeIdx === -1 || feesIdx === -1) continue;
      for (let i = 1; i < lines.length; i++) {
        const vals = this.parseCsvLine(lines[i]);
        const code = String(vals[codeIdx] ?? '').replace(/^0+/, '').trim();
        const name = nameIdx !== -1 ? String(vals[nameIdx] ?? '').toLowerCase().trim() : '';
        const fees = parseFloat(vals[feesIdx] ?? '');
        if (!isNaN(fees)) {
          if (code) byCode.set(code, fees);
          if (name) byName.set(name, fees);
        }
      }
      logger.info(`  → ${file}: ${byCode.size} fees entries`);
    }
    return { byCode, byName };
  }

  /** Parse CSV directly into CollegeData — no intermediate ExcelRow array */
  private parseCsvToCollegeData(filePath: string, offset: number, feesMap: Map<string, number> = new Map(), feesByName: Map<string, number> = new Map()): CollegeData[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const result: CollegeData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const values = this.parseCsvLine(line);

      // Build a minimal lookup without creating a full ExcelRow object
      const get = (keys: string[]): string => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1 && values[idx]) return values[idx].trim();
        }
        return '';
      };

      const collegeName = get(['College_Name', 'College Name', 'Institute Name', 'Inst Name', 'Name']);
      const branchName = get(['Branch_Name', 'Branch Name', 'Course Name', 'Branch', 'Course']);
      if (!collegeName || !branchName) continue;

      const cutoffRaw = get(['Percentile', 'Cutoff', 'CutOff Percentile', 'Cutoff Percentile', 'Last Admitted Percentile']);
      const rawCode = get(['College_Code', 'College Code', 'Inst Code', 'Institute Code']);

      result.push({
        collegeCode: String(rawCode || `COL${offset + i}`).replace(/^0+/, '') || `COL${offset + i}`,
        collegeName: collegeName.replace(/\s+/g, ' '),
        branchCode: get(['Branch_Code', 'Branch Code', 'Course Code']),
        branchName: branchName.toLowerCase().trim(),
        category: get(['Category', 'Seat_Type', 'Seat Type', 'SeatType', 'Caste']),
        cutoffPercentile: parseFloat(cutoffRaw) || 0,
        year: get(['Year', 'Academic Year', 'Admission Year']),
        capRound: this.normalizeCapRound(get(['CAP_Round', 'CAP Round', 'Round', 'Round No', 'CAP Round No'])),
        location: get(['Location', 'City', 'Place', 'Taluka']),
        district: get(['District', 'Dist']),
        collegeType: get(['College_Type', 'Type', 'College Type', 'Institute Type', 'Autonomy Status']),
        status: get(['Status', 'Admission Status']),
        fees: parseFloat(get(['Fees', 'Annual Fees', 'Tuition Fee', 'Fee'])) || feesMap.get(rawCode.replace(/^0+/, '')) || feesByName.get(collegeName.toLowerCase().trim()) || undefined,
        intake: parseInt(get(['Intake', 'Seats', 'Sanctioned Intake'])) || undefined,
      });
    }
    return result;
  }

  /** Parse a single CSV line respecting quoted fields */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { result.push(''); break; }
      if (line[i] === '"') {
        // Quoted field
        let field = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"') {
            if (line[i + 1] === '"') { field += '"'; i += 2; } // escaped quote
            else { i++; break; } // closing quote
          } else {
            field += line[i++];
          }
        }
        result.push(field.trim());
        if (line[i] === ',') i++; // skip comma
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          result.push(line.slice(i).trim());
          break;
        }
        result.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return result;
  }

  private getCol(row: ExcelRow, keys: string[]): string {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  }

  private parseExcelData(rawData: ExcelRow[], offset = 0): CollegeData[] {
    return rawData.reduce<CollegeData[]>((acc, row, i) => {
      const collegeName = this.getCol(row, [
        'College_Name', 'College Name', 'Institute Name', 'Inst Name', 'Name',
      ]);
      const branchName = this.getCol(row, [
        'Branch_Name', 'Branch Name', 'Course Name', 'Branch', 'Course',
      ]);
      if (!collegeName || !branchName) return acc;

      // Percentile: CAP CSVs use "Percentile" column directly
      const cutoffRaw = this.getCol(row, [
        'Percentile', 'Cutoff', 'CutOff Percentile', 'Cutoff Percentile', 'Last Admitted Percentile',
      ]);
      const cutoffPercentile = parseFloat(cutoffRaw) || 0;

      acc.push({
        collegeCode: String(this.getCol(row, ['College_Code', 'College Code', 'Inst Code', 'Institute Code']) || `COL${offset + i}`).replace(/^0+/, '') || `COL${offset + i}`,
        collegeName: collegeName.replace(/\s+/g, ' '),
        branchCode: this.getCol(row, ['Branch_Code', 'Branch Code', 'Course Code']),
        branchName: branchName.toLowerCase().trim(),
        category: this.getCol(row, ['Category', 'Seat_Type', 'Seat Type', 'SeatType', 'Caste']),
        cutoffPercentile,
        year: this.getCol(row, ['Year', 'Academic Year', 'Admission Year']),
        capRound: this.normalizeCapRound(
          this.getCol(row, ['CAP_Round', 'CAP Round', 'Round', 'Round No', 'CAP Round No'])
        ),
        location: this.getCol(row, ['Location', 'City', 'Place', 'Taluka']),
        district: this.getCol(row, ['District', 'Dist']),
        collegeType: this.getCol(row, ['College_Type', 'Type', 'College Type', 'Institute Type', 'Autonomy Status']),
        status: this.getCol(row, ['Status', 'Admission Status']),
        fees: parseFloat(this.getCol(row, ['Fees', 'Annual Fees', 'Tuition Fee', 'Fee'])) || undefined,
        intake: parseInt(this.getCol(row, ['Intake', 'Seats', 'Sanctioned Intake'])) || undefined,
      });
      return acc;
    }, []);
  }

  private normalizeCapRound(raw: string): string {
    const s = raw.trim();
    if (['1', 'I', 'i', 'Round 1', 'CAP Round 1', 'CAP Round I'].includes(s)) return 'I';
    if (['2', 'II', 'ii', 'Round 2', 'CAP Round 2', 'CAP Round II'].includes(s)) return 'II';
    if (['3', 'III', 'iii', 'Round 3', 'CAP Round 3', 'CAP Round III'].includes(s)) return 'III';
    return s;
  }

  private extractFilterOptions(): void {
    const sets = { years: new Set<string>(), capRounds: new Set<string>(), categories: new Set<string>(), branches: new Set<string>(), locations: new Set<string>() };
    for (const c of this.collegeData) {
      if (c.year) sets.years.add(c.year);
      if (c.capRound) sets.capRounds.add(c.capRound);
      if (c.category) sets.categories.add(c.category);
      if (c.branchName) sets.branches.add(c.branchName);
      if (c.location) sets.locations.add(c.location);
    }
    this.filterOptions = {
      years: [...sets.years].sort(),
      capRounds: [...sets.capRounds].sort(),
      categories: [...sets.categories].sort(),
      branches: [...sets.branches].sort(),
      locations: [...sets.locations].sort(),
    };
  }

  getAllColleges(): CollegeData[] { return this.collegeData; }
  getFilterOptions(): FilterOptions { return this.filterOptions; }
  isLoaded(): boolean { return this.isDataLoaded; }
  getStats() {
    return {
      totalRecords: this.collegeData.length,
      totalColleges: new Set(this.collegeData.map(c => c.collegeCode)).size,
      totalBranches: this.filterOptions.branches.length,
      isLoaded: this.isDataLoaded,
    };
  }
}

export const dataService = new DataService();
