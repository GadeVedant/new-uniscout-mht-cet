import csv, glob, os

PRIMARY_CATS = {'state level', 'home university', 'other than home university'}

files = sorted(glob.glob('backend-mhtcet/data/seat_matrix*.csv') + glob.glob('backend-mhtcet/data/seatmatrix*.csv'))
for f in files:
    with open(f, encoding='utf-8') as fh:
        rows = list(csv.DictReader(fh))
    codes = {r['college_code'].lstrip('0') for r in rows}
    fname = os.path.basename(f)
    print(f"{fname}: {len(rows)} rows, {len(codes)} colleges")

# Combined coverage with fallback logic (mirrors dataService.ts loadSeatMap)
all_seat_codes = set()
for f in files:
    primary_codes = set()
    fallback_codes = set()
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = row['college_code'].lstrip('0')
            cat = row.get('category', '').lower().strip()
            intake = row.get('intake', '').strip()
            if not code or not intake.isdigit() or int(intake) <= 0:
                continue
            if cat in PRIMARY_CATS:
                primary_codes.add(code)
            else:
                fallback_codes.add(code)
    all_seat_codes |= primary_codes
    # Add fallback only for colleges with no primary data
    all_seat_codes |= (fallback_codes - primary_codes)

# Load CAP colleges
cap = {}
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = str(row['College_Code']).lstrip('0')
            cap[code] = row['College_Name'].strip()

covered = sum(1 for c in cap if c in all_seat_codes)
missing = [(c, cap[c]) for c in cap if c not in all_seat_codes]
print(f"\nTotal CAP colleges: {len(cap)}")
print(f"With seat data: {covered} ({covered*100//len(cap)}%)")
print(f"Missing: {len(missing)}")
for code, name in sorted(missing):
    print(f"  {code}: {name[:60]}")
