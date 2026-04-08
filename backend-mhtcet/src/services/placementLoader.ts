/**
 * PlacementLoader
 * Loads placement data from a CSV file and provides lookup by college code or name.
 * Gracefully handles missing file — returns null values when no data is available.
 */
import fs from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import logger from '../utils/logger.js';

export interface PlacementRecord {
  collegeCode: string;
  collegeName: string;
  avgPackage: string | null;
  highestPackage: string | null;
}

function formatPackage(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const trimmed = raw.trim();
  // Already formatted (contains ₹ or LPA)
  if (trimmed.includes('₹') || trimmed.toLowerCase().includes('lpa')) return trimmed;
  const num = parseFloat(trimmed);
  if (isNaN(num)) return null;
  return `₹${num} LPA`;
}

export class PlacementLoader {
  private byCode = new Map<string, PlacementRecord>();
  private byName = new Map<string, PlacementRecord>();

  async load(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      logger.warn(`PlacementLoader: file not found at ${filePath} — placement data will be unavailable`);
      return;
    }

    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let headers: string[] = [];
    let rowIndex = 0;

    for await (const line of rl) {
      if (rowIndex === 0) {
        headers = line.split(',').map((h) => h.trim().toLowerCase());
        rowIndex++;
        continue;
      }

      const cols = line.split(',').map((c) => c.trim());
      const get = (keys: string[]) => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1 && cols[idx]) return cols[idx];
        }
        return undefined;
      };

      const collegeCode = get(['college_code', 'code', 'inst_code']) ?? '';
      const collegeName = get(['college_name', 'name', 'institute_name']) ?? '';
      const avgRaw = get(['avg_package', 'avg_package_lpa', 'average_package', 'avg_lpa']);
      const highRaw = get(['highest_package', 'highest_package_lpa', 'max_package', 'highest_lpa']);

      const avgPackage = formatPackage(avgRaw);
      const highestPackage = formatPackage(highRaw);

      if (avgRaw && avgPackage === null) {
        logger.warn(`PlacementLoader: skipping non-numeric avg_package at row ${rowIndex}: "${avgRaw}"`);
      }
      if (highRaw && highestPackage === null) {
        logger.warn(`PlacementLoader: skipping non-numeric highest_package at row ${rowIndex}: "${highRaw}"`);
      }

      const record: PlacementRecord = { collegeCode, collegeName, avgPackage, highestPackage };

      if (collegeCode) this.byCode.set(collegeCode, record);
      if (collegeName) this.byName.set(collegeName.toLowerCase(), record);

      rowIndex++;
    }

    logger.info(`PlacementLoader: loaded ${this.byCode.size} records`);
  }

  getPlacement(collegeCode: string, collegeName: string): { avgPackage: string | null; highestPackage: string | null } {
    const byCode = this.byCode.get(collegeCode);
    if (byCode) return { avgPackage: byCode.avgPackage, highestPackage: byCode.highestPackage };

    const byName = this.byName.get(collegeName.toLowerCase());
    if (byName) return { avgPackage: byName.avgPackage, highestPackage: byName.highestPackage };

    return { avgPackage: null, highestPackage: null };
  }

  get size(): number {
    return this.byCode.size;
  }
}

export const placementLoader = new PlacementLoader();
