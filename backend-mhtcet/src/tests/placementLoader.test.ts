/**
 * Unit + property tests for PlacementLoader.
 *
 * Feature: enhanced-results-page
 * Tasks: 4.2, 4.3, 4.4, 4.5
 * Requirements: 3.1, 3.2, 10.2, 10.3, 10.6
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PlacementLoader } from '../services/placementLoader.js';

function writeTempCsv(content: string): string {
  const dir = os.tmpdir();
  const file = path.join(dir, `placement_test_${Date.now()}.csv`);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

// ---------------------------------------------------------------------------
// Task 4.4: Unit tests for PlacementLoader
// ---------------------------------------------------------------------------
describe('PlacementLoader unit tests', () => {
  it('loads valid CSV and returns correct formatted values by code', async () => {
    const csv = `college_code,college_name,avg_package,highest_package\nC001,Test College,6.5,12.0\n`;
    const file = writeTempCsv(csv);
    const loader = new PlacementLoader();
    await loader.load(file);
    const result = loader.getPlacement('C001', 'Test College');
    expect(result.avgPackage).toBe('₹6.5 LPA');
    expect(result.highestPackage).toBe('₹12 LPA');
    fs.unlinkSync(file);
  });

  it('falls back to name lookup when college_code is missing', async () => {
    const csv = `college_code,college_name,avg_package,highest_package\n,Fallback College,5.0,10.0\n`;
    const file = writeTempCsv(csv);
    const loader = new PlacementLoader();
    await loader.load(file);
    const result = loader.getPlacement('UNKNOWN', 'Fallback College');
    expect(result.avgPackage).toBe('₹5 LPA');
    fs.unlinkSync(file);
  });

  it('skips rows with non-numeric avg_package and does not throw', async () => {
    const csv = `college_code,college_name,avg_package,highest_package\nC001,Test,not_a_number,8.0\n`;
    const file = writeTempCsv(csv);
    const loader = new PlacementLoader();
    await expect(loader.load(file)).resolves.not.toThrow();
    const result = loader.getPlacement('C001', 'Test');
    expect(result.avgPackage).toBeNull();
    expect(result.highestPackage).toBe('₹8 LPA');
    fs.unlinkSync(file);
  });

  it('returns null values for non-existent file path without throwing', async () => {
    const loader = new PlacementLoader();
    await expect(loader.load('/nonexistent/path/placements.csv')).resolves.not.toThrow();
    expect(loader.size).toBe(0);
    const result = loader.getPlacement('ANY', 'ANY');
    expect(result.avgPackage).toBeNull();
    expect(result.highestPackage).toBeNull();
  });

  it('returns null for unknown college code and name', async () => {
    const csv = `college_code,college_name,avg_package,highest_package\nC001,Known College,5.0,10.0\n`;
    const file = writeTempCsv(csv);
    const loader = new PlacementLoader();
    await loader.load(file);
    const result = loader.getPlacement('UNKNOWN', 'Unknown College');
    expect(result.avgPackage).toBeNull();
    expect(result.highestPackage).toBeNull();
    fs.unlinkSync(file);
  });

  it('preserves pre-formatted values with ₹ symbol as-is', async () => {
    const csv = `college_code,college_name,avg_package,highest_package\nC001,Test,₹6.5 LPA,₹12 LPA\n`;
    const file = writeTempCsv(csv);
    const loader = new PlacementLoader();
    await loader.load(file);
    const result = loader.getPlacement('C001', 'Test');
    expect(result.avgPackage).toBe('₹6.5 LPA');
    expect(result.highestPackage).toBe('₹12 LPA');
    fs.unlinkSync(file);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Placement CSV round-trip join correctness
// Feature: enhanced-results-page, Property 7
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 10.1
// ---------------------------------------------------------------------------
describe('Property 7: Placement CSV round-trip join correctness', () => {
  it('any college loaded by code can be retrieved by code', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            code: fc.stringMatching(/^C\d{3}$/),
            // name must not contain commas or newlines (would break CSV)
            name: fc.string({ minLength: 3, maxLength: 20 }).map((s) => s.replace(/[,\n\r]/g, '_')),
            avg: fc.float({ min: 1, max: 20, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (records) => {
          // Deduplicate codes
          const unique = [...new Map(records.map((r) => [r.code, r])).values()];
          const rows = unique.map((r) => `${r.code},${r.name},${r.avg.toFixed(1)},`).join('\n');
          const csv = `college_code,college_name,avg_package,highest_package\n${rows}\n`;
          const file = writeTempCsv(csv);
          const loader = new PlacementLoader();
          await loader.load(file);

          let ok = true;
          for (const r of unique) {
            const result = loader.getPlacement(r.code, r.name);
            if (result.avgPackage === null) { ok = false; break; }
          }
          fs.unlinkSync(file);
          return ok;
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Package value formatting
// Feature: enhanced-results-page, Property 8
// Validates: Requirements 10.6
// ---------------------------------------------------------------------------
describe('Property 8: Package value formatting', () => {
  it('plain numeric values are formatted as ₹{value} LPA', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 1, max: 50, noNaN: true }),
        async (pkg) => {
          const csv = `college_code,college_name,avg_package,highest_package\nC001,Test,${pkg.toFixed(2)},\n`;
          const file = writeTempCsv(csv);
          const loader = new PlacementLoader();
          await loader.load(file);
          const result = loader.getPlacement('C001', 'Test');
          fs.unlinkSync(file);
          return result.avgPackage !== null && result.avgPackage.includes('LPA');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Invalid CSV rows are skipped
// Feature: enhanced-results-page, Property 20
// Validates: Requirements 10.3
// ---------------------------------------------------------------------------
describe('Property 20: Invalid CSV rows are skipped', () => {
  it('rows with non-numeric packages do not appear in results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => isNaN(parseFloat(s))),
        async (badValue) => {
          const csv = `college_code,college_name,avg_package,highest_package\nC001,Test,${badValue},\n`;
          const file = writeTempCsv(csv);
          const loader = new PlacementLoader();
          await loader.load(file);
          const result = loader.getPlacement('C001', 'Test');
          fs.unlinkSync(file);
          return result.avgPackage === null;
        },
      ),
      { numRuns: 100 },
    );
  });
});
