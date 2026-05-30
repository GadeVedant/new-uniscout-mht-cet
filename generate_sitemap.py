"""Generate sitemap-colleges.xml from real CAP data."""
import csv, glob
from datetime import date

TODAY = date.today().isoformat()
colleges = {}  # code -> (id, name)

for f in ['backend-mhtcet/data/cap1_2025.csv']:
    with open(f, encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            code = str(row.get('College_Code', '')).lstrip('0')
            name = row.get('College_Name', '').strip()
            branch_code = str(row.get('Branch_Code', '')).strip()
            cat = row.get('Category', '').strip()
            if code and name and branch_code and cat == 'GOPENS':
                college_id = f'{code}-{branch_code}-{cat}'
                if code not in colleges:
                    colleges[code] = (college_id, name)

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']

for code, (cid, name) in sorted(colleges.items()):
    lines.append(f'''  <url>
    <loc>https://uniscout.co.in/college/{cid}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>''')

lines.append('</urlset>')

out = 'public/sitemap-colleges.xml'
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Generated {out} with {len(colleges)} college URLs")
