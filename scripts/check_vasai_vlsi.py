import csv, glob

# Check all categories for Vasai VLSI college (code 3194) across all years
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    year = f.split('_')[-1].replace('.csv','')
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = row['College_Code'].lstrip('0')
            branch = row.get('Branch_Name','').lower()
            if code == '3194' and 'vlsi' in branch:
                cat = row['Category']
                pct = row['Percentile']
                print(f"{year}: cat={cat} pct={pct}")

# Also check what SC-related categories exist for VLSI branches anywhere
print("\n=== SC categories for VLSI branch across all colleges ===")
sc_cats = set()
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            branch = row.get('Branch_Name','').lower()
            cat = row['Category']
            if 'vlsi' in branch and 'sc' in cat.lower():
                sc_cats.add(cat)
print("SC-related categories:", sorted(sc_cats))

# Check what the dedup keeps for code 3194 VLSI
print("\n=== After dedup: what's kept for 3194 VLSI ===")
best = {}
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    year = f.split('_')[-1].replace('.csv','')
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = row['College_Code'].lstrip('0')
            branch = row.get('Branch_Name','').lower()
            cat = row['Category']
            if code == '3194' and 'vlsi' in branch:
                key = f"{code}|{branch}|{cat}|I"
                existing = best.get(key)
                if not existing or year > existing[0]:
                    best[key] = (year, row['Percentile'])

for k, (yr, pct) in sorted(best.items()):
    print(f"  {k.split('|')[2]} -> year={yr} pct={pct}")
