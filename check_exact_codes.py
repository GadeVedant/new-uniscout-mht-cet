import csv, glob, os

missing_codes = ['3025','3460','4005','4141','4285','4304','5256','5322','5449','6160','6285','6318','6419','6802','6938']

files = sorted(glob.glob('backend-mhtcet/data/seat_matrix*.csv') + glob.glob('backend-mhtcet/data/seatmatrix*.csv'))

for cap_code in missing_codes:
    found_rows = []
    for f in files:
        fname = os.path.basename(f)
        with open(f, encoding='utf-8') as fh:
            for row in csv.DictReader(fh):
                code = str(row.get('college_code', '')).lstrip('0')
                cat = row.get('category', '').lower().strip()
                intake = row.get('intake', '').strip()
                if code == cap_code:
                    found_rows.append((fname, row.get('branch_name',''), intake, cat))
    
    valid = [(f, b, i, c) for f, b, i, c in found_rows 
             if c in ('state level', 'home university', 'other than home university') 
             and i.isdigit() and int(i) > 0]
    
    if valid:
        print(f"CAP {cap_code}: FOUND {len(valid)} valid rows")
        for fname, branch, intake, cat in valid[:3]:
            print(f"  {fname}: {branch[:35]} | intake={intake} | {cat}")
    elif found_rows:
        print(f"CAP {cap_code}: Found {len(found_rows)} rows but NONE valid (wrong category or zero intake)")
        for fname, branch, intake, cat in found_rows[:3]:
            print(f"  {fname}: {branch[:35]} | intake={intake} | cat='{cat}'")
    else:
        print(f"CAP {cap_code}: NOT IN ANY SEAT MATRIX FILE")
