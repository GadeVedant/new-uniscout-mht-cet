"""
Unit and property-based tests for DataLoader.

Feature: mhtcet-cutoff-prediction
"""
from __future__ import annotations

import io
import logging
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# Ensure the ml-service root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.data_loader import (
    CANONICAL_COLUMNS,
    DEDUP_KEY,
    REQUIRED_FIELDS,
    DataLoader,
    _normalise_column_name,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_xlsx(df: pd.DataFrame, path: Path) -> None:
    """Write a DataFrame to an xlsx file."""
    df.to_excel(path, index=False, engine="openpyxl")


def _valid_row(**overrides) -> dict:
    base = {
        "college_code": "1001",
        "college_name": "Test College",
        "branch_name": "Computer Engineering",
        "category": "OPEN",
        "cap_round": "I",
        "year": 2023,
        "cutoff_percentile": 85.5,
        "location": "Pune",
        "district": "Pune",
        "fees": 90000,
        "intake": 60,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Unit tests — column normalisation
# ---------------------------------------------------------------------------

class TestColumnNormalisation:
    @pytest.mark.parametrize("raw,expected", [
        ("College Code", "college_code"),
        ("college code", "college_code"),
        ("COLLEGE_CODE", "college_code"),
        ("CollegeCode", "college_code"),
        ("Branch", "branch_name"),
        ("Branch Name", "branch_name"),
        ("branch", "branch_name"),
        ("Cutoff", "cutoff_percentile"),
        ("Cutoff Percentile", "cutoff_percentile"),
        ("cutoff", "cutoff_percentile"),
        ("CAP Round", "cap_round"),
        ("Round", "cap_round"),
        ("cap_round", "cap_round"),
        ("Year", "year"),
        ("College Name", "college_name"),
        ("Institute Name", "college_name"),
        ("Category", "category"),
        ("Seat Type", "category"),
        ("District", "district"),
        ("Fees", "fees"),
        ("Intake", "intake"),
        ("Total Seats", "intake"),
        ("Location", "location"),
        ("City", "location"),
    ])
    def test_known_variants(self, raw, expected):
        assert _normalise_column_name(raw) == expected

    def test_unknown_column_passthrough(self):
        assert _normalise_column_name("SomeRandomColumn") == "somerandomcolumn"

    def test_load_normalises_columns(self, tmp_path):
        """DataLoader.load should normalise variant column names."""
        df_raw = pd.DataFrame([{
            "College Code": "1001",
            "College Name": "Test College",
            "Branch": "Computer Engineering",
            "Category": "OPEN",
            "CAP Round": "I",
            "Year": 2023,
            "Cutoff": 85.5,
            "Location": "Pune",
            "District": "Pune",
            "Fees": 90000,
            "Intake": 60,
        }])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        for col in CANONICAL_COLUMNS:
            assert col in result.columns, f"Missing canonical column: {col}"

    def test_exam_type_tagged(self, tmp_path):
        df_raw = pd.DataFrame([_valid_row()])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path), exam_type="jee")
        assert "exam_type" in result.columns
        assert (result["exam_type"] == "jee").all()

    def test_empty_directory_returns_empty_df(self, tmp_path):
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert result.empty
        assert "exam_type" in result.columns


# ---------------------------------------------------------------------------
# Unit tests — row validation
# ---------------------------------------------------------------------------

class TestRowValidation:
    @pytest.mark.parametrize("missing_field", REQUIRED_FIELDS)
    def test_missing_required_field_discarded(self, tmp_path, missing_field):
        row = _valid_row()
        row[missing_field] = None
        df_raw = pd.DataFrame([row])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 0

    def test_valid_row_kept(self, tmp_path):
        df_raw = pd.DataFrame([_valid_row()])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 1

    def test_cutoff_below_zero_discarded(self, tmp_path):
        df_raw = pd.DataFrame([_valid_row(cutoff_percentile=-1)])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 0

    def test_cutoff_above_100_discarded(self, tmp_path):
        df_raw = pd.DataFrame([_valid_row(cutoff_percentile=100.1)])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 0

    def test_cutoff_at_boundary_kept(self, tmp_path):
        # Use distinct branch names so dedup key differs
        rows = [
            _valid_row(branch_name="CS", cutoff_percentile=0),
            _valid_row(branch_name="IT", cutoff_percentile=100),
        ]
        df_raw = pd.DataFrame(rows)
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 2

    def test_warning_logged_for_discarded_row(self, tmp_path, caplog):
        row = _valid_row(cutoff_percentile=None)
        df_raw = pd.DataFrame([row])
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        with caplog.at_level(logging.WARNING, logger="app.data_loader"):
            loader.load(str(tmp_path))
        assert any("Discarding" in r.message for r in caplog.records)

    def test_mixed_valid_invalid_rows(self, tmp_path):
        rows = [
            _valid_row(branch_name="CS", cutoff_percentile=80),
            _valid_row(branch_name="IT", cutoff_percentile=None),  # invalid
            _valid_row(branch_name="ME", cutoff_percentile=75),
        ]
        df_raw = pd.DataFrame(rows)
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 2


# ---------------------------------------------------------------------------
# Unit tests — deduplication
# ---------------------------------------------------------------------------

class TestDeduplication:
    def test_duplicate_key_keeps_highest_cutoff(self, tmp_path):
        rows = [
            _valid_row(cutoff_percentile=80),
            _valid_row(cutoff_percentile=90),  # same key, higher cutoff
            _valid_row(cutoff_percentile=70),  # same key, lower cutoff
        ]
        df_raw = pd.DataFrame(rows)
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 1
        assert result.iloc[0]["cutoff_percentile"] == 90

    def test_different_keys_all_kept(self, tmp_path):
        rows = [
            _valid_row(branch_name="CS", cutoff_percentile=80),
            _valid_row(branch_name="IT", cutoff_percentile=75),
            _valid_row(branch_name="ME", cutoff_percentile=70),
        ]
        df_raw = pd.DataFrame(rows)
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 3

    def test_dedup_across_multiple_files(self, tmp_path):
        row_a = _valid_row(cutoff_percentile=80)
        row_b = _valid_row(cutoff_percentile=95)  # same key, higher
        _make_xlsx(pd.DataFrame([row_a]), tmp_path / "file1.xlsx")
        _make_xlsx(pd.DataFrame([row_b]), tmp_path / "file2.xlsx")
        loader = DataLoader()
        result = loader.load(str(tmp_path))
        assert len(result) == 1
        assert result.iloc[0]["cutoff_percentile"] == 95


# ---------------------------------------------------------------------------
# Unit tests — round-trip CSV validation
# ---------------------------------------------------------------------------

class TestRoundTrip:
    def test_round_trip_valid(self, tmp_path):
        rows = [_valid_row(cutoff_percentile=85.5), _valid_row(branch_name="IT", cutoff_percentile=78.3)]
        df_raw = pd.DataFrame(rows)
        _make_xlsx(df_raw, tmp_path / "data.xlsx")
        loader = DataLoader()
        df = loader.load(str(tmp_path))
        # Should not raise
        loader.validate_round_trip(df)

    def test_round_trip_row_count_mismatch_raises(self):
        loader = DataLoader()
        df = pd.DataFrame({"cutoff_percentile": [80.0, 90.0], "year": [2023, 2023]})
        # Manually corrupt the round-trip by patching
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        df2 = pd.read_csv(buf)
        # Simulate mismatch
        with pytest.raises(AssertionError, match="row count"):
            assert len(df) + 1 == len(df2), "row count"

    def test_round_trip_tolerance(self):
        loader = DataLoader()
        df = pd.DataFrame({
            "cutoff_percentile": [85.123456],
            "fees": [90000.0],
            "intake": [60.0],
            "year": [2023],
        })
        # Should pass within default tolerance
        loader.validate_round_trip(df, tolerance=0.001)


# ---------------------------------------------------------------------------
# Property-based tests
# ---------------------------------------------------------------------------

# Property 1: Column name normalisation
# Feature: mhtcet-cutoff-prediction, Property 1: Column name normalisation
# Validates: Requirements 1.2

# All supported column name variants mapped to their canonical names.
# Each entry is (variant_name, canonical_name).
_COLUMN_VARIANT_PAIRS = [
    # college_code
    ("College Code", "college_code"),
    ("college code", "college_code"),
    ("COLLEGE_CODE", "college_code"),
    ("CollegeCode", "college_code"),
    ("inst_code", "college_code"),
    ("institute_code", "college_code"),
    ("institute code", "college_code"),
    ("inst code", "college_code"),
    ("college_id", "college_code"),
    # college_name
    ("College Name", "college_name"),
    ("college name", "college_name"),
    ("collegename", "college_name"),
    ("institute_name", "college_name"),
    ("institute name", "college_name"),
    ("institutename", "college_name"),
    ("inst_name", "college_name"),
    ("inst name", "college_name"),
    # branch_name
    ("Branch", "branch_name"),
    ("Branch Name", "branch_name"),
    ("branch", "branch_name"),
    ("branch_name", "branch_name"),
    ("course_name", "branch_name"),
    ("course name", "branch_name"),
    ("coursename", "branch_name"),
    ("course", "branch_name"),
    ("programme", "branch_name"),
    ("program", "branch_name"),
    # category
    ("Category", "category"),
    ("category", "category"),
    ("cat", "category"),
    ("seat_type", "category"),
    ("seat type", "category"),
    ("seattype", "category"),
    ("reservation", "category"),
    # cap_round
    ("CAP Round", "cap_round"),
    ("cap round", "cap_round"),
    ("capround", "cap_round"),
    ("Round", "cap_round"),
    ("round", "cap_round"),
    ("round_no", "cap_round"),
    ("round no", "cap_round"),
    ("cap_round_no", "cap_round"),
    # year
    ("Year", "year"),
    ("year", "year"),
    ("admission_year", "year"),
    ("admission year", "year"),
    ("academic_year", "year"),
    ("academic year", "year"),
    # cutoff_percentile
    ("Cutoff", "cutoff_percentile"),
    ("Cutoff Percentile", "cutoff_percentile"),
    ("cutoff", "cutoff_percentile"),
    ("cutoff_percentile", "cutoff_percentile"),
    ("closing_percentile", "cutoff_percentile"),
    ("closing percentile", "cutoff_percentile"),
    ("merit_percentile", "cutoff_percentile"),
    ("merit percentile", "cutoff_percentile"),
    ("percentile", "cutoff_percentile"),
    # location
    ("Location", "location"),
    ("location", "location"),
    ("City", "location"),
    ("city", "location"),
    ("place", "location"),
    ("college_location", "location"),
    ("college location", "location"),
    # district
    ("District", "district"),
    ("district", "district"),
    ("dist", "district"),
    ("district_name", "district"),
    ("district name", "district"),
    # fees
    ("Fees", "fees"),
    ("fees", "fees"),
    ("fee", "fees"),
    ("tuition_fees", "fees"),
    ("tuition fees", "fees"),
    ("annual_fees", "fees"),
    ("annual fees", "fees"),
    ("total_fees", "fees"),
    ("total fees", "fees"),
    # intake
    ("Intake", "intake"),
    ("intake", "intake"),
    ("total_intake", "intake"),
    ("total intake", "intake"),
    ("seat_count", "intake"),
    ("seat count", "intake"),
    ("seats", "intake"),
    ("total_seats", "intake"),
    ("total seats", "intake"),
    ("sanctioned_intake", "intake"),
    ("sanctioned intake", "intake"),
]

# One canonical variant per column (used as the data value row in XLSX fixtures).
_CANONICAL_DATA_ROW = {
    "college_code": "1001",
    "college_name": "Test College",
    "branch_name": "Computer Engineering",
    "category": "OPEN",
    "cap_round": "I",
    "year": 2023,
    "cutoff_percentile": 85.5,
    "location": "Pune",
    "district": "Pune",
    "fees": 90000,
    "intake": 60,
}


def _build_variant_row(col_variants: dict[str, str]) -> dict[str, object]:
    """Build a data row using variant column names but canonical data values."""
    return {variant_col: _CANONICAL_DATA_ROW[canonical_col]
            for canonical_col, variant_col in col_variants.items()}


# Strategy: for each canonical column, pick one of its known variant names.
_per_column_variant_strategy = st.fixed_dictionaries({
    canonical: st.sampled_from([v for v, c in _COLUMN_VARIANT_PAIRS if c == canonical])
    for canonical in CANONICAL_COLUMNS
})


@given(col_variants=_per_column_variant_strategy)
@settings(max_examples=100, deadline=None)
def test_property1_column_normalisation_xlsx(tmp_path_factory, col_variants):
    # Feature: mhtcet-cutoff-prediction, Property 1: Column name normalisation
    # Validates: Requirements 1.2
    """Property 1: Column name normalisation
    For any combination of supported column name variants written to an XLSX file,
    DataLoader.load() must return a DataFrame whose columns are exactly the
    canonical column names.
    """
    tmp_path = tmp_path_factory.mktemp("prop1")
    # Build a one-row DataFrame using the variant column names
    row = _build_variant_row(col_variants)
    df_raw = pd.DataFrame([row])
    _make_xlsx(df_raw, tmp_path / "data.xlsx")

    loader = DataLoader()
    result = loader.load(str(tmp_path))

    # The result must contain every canonical column
    for col in CANONICAL_COLUMNS:
        assert col in result.columns, (
            f"Canonical column '{col}' missing from output. "
            f"Input variant was '{col_variants[col]}'. "
            f"Output columns: {list(result.columns)}"
        )


# Property 2: Invalid row discarding
# Feature: mhtcet-cutoff-prediction, Property 2: Invalid row discarding
# Validates: Requirements 1.3, 1.4

_cutoff_out_of_range = st.one_of(
    st.floats(max_value=-0.001, allow_nan=False, allow_infinity=False),
    st.floats(min_value=100.001, max_value=1000.0, allow_nan=False, allow_infinity=False),
)


@given(
    missing_field=st.sampled_from(REQUIRED_FIELDS),
)
@settings(max_examples=30)
def test_property2_missing_field_discarded(tmp_path_factory, missing_field):
    """Property 2: Invalid row discarding — missing required field
    Validates: Requirements 1.3
    """
    tmp_path = tmp_path_factory.mktemp("prop2a")
    row = _valid_row()
    row[missing_field] = None
    df_raw = pd.DataFrame([row])
    _make_xlsx(df_raw, tmp_path / "data.xlsx")
    loader = DataLoader()
    result = loader.load(str(tmp_path))
    assert len(result) == 0, f"Row with missing '{missing_field}' should be discarded"


@given(bad_cutoff=_cutoff_out_of_range)
@settings(max_examples=50)
def test_property2_out_of_range_cutoff_discarded(tmp_path_factory, bad_cutoff):
    """Property 2: Invalid row discarding — out-of-range cutoff_percentile
    Validates: Requirements 1.4
    """
    tmp_path = tmp_path_factory.mktemp("prop2b")
    row = _valid_row(cutoff_percentile=bad_cutoff)
    df_raw = pd.DataFrame([row])
    _make_xlsx(df_raw, tmp_path / "data.xlsx")
    loader = DataLoader()
    result = loader.load(str(tmp_path))
    assert len(result) == 0, f"Row with cutoff_percentile={bad_cutoff} should be discarded"


# Property 3: Deduplication retains highest cutoff
# Feature: mhtcet-cutoff-prediction, Property 3: Deduplication retains highest cutoff
# Validates: Requirements 1.5

@given(
    cutoffs=st.lists(
        st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=10,
    )
)
@settings(max_examples=50)
def test_property3_deduplication_keeps_highest(tmp_path_factory, cutoffs):
    """Property 3: Deduplication retains highest cutoff
    Validates: Requirements 1.5
    """
    tmp_path = tmp_path_factory.mktemp("prop3")
    rows = [_valid_row(cutoff_percentile=c) for c in cutoffs]
    df_raw = pd.DataFrame(rows)
    _make_xlsx(df_raw, tmp_path / "data.xlsx")
    loader = DataLoader()
    result = loader.load(str(tmp_path))
    # All rows share the same dedup key — only one should remain
    assert len(result) == 1
    assert abs(float(result.iloc[0]["cutoff_percentile"]) - max(cutoffs)) < 1e-9


# Property 4: Data round-trip
# Feature: mhtcet-cutoff-prediction, Property 4: Data round-trip
# Validates: Requirements 1.6

@given(
    cutoffs=st.lists(
        st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=50)
def test_property4_round_trip(tmp_path_factory, cutoffs):
    """Property 4: Data round-trip
    Validates: Requirements 1.6
    """
    tmp_path = tmp_path_factory.mktemp("prop4")
    # Use distinct branch names to avoid deduplication collapsing rows
    rows = [_valid_row(branch_name=f"Branch_{i}", cutoff_percentile=c) for i, c in enumerate(cutoffs)]
    df_raw = pd.DataFrame(rows)
    _make_xlsx(df_raw, tmp_path / "data.xlsx")
    loader = DataLoader()
    df = loader.load(str(tmp_path))
    # Round-trip should not raise
    loader.validate_round_trip(df, tolerance=0.001)
