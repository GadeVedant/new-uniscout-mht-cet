import csv

# Check seat matrix for Sandip Institute (code 5109) - Computer Engineering
with open('backend-mhtcet/data/seatmatrix_2025.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))

sandip = [r for r in rows if r['college_code'].lstrip('0') == '5109' and 'computer' in r['branch_name'].lower()]
print('Sandip CE rows in seat matrix:')
for r in sandip:
    print(f"  cat={r['category']} round={r['cap_round']} intake={r['intake']}")

# The current code SUMS all categories - that's wrong
# It should use the total sanctioned intake (State Level row)
total_sum = sum(int(r['intake']) for r in sandip if r['intake'].strip().isdigit())
state_level = [r for r in sandip if r['category'] == 'State Level']
print(f'\nCurrent (sum all categories): {total_sum}')
print(f'State Level only: {[r["intake"] for r in state_level]}')
print(f'Correct value should be: {state_level[0]["intake"] if state_level else "N/A"}')

# Check a few more colleges
print('\n--- Sample colleges ---')
for code in ['1002', '3143', '6141']:
    ce_rows = [r for r in rows if r['college_code'].lstrip('0') == code and 'computer' in r['branch_name'].lower()]
    if not ce_rows:
        ce_rows = [r for r in rows if r['college_code'].lstrip('0') == code][:3]
    state = [r for r in ce_rows if r['category'] == 'State Level']
    total = sum(int(r['intake']) for r in ce_rows if r['intake'].strip().isdigit())
    print(f"Code {code}: state_level={state[0]['intake'] if state else 'N/A'} sum_all={total} branch={ce_rows[0]['branch_name'][:30] if ce_rows else 'N/A'}")
