"""
Generate a mapping between DTE/AICTE codes (AR3439, EN1101) and CAP numeric codes (03143).
Run: python scripts/generate_code_mapping.py
Output: backend-mhtcet/data/college_code_mapping.csv
"""
import csv, re, os

def normalize(name):
    """Remove punctuation, lowercase, collapse spaces."""
    n = re.sub(r"[^a-z0-9\s]", " ", name.lower())
    return re.sub(r"\s+", " ", n).strip()

def word_overlap(a, b):
    wa = set(normalize(a).split())
    wb = set(normalize(b).split())
    # Remove common stop words
    stop = {'of', 'and', 'the', 'college', 'engineering', 'technology', 'institute', 'science', 'management', 'arts'}
    wa -= stop; wb -= stop
    if not wa or not wb: return 0
    # Also check if key distinctive words appear in both
    overlap = len(wa & wb)
    return overlap / max(len(wa), len(wb))

# Load CAP data
cap_colleges = {}  # numeric_code -> college_name
data_dir = os.path.join(os.path.dirname(__file__), '..', 'backend-mhtcet', 'data')
with open(os.path.join(data_dir, 'cap1_2025.csv'), encoding='utf-8') as f:
    for row in csv.DictReader(f):
        code = str(row['College_Code']).lstrip('0')
        cap_colleges[code] = row['College_Name'].strip()

# Load fees file (has DTE codes + names)
fees_path = os.path.join(data_dir, 'college_fees_2025_26.csv')
with open(fees_path, encoding='utf-8') as f:
    fees_rows = list(csv.DictReader(f))

# Generate mapping
mapping = []
for row in fees_rows:
    dte_code = row['college_code']
    dte_name = row['college_name'].strip()
    
    # Find best CAP match by word overlap
    best_code, best_name, best_score = '', '', 0
    for cap_code, cap_name in cap_colleges.items():
        score = word_overlap(dte_name, cap_name)
        if score > best_score:
            best_score = score
            best_code = cap_code
            best_name = cap_name

    # Lower threshold to 0.4 to catch more partial matches
    mapping.append({
        'dte_code': dte_code,
        'dte_name': dte_name[:60],
        'cap_code': best_code if best_score >= 0.4 else '',
        'cap_name': best_name[:60] if best_score >= 0.4 else '',
        'match_score': round(best_score, 2),
        'needs_review': 'YES' if best_score < 0.6 else '',
    })

out_path = os.path.join(data_dir, 'college_code_mapping.csv')
with open(out_path, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['dte_code', 'dte_name', 'cap_code', 'cap_name', 'match_score', 'needs_review'])
    w.writeheader()
    w.writerows(mapping)

matched = sum(1 for m in mapping if m['cap_code'])
print(f"Generated {out_path}")
print(f"Matched: {matched}/{len(mapping)} ({matched*100//len(mapping)}%)")
print(f"Needs review: {sum(1 for m in mapping if m['needs_review'])}")
