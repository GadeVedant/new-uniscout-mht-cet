import csv, glob, os

# Check year values in CAP data
print("=== Year values in CAP files ===")
for f in sorted(glob.glob('backend-mhtcet/data/cap1_*.csv')):
    fname = os.path.basename(f)
    with open(f, encoding='utf-8') as fh:
        row = next(csv.DictReader(fh))
        print(f"  {fname}: Year={row.get('Year','N/A')}")

# Check cutoff history for a college across all cap files
print("\n=== Cutoff history for code 3148 GOPENS ===")
for f in sorted(glob.glob('backend-mhtcet/data/cap*.csv')):
    fname = os.path.basename(f)
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = row['College_Code'].lstrip('0')
            cat = row['Category']
            branch = row.get('Branch_Name','').lower()
            if code == '3148' and cat == 'GOPENS' and 'computer engineering' in branch:
                yr = row.get('Year','')
                pct = row['Percentile']
                print(f"  {fname}: year={yr} pct={pct}")
                break
