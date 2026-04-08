"""
DataLoader: reads and normalises MHT-CET CAP cutoff CSV files.

Key design decisions:
- Round is derived from filename (cap1=R1, cap2=R2, cap3=R3), NOT from CAP_Round column
- Year is derived from filename (cap1_2024.csv → 2024)
- No aggressive deduplication — every (college, branch, category, round, year) row is unique
- Category is decomposed into gender, reservation_category, university_scope, special_quota
- Seat matrix joined at (college_code, branch_code, year) level only
- be_btech_summary.csv is skipped (macro summary, not joinable)
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Category code parser
# ---------------------------------------------------------------------------

# Special standalone quotas — orthogonal to reservation category
_SPECIAL_QUOTAS = {"TFWS", "ORPHAN", "DEF", "DEFR", "PWD", "PWDR", "MI", "AI", "EWS"}

# Quota prefixes to strip (order: longest first)
_QUOTA_PREFIXES = ("DEFR", "PWDR", "DEF", "PWD", "ORPHAN")

# Reservation categories (longest match first)
_RESERVATION_CODES = [
    ("OPEN",  "OPEN"),
    ("SEBC",  "SEBC"),
    ("OBC",   "OBC"),
    ("SC",    "SC"),
    ("ST",    "ST"),
    ("VJA",   "VJ"),
    ("VJB",   "VJ"),
    ("VJ",    "VJ"),
    ("NTA",   "NT"),
    ("NTB",   "NT"),
    ("NTC",   "NT"),
    ("NTD",   "NT"),
    ("NT1",   "NT"),
    ("NT2",   "NT"),
    ("NT3",   "NT"),
    ("NT",    "NT"),
    ("EWS",   "EWS"),
    ("TFWS",  "TFWS"),
    ("MI",    "MI"),
]

# Known reservation codes for scope-suffix detection
_KNOWN_RESERVATIONS = {
    "OPEN", "SC", "ST", "OBC", "SEBC", "EWS", "TFWS",
    "VJ", "VJA", "VJB",
    "NT", "NT1", "NT2", "NT3", "NTA", "NTB", "NTC", "NTD",
    "MI", "PWD", "DEF", "ORPHAN",
}


def parse_category_code(code: str) -> tuple[str, str, str, str]:
    """Decompose a MHT-CET category code into
    (gender, reservation_category, university_scope, special_quota).

    Examples:
        'GOPENS'    → ('General', 'OPEN',   'State', 'None')
        'LSCO'      → ('Ladies',  'SC',     'Other', 'None')
        'TFWS'      → ('General', 'OPEN',   'State', 'TFWS')
        'DEFOBCS'   → ('General', 'OBC',    'State', 'DEF')
        'DEFRNT1S'  → ('General', 'NT',     'State', 'DEF')
        'AI'        → ('General', 'OPEN',   'AllIndia', 'AI')
        'ORPHAN'    → ('General', 'ORPHAN', 'State', 'ORPHAN')
        'EWS'       → ('General', 'EWS',    'State', 'EWS')
    """
    if not code or not isinstance(code, str):
        return ("General", "OPEN", "State", "None")

    code = code.strip().upper()

    # AI is fully standalone
    if code == "AI":
        return ("General", "OPEN", "AllIndia", "AI")

    # TFWS, EWS, MI, ORPHAN as standalone
    if code == "TFWS":
        return ("General", "TFWS", "State", "TFWS")
    if code == "EWS":
        return ("General", "EWS", "State", "EWS")
    if code == "MI":
        return ("General", "MI", "State", "MI")
    if code == "ORPHAN":
        return ("General", "ORPHAN", "State", "ORPHAN")

    # Gender prefix
    gender = "General"
    rest = code
    if rest.startswith("L"):
        gender = "Ladies"
        rest = rest[1:]
    elif rest.startswith("G"):
        gender = "General"
        rest = rest[1:]

    # Special quota prefix
    special_quota = "None"
    for qp in _QUOTA_PREFIXES:
        if rest.startswith(qp):
            if qp in ("DEF", "DEFR"):
                special_quota = "DEF"
            elif qp in ("PWD", "PWDR"):
                special_quota = "PWD"
            elif qp == "ORPHAN":
                special_quota = "ORPHAN"
            rest = rest[len(qp):]
            break

    # Handle case where only a scope suffix remains after quota prefix
    if rest in ("H", "O", "S"):
        scope_map = {"H": "Home", "O": "Other", "S": "State"}
        return (gender, "OPEN", scope_map[rest], special_quota)
    if not rest:
        return (gender, "OPEN", "State", special_quota)

    # Scope suffix
    scope = "State"
    for suffix, scope_name in (("H", "Home"), ("O", "Other"), ("S", "State")):
        if rest.endswith(suffix) and len(rest) > 1:
            candidate = rest[:-1]
            if candidate in _KNOWN_RESERVATIONS:
                scope = scope_name
                rest = candidate
                break

    # Reservation category
    reservation = rest  # fallback to raw if unrecognised
    for code_str, res_name in _RESERVATION_CODES:
        if rest == code_str or rest.startswith(code_str):
            reservation = res_name
            # Mark TFWS/EWS as special quota too
            if res_name in ("TFWS", "EWS", "MI"):
                special_quota = res_name
            break

    return (gender, reservation, scope, special_quota)


def decompose_categories(df: pd.DataFrame) -> pd.DataFrame:
    """Add gender, reservation_category, university_scope, special_quota columns."""
    if "category" not in df.columns:
        return df
    parsed = df["category"].fillna("").apply(parse_category_code)
    df["gender"]               = parsed.apply(lambda x: x[0])
    df["reservation_category"] = parsed.apply(lambda x: x[1])
    df["university_scope"]     = parsed.apply(lambda x: x[2])
    df["special_quota"]        = parsed.apply(lambda x: x[3])
    return df


# ---------------------------------------------------------------------------
# College code normalisation
# ---------------------------------------------------------------------------

def normalise_college_code(val: object) -> str:
    """Normalise college code to zero-padded 5-digit string."""
    if pd.isna(val):
        return ""
    s = str(val).strip().split(".")[0]
    try:
        return str(int(s)).zfill(5)
    except ValueError:
        return s


# ---------------------------------------------------------------------------
# City → District mapping
# ---------------------------------------------------------------------------

CITY_TO_DISTRICT: dict[str, str] = {
    "Mumbai": "Mumbai", "Andheri": "Mumbai Suburban",
    "Thane": "Thane", "Thane (E)": "Thane", "Navi Mumbai": "Thane",
    "Kharghar Navi Mumbai": "Thane", "Ulhasnagar": "Thane", "ULHASNAGAR": "Thane",
    "Badlapur(W)": "Thane", "Bapsai Tal.Kalyan": "Thane", "Tal-Ambernath.": "Thane",
    "Tal. Shahapur": "Thane", "Dist Thane": "Thane", "Dist.Thane": "Thane",
    "New Panvel": "Raigad", "Panvel": "Raigad",
    "Vasai": "Palghar", "Virar": "Palghar", "Palghar": "Palghar", "Boisar": "Palghar",
    "Kaman Dist. Palghar": "Palghar", "Bhayinder (E) Western Rly": "Palghar",
    "Raigad.": "Raigad", "Karjat": "Raigad",
    "Khalapur Dist Raigad": "Raigad", "Tal. Khalapur. Dist. Raigad": "Raigad",
    "Lonere": "Raigad",
    "Pune": "Pune", "Pune.": "Pune", "Dist-Pune": "Pune",
    "Pimpri-Chinchwad": "Pune", "Chikhali": "Pune", "Narhe (Ambegaon)": "Pune",
    "Wagholi": "Pune", "Ravet": "Pune", "Talegaon": "Pune", "Lonavala": "Pune",
    "Avasari Khurd": "Pune", "Haveli": "Pune", "Tal. Haveli": "Pune",
    "Pisoli": "Pune", "Lakhewadi": "Pune", "Sasewadi": "Pune",
    "Dumbarwadi": "Pune", "Baramati Dist.Pune": "Pune", "Malegaon-Baramati": "Pune",
    "Tal. Indapur": "Pune", "Post Belhe Tal. Junnar Dist. Pune": "Pune",
    "Swami - Chincholi Tal. Daund Dist. Pune": "Pune", "Someshwar Nagar": "Pune",
    "Bhor": "Pune",
    "Nashik": "Nashik", "Nashik.": "Nashik", "NASHIK": "Nashik", "(Nashik)": "Nashik",
    "Adgaon Nashik": "Nashik", "Chincholi Dist. Nashik": "Nashik",
    "A.P Phulepimpalgaon": "Nashik", "Agaskhind Tal. Sinnar": "Nashik",
    "Ohar": "Nashik", "Nile": "Nashik", "Pal": "Nashik", "Paniv": "Nashik",
    "Yelgaon": "Nashik", "Kopargaon": "Nashik", "Sangamner": "Nashik",
    "Bota Sangamner": "Nashik", "Malwadi-Bota": "Nashik",
    "Malegaon.": "Nashik", "Malegaon": "Nashik",
    "Ahmednagar": "Ahmednagar", "Ahmednagar.": "Ahmednagar",
    "Dist.Ahmednagar": "Ahmednagar", "Chas Dist. Ahmednagar": "Ahmednagar",
    "Kashti": "Ahmednagar", "Shevgaon": "Ahmednagar", "Nepti": "Ahmednagar",
    "Kuran": "Ahmednagar",
    "Kolhapur": "Kolhapur", "Kolhapur.": "Kolhapur", "KOLHAPUR": "Kolhapur",
    "Dist Kolhapur": "Kolhapur", "Ichalkaranji.": "Kolhapur",
    "Yadrav(Ichalkaranji)": "Kolhapur", "Jaysingpur": "Kolhapur",
    "Gadhinglaj": "Kolhapur", "Panhala": "Kolhapur", "Warananagar": "Kolhapur",
    "Sangli": "Sangli", "Sangli.": "Sangli", "Miraj": "Sangli", "Yelur": "Sangli",
    "Kille Macchindragad Tal. Walva District- Sangali": "Sangli",
    "Satara": "Satara", "Satara.": "Satara", "Dist-Satara": "Satara",
    "Karad": "Satara", "Wadwadi": "Satara",
    "Solapur": "Solapur", "Solapur(North)": "Solapur", "solapur": "Solapur",
    "Pandharpur": "Solapur", "Sangola": "Solapur", "Barshi": "Solapur",
    "Akluj": "Solapur", "Korti Tal. Pandharpur Dist Solapur": "Solapur",
    "Bhima": "Solapur",
    "Tuljapur": "Osmanabad", "Osmanabad": "Osmanabad",
    "Latur": "Latur", "Latur.": "Latur", "LATUR": "Latur", "Dist. Latur": "Latur",
    "Ambejogai": "Beed", "Ashti": "Beed", "Beed": "Beed", "Kada": "Beed",
    "Nanded": "Nanded", "Nanded.": "Nanded", "NANDED": "Nanded",
    "District Nanded": "Nanded",
    "Pusad": "Yavatmal", "Yavatmal": "Yavatmal", "Babulgaon": "Yavatmal",
    "Aurangabad": "Aurangabad", "Chhatrapati Sambhajinagar": "Aurangabad",
    "Jalna": "Jalna", "Parbhani": "Parbhani",
    "Dhule": "Dhule", "Tal Dist Dhule": "Dhule", "Shirpur": "Dhule",
    "Dondaicha.": "Dhule",
    "Nandurbar": "Nandurbar", "Nadurbar": "Nandurbar",
    "Dist. Nandurbar": "Nandurbar", "Akkalkuwa": "Nandurbar",
    "Jalgaon": "Jalgaon", "Bhusawal": "Jalgaon", "Faizpur": "Jalgaon",
    "CHOPDA": "Jalgaon",
    "Buldhana": "Buldhana", "Shegaon": "Buldhana", "Shegaon.": "Buldhana",
    "Akola": "Akola", "Washim": "Washim",
    "Amravati": "Amravati", "Badnera": "Amravati", "Badravati": "Amravati",
    "Wardha": "Wardha", "Dist Wardha": "Wardha", "Sevagram": "Wardha",
    "Sindhi(Meghe)": "Wardha",
    "Nagpur": "Nagpur", "Ramtek": "Nagpur",
    "Tal. Hingna Hingna Nagpur": "Nagpur", "Mouza Bamni": "Nagpur",
    "Bhandara": "Bhandara", "Sakoli": "Bhandara",
    "Bhadrawati": "Chandrapur", "Chandrapur": "Chandrapur",
    "Ratnagiri": "Ratnagiri", "Ratnagiri.": "Ratnagiri", "Deorukh": "Ratnagiri",
    "Shirgaon": "Ratnagiri",
    "Kankavli": "Sindhudurg", "Sindhudurg.": "Sindhudurg",
}

_NOISE_LOCATIONS = {
    "ENGINEERING", "Engineering", "CAMPUS", "Campus", "TECHNOLOGY",
    "Technology", "Technology & Management", "MANAGEMENT", "Management",
    "University", "Institute", "Institutions", "444302", "(ICEEM)",
    "Atma Malik Institute Of Technology & Research",
    "Ashokrao Mane Group of Institutions",
}


def resolve_district(city: str) -> str:
    city = city.strip() if city else ""
    if not city or city in _NOISE_LOCATIONS:
        return ""
    return CITY_TO_DISTRICT.get(city, city)


# ---------------------------------------------------------------------------
# DataLoader
# ---------------------------------------------------------------------------

class DataLoader:
    """Loads MHT-CET CAP cutoff CSVs and seat matrix, returns a clean DataFrame."""

    def load(self, data_dir: str) -> pd.DataFrame:
        data_path = Path(data_dir)

        cutoff_files = sorted([
            f for f in data_path.glob("cap*.csv")
            if re.match(r"cap[123]_\d{4}\.csv", f.name)
        ])
        seat_matrix_files = sorted(data_path.glob("seat_matrix_*.csv"))

        if not cutoff_files:
            logger.warning("No cap*.csv files found in %s", data_dir)
            return pd.DataFrame()

        # ---- Load cutoff files ----------------------------------------
        frames = []
        for f in cutoff_files:
            round_num, year = self._parse_filename(f.name)
            if round_num is None:
                continue
            try:
                df = pd.read_csv(f)
            except Exception as e:
                logger.warning("Failed to read %s: %s", f.name, e)
                continue

            df = self._normalise_cutoff(df, round_num, year)
            frames.append(df)
            logger.info("Loaded %s: %d rows (round=%d, year=%d)", f.name, len(df), round_num, year)

        if not frames:
            return pd.DataFrame()

        df = pd.concat(frames, ignore_index=True)
        logger.info("Total cutoff rows: %d", len(df))

        # ---- Decompose category ---------------------------------------
        df = decompose_categories(df)

        # ---- Load and join seat matrix --------------------------------
        seat_df = self._load_seat_matrix(seat_matrix_files)
        if not seat_df.empty:
            df = self._join_seat_matrix(df, seat_df)
        else:
            df["total_seats"] = np.nan
            df["pwd_seats"]   = np.nan
            df["def_seats"]   = np.nan

        logger.info("Final dataset: %d rows, %d columns", len(df), len(df.columns))
        return df.reset_index(drop=True)

    # ------------------------------------------------------------------
    def _parse_filename(self, name: str) -> tuple[int | None, int | None]:
        """Extract (round, year) from filename like cap1_2024.csv."""
        m = re.match(r"cap([123])_(\d{4})\.csv", name)
        if not m:
            return None, None
        return int(m.group(1)), int(m.group(2))

    def _normalise_cutoff(self, df: pd.DataFrame, round_num: int, year: int) -> pd.DataFrame:
        """Standardise column names and add round/year from filename."""
        # Rename columns to snake_case
        col_map = {
            "Year": "raw_year", "CAP_Round": "raw_cap_round",
            "College_Code": "college_code", "College_Name": "college_name",
            "Location": "location", "College_Type": "college_type",
            "Branch_Code": "branch_code", "Branch_Name": "branch_name",
            "Category": "category", "Seat_Type": "seat_type",
            "Gender": "gender_raw", "Rank": "rank",
            "Percentile": "cutoff_percentile",
        }
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

        # Round and year from filename (authoritative)
        df["round"] = round_num
        df["year"]  = year

        # Normalise college_code
        if "college_code" in df.columns:
            df["college_code"] = df["college_code"].apply(normalise_college_code)

        # Normalise branch_name for joins
        if "branch_name" in df.columns:
            df["branch_name_norm"] = df["branch_name"].str.strip().str.lower()
            df["branch_name_norm"] = (
                df["branch_name_norm"]
                .str.replace(r"\s*&\s*", " and ", regex=True)
                .str.replace("engineering", "engg", regex=False)
                .str.replace(r"\s+", " ", regex=True)
                .str.strip()
            )
            # Prefix key (40 chars) to match potentially truncated seat matrix names
            df["branch_name_prefix"] = df["branch_name_norm"].str[:40]

        # Normalise branch_code
        if "branch_code" in df.columns:
            df["branch_code"] = df["branch_code"].astype(str).str.strip()

        # District from location
        if "location" in df.columns:
            df["district"] = df["location"].fillna("").apply(resolve_district)

        # Coerce cutoff to numeric
        if "cutoff_percentile" in df.columns:
            df["cutoff_percentile"] = pd.to_numeric(df["cutoff_percentile"], errors="coerce")
            # Drop rows with invalid cutoff
            invalid = df["cutoff_percentile"].isna() | (df["cutoff_percentile"] < 0) | (df["cutoff_percentile"] > 100)
            if invalid.any():
                logger.warning("Dropping %d rows with invalid cutoff_percentile", invalid.sum())
                df = df[~invalid]

        # Drop columns we don't need
        drop_cols = ["raw_year", "raw_cap_round", "seat_type", "gender_raw", "rank"]
        df = df.drop(columns=[c for c in drop_cols if c in df.columns])

        return df

    # ------------------------------------------------------------------
    def _load_seat_matrix(self, files) -> pd.DataFrame:
        frames = []
        for f in files:
            m = re.match(r"seat_matrix_(\d{4})\.csv", Path(f).name)
            if not m:
                continue
            year = int(m.group(1))
            try:
                sm = pd.read_csv(f)
            except Exception as e:
                logger.warning("Failed to read %s: %s", f, e)
                continue

            sm.columns = [c.strip() for c in sm.columns]
            sm = sm.rename(columns={
                "college_code": "college_code",
                "branch_name":  "branch_name",
                "branch_code":  "branch_code",
                "category":     "sm_category",
                "cap_round":    "sm_cap_round",
                "intake":       "intake",
                "filled_seats": "filled_seats",
            })
            sm["college_code"] = sm["college_code"].apply(normalise_college_code)
            sm["branch_name_norm"] = sm["branch_name"].str.strip().str.lower()
            sm["branch_name_norm"] = (
                sm["branch_name_norm"]
                .str.replace(r"\s*&\s*", " and ", regex=True)
                .str.replace("engineering", "engg", regex=False)
                .str.replace(r"\s+", " ", regex=True)
                .str.strip()
            )
            # Prefix key (40 chars) to handle truncated names in seat matrix CSV
            sm["branch_name_prefix"] = sm["branch_name_norm"].str[:40]
            if "branch_code" in sm.columns:
                sm["branch_code"] = sm["branch_code"].astype(str).str.strip()
            sm["year"] = year
            sm["intake"]       = pd.to_numeric(sm.get("intake",       np.nan), errors="coerce")
            sm["filled_seats"] = pd.to_numeric(sm.get("filled_seats", np.nan), errors="coerce")
            frames.append(sm)

        if not frames:
            return pd.DataFrame()
        return pd.concat(frames, ignore_index=True)

    def _join_seat_matrix(self, df: pd.DataFrame, seat_df: pd.DataFrame) -> pd.DataFrame:
        """Join seat matrix at (college_code, branch_code/branch_name_norm, year).

        Seat matrix has State Level / PWD / DEF rows per branch.
        - State Level filled_seats = main CAP pool (non-quota)
        - PWD filled_seats = PWD quota size
        - DEF filled_seats = DEF quota size
        These are additive and non-overlapping.
        total_seats = SL_filled + PWD_filled + DEF_filled
        """
        JOIN_KEY = ["college_code", "branch_code", "year"]
        fallback_key = ["college_code", "branch_name_norm", "year"]

        def _agg_pool(pool: pd.DataFrame, out_col: str) -> pd.DataFrame:
            if pool.empty:
                return pd.DataFrame(columns=["college_code", "branch_name_prefix", "year", out_col])
            g = pool.groupby(["college_code", "branch_name_prefix", "year"],
                             as_index=False)["filled_seats"].sum()
            return g.rename(columns={"filled_seats": out_col})

        sl   = seat_df[seat_df["sm_category"] == "State Level"]
        pwd  = seat_df[seat_df["sm_category"] == "PWD"]
        def_ = seat_df[seat_df["sm_category"] == "DEF"]

        sl_agg   = _agg_pool(sl,   "sl_filled")
        pwd_agg  = _agg_pool(pwd,  "pwd_seats")
        def_agg  = _agg_pool(def_, "def_seats")

        # Merge pools together
        seat_summary = sl_agg
        for extra, col in [(pwd_agg, "pwd_seats"), (def_agg, "def_seats")]:
            if extra.empty:
                seat_summary[col] = 0.0
            else:
                seat_summary = seat_summary.merge(
                    extra[["college_code", "branch_name_prefix", "year", col]],
                    on=["college_code", "branch_name_prefix", "year"],
                    how="left"
                )

        seat_summary["pwd_seats"]  = seat_summary.get("pwd_seats",  pd.Series(0.0)).fillna(0.0)
        seat_summary["def_seats"]  = seat_summary.get("def_seats",  pd.Series(0.0)).fillna(0.0)
        seat_summary["total_seats"] = (
            seat_summary["sl_filled"].fillna(0) +
            seat_summary["pwd_seats"] +
            seat_summary["def_seats"]
        )

        # Join on (college_code, branch_name_prefix, year)
        join_key = ["college_code", "branch_name_prefix", "year"]
        df = df.merge(
            seat_summary[join_key + ["total_seats", "pwd_seats", "def_seats"]],
            on=join_key, how="left"
        )

        matched = df["total_seats"].notna().sum()
        logger.info("Seat matrix join: %d / %d rows matched", matched, len(df))
        return df
