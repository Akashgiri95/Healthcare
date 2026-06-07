"""
tests/test_row_parser.py — Unit tests for row_parser.py

Tests both horizontal and vertical format parsing with real-world examples.

Run with:  pytest tests/test_row_parser.py -v
"""

import sys
sys.path.insert(0, "../backend")

import pytest
from row_parser import parse_lab_rows, _detect_format


# ── Format detection ──────────────────────────────────────────────────────────

class TestDetectFormat:

    def test_horizontal_cbc(self):
        text = "Hemoglobin  11.4  gm/dl  11-15\nWBC  9970  cells/cumm"
        assert _detect_format(text) == "horizontal"

    def test_vertical_dr_lal(self):
        text = "Proteins\n(Tetra Bromophenol)\nNegative\nGlucose\n(Glucose oxidase)\nNegative"
        assert _detect_format(text) == "vertical"

    def test_empty_text(self):
        assert _detect_format("") == "horizontal"


# ── Horizontal parser ─────────────────────────────────────────────────────────

CBC_HORIZONTAL = """Hemoglobin                    11.4    gm/dl    11-15
Packed Cell Volume (HCT)      32.6    %        36-46
R.B.C. Count                  3.64    mill/cmm 3.8-4.8
Mean Cell Volume (MCV)        89.6    fl       83-101
Mean Cell Hemoglobin (MCH)    31.3    pg       27-33
Mean Cell Hb Conc (MCHC)      35.0    %        32-38
RDW (CV)                      13.4    %        11.60-14
Total WBC Count               9970    cells/cumm  4000-11000
Neutrophils                   67      %        40-70
Lymphocytes                   21      %        20-40
Eosinophils                   04      %        01-06
Monocytes                     08      %        02-10
Basophils                     00      %        0.1-02
Absolute Neutrophils Count    6680    /cumm    2000-7000
Absolute Lymphocytes Count    2094    /cumm    1000-4000
Absolute Monocytes Count      798     /cumm    200-1000
Absolute Eosinophils Count    399     /cumm    20-500
Platelet Count                269000  cells/cumm  150000-450000
M.P.V.                        10.9    fl       7.5-11.5
P.D.W.                        16      %        10-17.9
Patient Name: Kirti Sangal
Reference Range"""

class TestHorizontalParser:

    def setup_method(self):
        self.rows = parse_lab_rows(CBC_HORIZONTAL)
        self.names = [r.test_name for r in self.rows]

    def test_parses_all_20_rows(self):
        assert len(self.rows) == 20

    def test_hemoglobin_value_and_unit(self):
        hb = next(r for r in self.rows if "hemoglobin" in r.test_name.lower())
        assert hb.value == "11.4"
        assert hb.unit  == "gm/dl"
        assert hb.ref_range == "11-15"

    def test_mpv_with_dots(self):
        mpv = next(r for r in self.rows if "M.P.V" in r.test_name)
        assert mpv.value == "10.9"
        assert mpv.unit  == "fl"

    def test_pdw_percentage(self):
        pdw = next(r for r in self.rows if "P.D.W" in r.test_name)
        assert pdw.value == "16"
        assert pdw.unit  == "%"

    def test_patient_name_not_parsed(self):
        assert not any("kirti" in r.test_name.lower() for r in self.rows)

    def test_reference_range_header_not_parsed(self):
        assert not any(r.test_name.lower() == "reference range" for r in self.rows)

    def test_mcv_with_brackets(self):
        mcv = next(r for r in self.rows if "Mean Cell Volume" in r.test_name)
        assert mcv.value == "89.6"
        assert mcv.unit  == "fl"

    def test_absolute_count_slash_unit(self):
        neut_abs = next(r for r in self.rows if "absolute neutrophils" in r.test_name.lower())
        assert neut_abs.value == "6680"
        assert neut_abs.unit  == "/cumm"


# ── Vertical parser ───────────────────────────────────────────────────────────

URINE_VERTICAL = """URINE EXAMINATION ROUTINE (ROUTINE R/E)
Gross Examination
Specific Gravity 1.010 1.001 - 1.030
(Pre-treated polymeric Ion Exchange resin)
pH 7 5.0 - 8.0
(Double Indicator)
Proteins
(Tetra Bromophenol)
Negative Negative
Glucose
(Glucose oxidase peroxidase chromogen reaction)
Negative Negative
Ketones
(Sodium Nitroprusside)
Negative Negative
Blood
(Tetramethyl benzidine)
Negative Negative
Leucocyte Esterase
(Carboxylic acid ester diazonium salt)
Negative Negative
Microscopy
R.B.C.
(Light microscopy)
Negative 0-2 RBC/hpf
Pus Cells
(Light microscopy)
3-4 WBC/HPF 0-5 WBC / hpf
Casts
(Light microscopy)
None seen None seen/Lpf"""

class TestVerticalParser:

    def setup_method(self):
        self.rows = parse_lab_rows(URINE_VERTICAL)
        self.names = [r.test_name for r in self.rows]

    def test_detects_vertical_format(self):
        assert _detect_format(URINE_VERTICAL) == "vertical"

    def test_specific_gravity_inline(self):
        sg = next((r for r in self.rows if "gravity" in r.test_name.lower()), None)
        assert sg is not None, "Specific Gravity not found"
        assert sg.value == "1.010"

    def test_ph_inline(self):
        ph = next((r for r in self.rows if r.test_name.lower() == "ph"), None)
        assert ph is not None, "pH not found"
        assert ph.value == "7"

    def test_proteins_negative(self):
        prot = next((r for r in self.rows if r.test_name.lower() == "proteins"), None)
        assert prot is not None
        assert "negative" in prot.value.lower()

    def test_pus_cells_range_value(self):
        pus = next((r for r in self.rows if "pus" in r.test_name.lower()), None)
        assert pus is not None
        assert "3" in pus.value or "3-4" in pus.value

    def test_casts_none_seen(self):
        casts = next((r for r in self.rows if "cast" in r.test_name.lower()), None)
        assert casts is not None
        assert "none" in casts.value.lower() or "seen" in casts.value.lower()

    def test_section_headers_not_parsed(self):
        bad = ["gross examination", "microscopy", "urine examination"]
        for b in bad:
            assert not any(b in r.test_name.lower() for r in self.rows), \
                f"Section header '{b}' should not be parsed as a test row"


# ── Edge cases ────────────────────────────────────────────────────────────────

class TestEdgeCases:

    def test_empty_text_returns_empty_list(self):
        assert parse_lab_rows("") == []

    def test_header_only_returns_empty(self):
        assert parse_lab_rows("Patient Name: John\nAge: 30\nReference Range") == []

    def test_query_string_builds_correctly(self):
        rows = parse_lab_rows("Hemoglobin  11.4  gm/dl  11-15")
        assert len(rows) == 1
        assert rows[0].query_string() == "Hemoglobin 11.4 gm/dl"
