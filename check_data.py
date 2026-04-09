"""Check fees, seats, placement data coverage in the API"""
import urllib.request, json

BASE = "http://localhost:5001/api"

def post(path, body):
    req = urllib.request.Request(f"{BASE}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=20).read())

def get(path):
    return json.loads(urllib.request.urlopen(f"{BASE}{path}", timeout=10).read())

print("=== DATA COVERAGE CHECK ===\n")

# 1. Health
h = get("/health")
print(f"Records: {h['stats']['totalRecords']} | Colleges: {h['stats']['totalColleges']}")

# 2. Sample recommendations
r = post("/recommendations", {
    "percentile": 85, "year": "2025-26", "capRound": "I",
    "category": "GOPENS", "branchPreference": "computer engineering", "location": ""
})
colleges = r.get("data", [])
print(f"\nRecommendations (85%ile, CE, GOPENS): {len(colleges)} results")

# Check fees coverage
with_fees = [c for c in colleges if c.get("fees") and c["fees"] != "N/A"]
without_fees = [c for c in colleges if not c.get("fees") or c["fees"] == "N/A"]
print(f"  Fees populated: {len(with_fees)}/{len(colleges)}")
if with_fees:
    print(f"  Sample fees: {with_fees[0]['name'][:40]} → {with_fees[0]['fees']}")
if without_fees:
    print(f"  Missing fees sample: {without_fees[0]['name'][:40]}")

# Check seats coverage
with_seats = [c for c in colleges if c.get("seats") and c["seats"] > 0]
print(f"  Seats populated: {len(with_seats)}/{len(colleges)}")
if with_seats:
    print(f"  Sample seats: {with_seats[0]['name'][:40]} → {with_seats[0]['seats']}")

# Check placement coverage
with_pkg = [c for c in colleges if c.get("avgPackage")]
print(f"  Avg package populated: {len(with_pkg)}/{len(colleges)}")
if with_pkg:
    print(f"  Sample package: {with_pkg[0]['name'][:40]} → {with_pkg[0]['avgPackage']}")

# 3. Cutoff history
print("\n=== CUTOFF HISTORY ===")
if colleges:
    c = colleges[0]
    ch = get(f"/colleges/{c['code']}/cutoff-history?branch={c['branch'].replace(' ','+')}&category=GOPENS&capRound=I")
    print(f"College: {c['name'][:50]}")
    print(f"History entries: {len(ch.get('data', []))}")
    for e in ch.get("data", []):
        print(f"  {e['year']}: {e['cutoffPercentile']}")

# 4. Smart form filling
print("\n=== SMART FORM FILLING ===")
ff = post("/form-filling/generate", {
    "percentile": 85, "category": "GOPENS", "capRound": "I",
    "branchPreferences": ["computer engineering", "information technology"],
    "preferredDistricts": ["Pune"],
    "priorityMode": "branch"
})
if ff.get("success"):
    d = ff["data"]
    print(f"Safe: {len(d.get('safePicks',[]))} | Target: {len(d.get('targetPicks',[]))} | Dream: {len(d.get('dreamPicks',[]))}")
    if d.get("safePicks"):
        p = d["safePicks"][0]
        print(f"  Sample: {p['collegeName'][:40]} | {p['branchName']} | fees={p['fees']}")
else:
    print(f"FAILED: {ff.get('error')}")

print("\n=== DONE ===")
