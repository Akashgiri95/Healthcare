"""
tests/test_predictor.py — Integration tests for the full pipeline.

These tests require the LOINC CSV and trained model to be loaded.
They are slower (~30s startup) but verify end-to-end accuracy.

Run with:
    pytest tests/test_predictor.py -v                    # all tests
    pytest tests/test_predictor.py -v -m "not slow"     # skip slow tests
    pytest tests/test_predictor.py::TestAccuracy -v      # accuracy only

Set environment variable before running:
    export LOINC_CSV_PATH=/path/to/full_Loinc.csv
    export MODELS_DIR=./loinc_biobert_models
"""

import sys, os
sys.path.insert(0, "../backend")

import pytest
import pandas as pd


# ── Skip if CSV not configured ────────────────────────────────────────────────
def _csv_available() -> bool:
    import config
    path = config.LOINC_CSV_PATH
    return bool(path) and os.path.exists(path)

needs_csv = pytest.mark.skipif(
    not _csv_available(),
    reason="LOINC_CSV_PATH not set or file not found",
)


# ── Shared fixture: load predictor once per session ───────────────────────────
@pytest.fixture(scope="session")
def predictor():
    from data_loader import load_loinc
    from predictor import LOINCPredictor

    df, raw_df = load_loinc()
    p = LOINCPredictor()
    p.load(df, raw_df)
    return p


# ── Accuracy test cases ───────────────────────────────────────────────────────
CHEMISTRY_CASES = [
    ("718-7",  "Hemoglobin 11.4 gm/dl serum"),
    ("4548-4", "HbA1c 7.2 %"),
    ("718-7",  "Hemog|obin 11.4 gm/dl"),       # OCR noise
    ("2345-7", "Gl0cose 95 mg/dl"),             # OCR noise
    ("6690-2", "WBC 7500 cells/cumm blood"),
    ("2345-7", "Glucose 95 mg/dl serum"),
    ("2951-2", "Sodium 138 mmol/l"),
    ("3016-3", "TSH 2.4 mIU/mL"),
    ("1742-6", "ALT 35 U/L serum"),
    ("2160-0", "Creatinine 1.1 mg/dl"),
]

FREE_TEXT_CASES = [
    ("2345-7", "blood glucose quantitative serum"),
    ("718-7",  "hemoglobin in serum"),
    ("3016-3", "thyroid stimulating hormone serum"),
    ("1742-6", "liver function test ALT serum"),
    ("2951-2", "serum sodium level"),
]

CBC_CASES = [
    ("718-7",   "Hemoglobin 11.4 gm/dl"),
    ("4544-3",  "Packed Cell Volume (HCT) 32.6 %"),
    ("789-8",   "R.B.C. Count 3.64 mill/cmm"),
    ("787-2",   "Mean Cell Volume (MCV) 89.6 fl"),
    ("785-6",   "Mean Cell Hemoglobin (MCH) 31.3 pg"),
    ("786-4",   "Mean Cell Hb Conc (MCHC) 35.0 %"),
    ("788-0",   "RDW (CV) 13.4 %"),
    ("6690-2",  "Total WBC Count 9970 cells/cumm"),
    ("770-8",   "Neutrophils 67 %"),
    ("736-9",   "Lymphocytes 21 %"),
    ("713-8",   "Eosinophils 04 %"),
    ("5905-5",  "Monocytes 08 %"),
    ("706-2",   "Basophils 00 %"),
    ("751-8",   "Absolute Neutrophils Count 6680 /cumm"),
    ("731-0",   "Absolute Lymphocytes Count 2094 /cumm"),
    ("742-7",   "Absolute Monocytes Count 798 /cumm"),
    ("711-2",   "Absolute Eosinophils Count 399 /cumm"),
    ("777-3",   "Platelet Count 269000 cells/cumm"),
    ("32623-1", "M.P.V. 10.9 fl"),
    ("32207-3", "P.D.W. 16 %"),
]

DR_LAL_CASES = [
    ("718-7",   "Hemoglobin 11.86 g/dL"),
    ("4544-3",  "Packed Cell Volume 35.50 %"),
    ("789-8",   "RBC Count 3.79 mill/mm3"),
    ("787-2",   "MCV 93.60 fL"),
    ("785-6",   "MCH 31.30 pg"),
    ("786-4",   "MCHC 33.40 g/dL"),
    ("788-0",   "Red Cell Distribution Width 15.20 %"),
    ("6690-2",  "Total Leukocyte Count 7.60 thou/mm3"),
    ("770-8",   "Segmented Neutrophils 61.21 %"),
    ("736-9",   "Lymphocytes 26.06 %"),
    ("777-3",   "Platelet Count 296 thou/mm3"),
    ("32623-1", "Mean Platelet Volume 10.3 fL"),
    ("2345-7",  "Glucose Random 94.20 mg/dL"),
    ("4548-4",  "HbA1c 5.2 %"),
]


class TestAccuracy:
    """Accuracy benchmarks — require CSV + model."""

    @needs_csv
    def test_chemistry_accuracy(self, predictor):
        hits = 0
        for expected, query in CHEMISTRY_CASES:
            from row_parser import parse_lab_rows
            rows = parse_lab_rows(query + "  dummy_to_force_parse")
            # fallback: build a mock row
            from row_parser import LabRow
            row  = LabRow(query, "1", "", "", query)
            r    = predictor.predict_one(row)
            if r.loinc_code == expected:
                hits += 1
        pct = hits / len(CHEMISTRY_CASES) * 100
        assert pct >= 90, f"Chemistry accuracy {pct:.0f}% < 90% ({hits}/{len(CHEMISTRY_CASES)})"

    @needs_csv
    def test_cbc_accuracy(self, predictor):
        hits = 0
        for expected, query in CBC_CASES:
            from row_parser import parse_lab_rows
            rows = parse_lab_rows(query)
            if rows:
                r = predictor.predict_one(rows[0])
            else:
                from row_parser import LabRow
                r = predictor.predict_one(LabRow(query, "1", "", "", query))
            if r.loinc_code == expected:
                hits += 1
        pct = hits / len(CBC_CASES) * 100
        assert pct >= 85, f"CBC accuracy {pct:.0f}% < 85% ({hits}/{len(CBC_CASES)})"

    @needs_csv
    @pytest.mark.slow
    def test_full_report_cbc(self, predictor):
        """End-to-end test on a full CBC report text."""
        cbc_text = """Hemoglobin                    11.4    gm/dl    11-15
Packed Cell Volume (HCT)      32.6    %        36-46
R.B.C. Count                  3.64    mill/cmm 3.8-4.8
Mean Cell Volume (MCV)        89.6    fl       83-101
Mean Cell Hemoglobin (MCH)    31.3    pg       27-33
Total WBC Count               9970    cells/cumm  4000-11000
Neutrophils                   67      %        40-70
Platelet Count                269000  cells/cumm  150000-450000
M.P.V.                        10.9    fl       7.5-11.5"""

        result = predictor.predict_report(cbc_text, verbose=False)
        assert result.summary.total_tests == 9
        assert result.summary.mapped >= 8

        loinc_codes = {r.loinc_code for r in result.results}
        assert "718-7"   in loinc_codes, "Hemoglobin not predicted"
        assert "6690-2"  in loinc_codes, "WBC not predicted"
        assert "777-3"   in loinc_codes, "Platelets not predicted"

    @needs_csv
    @pytest.mark.slow
    def test_dr_lal_accuracy(self, predictor):
        hits = 0
        for expected, query in DR_LAL_CASES:
            from row_parser import parse_lab_rows, LabRow
            rows = parse_lab_rows(query)
            r    = predictor.predict_one(rows[0] if rows else LabRow(query,"1","","",query))
            if r.loinc_code == expected:
                hits += 1
        pct = hits / len(DR_LAL_CASES) * 100
        assert pct >= 80, f"Dr Lal accuracy {pct:.0f}% < 80% ({hits}/{len(DR_LAL_CASES)})"


class TestResultStructure:
    """Test that results have the correct structure regardless of accuracy."""

    @needs_csv
    def test_result_has_all_fields(self, predictor):
        from row_parser import LabRow
        row = LabRow("Hemoglobin", "11.4", "gm/dl", "11-15", "Hemoglobin  11.4  gm/dl  11-15")
        r   = predictor.predict_one(row)

        assert hasattr(r, "loinc_code")
        assert hasattr(r, "loinc_name")
        assert hasattr(r, "confidence")
        assert hasattr(r, "stage")
        assert hasattr(r, "axes")
        assert 0.0 <= r.confidence <= 1.0

    @needs_csv
    def test_axes_populated_on_exact_match(self, predictor):
        from row_parser import LabRow
        row = LabRow("Hemoglobin", "11.4", "gm/dl", "", "Hemoglobin 11.4 gm/dl")
        r   = predictor.predict_one(row)

        if "tier" in r.stage:   # exact match
            assert r.axes.component != ""
            assert r.axes.property  != ""

    @needs_csv
    def test_report_result_summary_consistent(self, predictor):
        text   = "Hemoglobin  11.4  gm/dl\nGlucose  95  mg/dl\nSodium  138  mmol/l"
        result = predictor.predict_report(text, verbose=False)
        total  = result.summary.total_tests
        mapped = result.summary.mapped

        assert total == 3
        assert mapped <= total
        assert (result.summary.high_confidence +
                result.summary.medium_confidence +
                result.summary.low_confidence) == total
