"""
Fix seat matrix code mismatches by matching college names.
Updates seatmatrix_2025.csv to add a cap_code column with the correct CAP numeric code.
"""
import csv, re, glob

def normalize(name):
    n = re.sub(r"[^a-z0-9\s]", " ", name.lower())
    return re.sub(r"\s+", " ", n).strip()

def word_overlap(a, b):
    stop = {'of','and','the','college','engineering','technology','institute','science',
            'management','arts','s','t','for','women','in','a','an'}
    wa = set(normalize(a).split()) - stop
    wb = set(normalize(b).split()) - stop
    if not wa or not wb: return 0
    return len(wa & wb) / min(len(wa), len(wb))

data_dir = 'backend-mhtcet/data'

# Load all CAP colleges (code -> name)
cap = {}
for f in sorted(glob.glob(f'{data_dir}/cap1_*.csv')):
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = str(row['College_Code']).lstrip('0')
            cap[code] = row['College_Name'].strip()

# Load seat matrix
with open(f'{data_dir}/seatmatrix_2025.csv', encoding='utf-8') as f:
    seat_rows = list(csv.DictReader(f))

# Build name->code lookup for seat matrix
seat_name_to_code = {}
for r in seat_rows:
    code = r['college_code'].lstrip('0')
    name = r['college_name'].strip()
    seat_name_to_code[name.lower()] = code

# Find mismatched colleges and build correction map
# seat_code -> cap_code
corrections = {}
missing_cap = {c: cap[c] for c in cap if c not in {r['college_code'].lstrip('0') for r in seat_rows}}

print(f"CAP colleges not found by code in seat matrix: {len(missing_cap)}")
matched = 0
for cap_code, cap_name in missing_cap.items():
    best_seat_code, best_score, best_name = '', 0, ''
    for seat_name, seat_code in seat_name_to_code.items():
        score = word_overlap(cap_name, seat_name)
        if score > best_score:
            best_score = score
            best_seat_code = seat_code
            best_name = seat_name
    if best_score >= 0.7:
        corrections[best_seat_code] = cap_code
        print(f"  MATCH({best_score:.2f}): CAP[{cap_code}] {cap_name[:40]}")
        print(f"         SEAT[{best_seat_code}] {best_name[:40]}")
        matched += 1
    else:
        print(f"  FAIL ({best_score:.2f}): CAP[{cap_code}] {cap_name[:40]}")

print(f"\nMatched: {matched}/{len(missing_cap)}")

# Apply corrections to seat matrix - add/update college_code
if corrections:
    updated = 0
    for r in seat_rows:
        old_code = r['college_code'].lstrip('0')
        if old_code in corrections:
            r['college_code'] = corrections[old_code]
            updated += 1
    
    with open(f'{data_dir}/seatmatrix_2025.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = list(seat_rows[0].keys())
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(seat_rows)
    print(f"\nUpdated {updated} rows in seatmatrix_2025.csv")
