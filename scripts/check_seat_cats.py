import csv

with open('backend-mhtcet/data/seatmatrix_2025.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

# Find a college with Home University category
home_uni = [r for r in rows if r['category'] == 'Home University']
if home_uni:
    code = home_uni[0]['college_code'].lstrip('0')
    branch = home_uni[0]['branch_name']
    college_rows = [r for r in rows if r['college_code'].lstrip('0') == code and r['branch_name'] == branch]
    print(f'College {code} - {branch}:')
    for r in college_rows:
        print(f"  {r['category']}: {r['intake']}")
    
    # What's the total sanctioned intake?
    home = sum(int(r['intake']) for r in college_rows if r['category'] == 'Home University' and r['intake'].isdigit())
    other = sum(int(r['intake']) for r in college_rows if r['category'] == 'Other than Home University' and r['intake'].isdigit())
    print(f"\nHome University: {home}")
    print(f"Other than Home University: {other}")
    print(f"Total (Home + Other): {home + other}")
    print(f"This should be the sanctioned intake for this branch")
