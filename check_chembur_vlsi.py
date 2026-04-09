import csv, glob

# Find VLSI colleges in Mumbai/Chembur
print("=== VLSI colleges in Mumbai/Chembur ===")
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    year = f.split('_')[-1].replace('.csv','')
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            branch = row.get('Branch_Name','').lower()
            loc = row.get('Location','').lower()
            name = row.get('College_Name','').lower()
            if 'vlsi' in branch and ('chembur' in loc or 'chembur' in name or 'mumbai' in loc):
                code = row['College_Code'].lstrip('0')
                cat = row['Category']
                pct = row['Percentile']
                cname = row['College_Name']
                cloc = row['Location']
                print(f"  {year}: code={code} cat={cat} pct={pct} loc={cloc}")
                print(f"    {cname}")

# Check what SC categories exist for that college
print("\n=== SC data for Mumbai VLSI colleges ===")
mumbai_vlsi_codes = set()
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            branch = row.get('Branch_Name','').lower()
            loc = row.get('Location','').lower()
            name = row.get('College_Name','').lower()
            if 'vlsi' in branch and ('chembur' in loc or 'chembur' in name or 'mumbai' in loc):
                mumbai_vlsi_codes.add(row['College_Code'].lstrip('0'))

print(f"Mumbai VLSI college codes: {mumbai_vlsi_codes}")
for code in mumbai_vlsi_codes:
    print(f"\nCode {code}:")
    for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
        year = f.split('_')[-1].replace('.csv','')
        with open(f, encoding='utf-8') as fh:
            for row in csv.DictReader(fh):
                if row['College_Code'].lstrip('0') == code and 'vlsi' in row.get('Branch_Name','').lower():
                    cat = row['Category']
                    pct = row['Percentile']
                    print(f"  {year}: cat={cat} pct={pct}")
