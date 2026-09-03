"""Full coverage check across all data files"""
import csv, glob, os

data_dir = 'backend-mhtcet/data'

# ── 1. Load all unique colleges from CAP data ──────────────────────────────
cap_colleges = {}  # code -> name
for f in sorted(glob.glob(f'{data_dir}/cap*.csv')):
    if 'seat' in f or 'fees' in f or 'placement' in f or 'mapping' in f: continue
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = str(row.get('College_Code', '')).lstrip('0')
            name = row.get('College_Name', '').strip()
            if code and name:
                cap_colleges[code] = name

print(f"Total unique colleges in CAP data: {len(cap_colleges)}")

# ── 2. Fees coverage ───────────────────────────────────────────────────────
fees = {}
with open(f'{data_dir}/college_fees_2025_26.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        if row.get('cap_code'):
            fees[row['cap_code']] = float(row['annual_fees']) if row['annual_fees'].replace('.','').isdigit() else None

fees_covered = sum(1 for c in cap_colleges if c in fees and fees[c])
print(f"\nFees coverage: {fees_covered}/{len(cap_colleges)} ({fees_covered*100//len(cap_colleges)}%)")
missing_fees = [f"{c}: {cap_colleges[c][:50]}" for c in cap_colleges if c not in fees]
print(f"Missing fees: {len(missing_fees)} colleges")
if missing_fees[:5]:
    print("  Sample:", missing_fees[:3])

# ── 3. Seat matrix coverage ────────────────────────────────────────────────
seat_map = {}  # (code, branch) -> intake
with open(f'{data_dir}/seatmatrix_2025.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        code = str(row['college_code']).lstrip('0')
        branch = row['branch_name'].lower().strip()
        intake = row['intake'].strip()
        cat = row['category'].lower().strip()
        # Use State Level OR Home University + Other than Home University
        if code and branch and intake.isdigit() and int(intake) > 0 and \
           cat in ('state level', 'home university', 'other than home university'):
            key = (code, branch)
            seat_map[key] = seat_map.get(key, 0) + int(intake)

seat_colleges = {k[0] for k in seat_map}
seat_covered = sum(1 for c in cap_colleges if c in seat_colleges)
print(f"\nSeat matrix coverage: {seat_covered}/{len(cap_colleges)} ({seat_covered*100//len(cap_colleges)}%)")
missing_seats = [f"{c}: {cap_colleges[c][:50]}" for c in cap_colleges if c not in seat_colleges]
print(f"Missing seats: {len(missing_seats)} colleges")

# ── 4. Placement coverage ──────────────────────────────────────────────────
placement = {}
with open(f'{data_dir}/placement_data_2025_26.csv', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        if row.get('cap_code'):
            avg = row.get('avg_package_lpa', '').strip()
            if avg and avg not in ('N/A', '', '0'):
                placement[row['cap_code']] = float(avg)

pkg_covered = sum(1 for c in cap_colleges if c in placement)
print(f"\nPlacement (avg package) coverage: {pkg_covered}/{len(cap_colleges)} ({pkg_covered*100//len(cap_colleges)}%)")

# ── 5. Summary ─────────────────────────────────────────────────────────────
print("\n=== SUMMARY ===")
print(f"Total colleges: {len(cap_colleges)}")
print(f"Fees data:      {fees_covered} ({fees_covered*100//len(cap_colleges)}%)")
print(f"Seat intake:    {seat_covered} ({seat_covered*100//len(cap_colleges)}%)")
print(f"Avg package:    {pkg_covered} ({pkg_covered*100//len(cap_colleges)}%)")

# ── 6. Verify seat values are reasonable ──────────────────────────────────
print("\n=== SEAT INTAKE SANITY CHECK ===")
values = list(seat_map.values())
print(f"Min: {min(values)}, Max: {max(values)}, Avg: {sum(values)//len(values)}")
outliers = [(k, v) for k, v in seat_map.items() if v > 500]
if outliers:
    print(f"Outliers (>500 seats): {len(outliers)}")
    for k, v in outliers[:5]:
        print(f"  {k[0]} | {k[1]}: {v}")
else:
    print("No outliers (all values <= 500) ✓")
