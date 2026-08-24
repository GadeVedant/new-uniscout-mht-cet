import csv

with open('backend-mhtcet/data/seatmatrix_2025.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

print('Headers:', list(rows[0].keys()))
print('Sample rows:')
for r in rows[:5]:
    code = r['college_code']
    branch = r['branch_name'][:30]
    cat = r['category']
    intake = r['intake']
    print(f'  code={code} branch={branch} cat={cat} intake={intake}')

cats = set(r['category'].lower().strip() for r in rows)
print('Categories in seat matrix:', sorted(cats))

# Check if same college+branch has multiple category rows
from collections import defaultdict
cb_cats = defaultdict(set)
for r in rows:
    key = (r['college_code'].lstrip('0'), r['branch_name'].lower().strip())
    cb_cats[key].add(r['category'].lower().strip())

multi = [(k, v) for k, v in cb_cats.items() if len(v) > 1]
print(f'\nCollege+branch combos with multiple categories: {len(multi)}')
if multi:
    k, v = multi[0]
    print(f'  Example: code={k[0]} branch={k[1][:30]} cats={sorted(v)}')
