/**
 * PharmacyDataService
 * Loads ONLY pharmacy cutoff files (BPHARMA / DPHARMACY) and pharmacy
 * seat-matrix files. Completely separate from the engineering DataService
 * so the two datasets never collide.
 */
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import type { CollegeData, FilterOptions } from '../types/index.js';

class PharmacyDataService {
  private collegeData: CollegeData[]  = [];
  private allYearsData: CollegeData[] = [];
  private isDataLoaded = false;
  private filterOptions: FilterOptions = {
    years: [], capRounds: [], categories: [], branches: [], locations: [],
  };

  // ── Public API ─────────────────────────────────────────────────────────────
  getAllColleges():    CollegeData[]  { return this.collegeData; }
  getAllYearsData():   CollegeData[]  { return this.allYearsData; }
  getFilterOptions(): FilterOptions  { return this.filterOptions; }
  isLoaded():         boolean        { return this.isDataLoaded; }

  // ── Loader ─────────────────────────────────────────────────────────────────
  async loadData(): Promise<void> {
    const dataDir = config.dataDir;
    if (!dataDir || !fs.existsSync(dataDir)) {
      logger.warn('PharmacyDataService: DATA_DIR not found, pharmacy data unavailable');
      return;
    }

    // Pharmacy cutoff files — 2025 only.
    // Pharmacy has no cutoff-history chart or Round 2 strategy feature yet,
    // so older years are not needed and would waste RAM on the free tier.
    const cutoffFiles = fs.readdirSync(dataDir)
      .filter(f =>
        f.endsWith('.csv') &&
        f.startsWith('2025') &&
        (f.toUpperCase().includes('BPHARMA') || f.toUpperCase().includes('DPHARMACY'))
      )
      .sort();

    if (cutoffFiles.length === 0) {
      logger.warn('PharmacyDataService: no pharmacy cutoff files found');
      return;
    }

    // Build pharmacy-specific seat map from *pharmacy* seat matrix files
    const seatMap = this.loadPharmacySeatMap(dataDir);

    logger.info(`PharmacyDataService: loading ${cutoffFiles.length} cutoff file(s)`);
    let totalRows = 0;
    // Accumulate directly into allYearsData — no separate copy needed
    for (const file of cutoffFiles) {
      const filePath = path.join(dataDir, file);
      const t0 = Date.now();
      const parsed = this.parseCsvToCollegeData(filePath, this.allYearsData.length, seatMap);
      this.allYearsData.push(...parsed);
      totalRows += parsed.length;
      logger.info(`  → ${file}: ${parsed.length} records (${Date.now() - t0}ms)`);
    }
    logger.info(`PharmacyDataService: ${totalRows} rows loaded`);

    // Dedup — keep most recent year per college+branch+category+capRound
    // collegeData is derived from allYearsData via Map; no array spread copy
    const best = new Map<string, CollegeData>();
    for (const row of this.allYearsData) {
      const key = `${row.collegeCode}|${row.branchName}|${row.category}|${row.capRound}`;
      const existing = best.get(key);
      if (!existing || (row.year ?? '') > (existing.year ?? '')) {
        best.set(key, row);
      }
    }
    this.collegeData = [...best.values()];
    logger.info(`PharmacyDataService: ${this.collegeData.length} records after dedup`);

    this.extractFilterOptions();
    this.isDataLoaded = true;
  }

  // ── Pharmacy seat-map ──────────────────────────────────────────────────────
  /**
   * Loads only pharmacy seat-matrix files.
   * Key: "collegeCode|branch" (both normalised).
   * Uses maximum intake across all categories (no State-Level concept in pharmacy).
   */
  private loadPharmacySeatMap(dataDir: string): Map<string, number> {
    const map = new Map<string, number>();

    const files = fs.readdirSync(dataDir)
      .filter(f =>
        f.endsWith('.csv') &&
        f.startsWith('2025') &&           // 2025 only — matches data loaded above
        (
          f.toLowerCase().includes('seatmatrix') ||
          f.toLowerCase().includes('seat_matrix')
        ) &&
        (
          f.toLowerCase().includes('pharma') ||
          f.toLowerCase().includes('pharmacy')
        )
      )
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
      const lines   = content.split(/\r?\n/);
      if (lines.length < 2) continue;

      const headers  = this.parseCsvLine(lines[0]);
      const codeIdx  = headers.indexOf('college_code');
      const branchIdx = headers.indexOf('branch_name');
      const intakeIdx = headers.indexOf('intake');
      if (codeIdx === -1 || branchIdx === -1 || intakeIdx === -1) continue;

      for (let i = 1; i < lines.length; i++) {
        const vals   = this.parseCsvLine(lines[i]);
        const code   = String(vals[codeIdx]   ?? '').replace(/^0+/, '').trim();
        const branch = String(vals[branchIdx] ?? '').toLowerCase().trim();
        const intake = parseInt(vals[intakeIdx] ?? '');
        if (!code || !branch || isNaN(intake) || intake <= 0) continue;
        const key = `${code}|${branch}`;
        // Keep max intake across all category rows
        if (intake > (map.get(key) ?? 0)) map.set(key, intake);
      }
      logger.info(`  pharmacy seat map: ${file} → ${map.size} entries`);
    }
    return map;
  }

  // ── CSV parser ─────────────────────────────────────────────────────────────
  private parseCsvToCollegeData(
    filePath: string,
    offset:   number,
    seatMap:  Map<string, number>,
  ): CollegeData[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines   = content.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const result: CollegeData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const values = this.parseCsvLine(line);

      const get = (keys: string[]): string => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1 && values[idx]) return values[idx].trim();
        }
        return '';
      };

      const collegeName = get(['College_Name', 'College Name', 'Institute Name', 'Name']);
      const branchName  = get(['Branch_Name',  'Branch Name',  'Course Name',    'Branch', 'Course']);
      if (!collegeName || !branchName) continue;

      const cutoffRaw = get(['Percentile', 'Cutoff', 'CutOff Percentile', 'Cutoff Percentile']);
      const rawCode   = get(['College_Code', 'College Code', 'Inst Code', 'Institute Code']);
      const cleanCode = String(rawCode || `COL${offset + i}`).replace(/^0+/, '') || `COL${offset + i}`;
      const branchLow = branchName.toLowerCase().trim();

      result.push({
        collegeCode:      cleanCode,
        collegeName:      collegeName.replace(/\s+/g, ' '),
        branchCode:       '',             // pharmacy CSVs have no branch code
        branchName:       branchLow,
        category:         get(['Category', 'Seat_Type', 'Seat Type', 'SeatType', 'Caste']),
        cutoffPercentile: parseFloat(cutoffRaw) || 0,
        year:             get(['Year', 'Academic Year', 'Admission Year']),
        capRound:         this.normalizeCapRound(get(['CAP_Round', 'CAP Round', 'Round', 'Round No'])),
        location:         get(['Location', 'City', 'Place', 'Taluka']),
        district:         get(['District', 'Dist']),
        collegeType:      get(['College_Type', 'Type', 'College Type', 'Institute Type']),
        status:           '',
        fees:             undefined,      // no fees for pharmacy portal
        intake:           seatMap.get(`${cleanCode}|${branchLow}`) ?? undefined,
      });
    }
    return result;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private normalizeCapRound(raw: string): string {
    const s = raw.trim();
    if (['1', 'I', 'i', 'Round 1', 'CAP Round 1', 'CAP Round I'].includes(s))   return 'I';
    if (['2', 'II', 'ii', 'Round 2', 'CAP Round 2', 'CAP Round II'].includes(s)) return 'II';
    if (['3', 'III', 'iii', 'Round 3', 'CAP Round 3', 'CAP Round III'].includes(s)) return 'III';
    return s;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { result.push(''); break; }
      if (line[i] === '"') {
        let field = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"') {
            if (line[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += line[i++]; }
        }
        result.push(field.trim());
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { result.push(line.slice(i).trim()); break; }
        result.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return result;
  }

  private extractFilterOptions(): void {
    const sets = {
      years: new Set<string>(), capRounds: new Set<string>(),
      categories: new Set<string>(), branches: new Set<string>(), locations: new Set<string>(),
    };
    for (const c of this.collegeData) {
      if (c.year)      sets.years.add(c.year);
      if (c.capRound)  sets.capRounds.add(c.capRound);
      if (c.category)  sets.categories.add(c.category);
      if (c.branchName) sets.branches.add(c.branchName);
      if (c.location)  sets.locations.add(c.location);
    }
    this.filterOptions = {
      years:      [...sets.years].sort(),
      capRounds:  [...sets.capRounds].sort(),
      categories: [...sets.categories].sort(),
      branches:   [...sets.branches].sort(),
      locations:  [...sets.locations].sort(),
    };
  }
}

export const pharmacyDataService = new PharmacyDataService();
