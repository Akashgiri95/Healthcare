"""
tests/test_text_cleaner.py — Unit tests for text_cleaner.py

Run with:  pytest tests/test_text_cleaner.py -v
"""

import sys
sys.path.insert(0, "../backend")

from text_cleaner import clean_text, clean_unit


class TestCleanText:

    def test_lowercase(self):
        assert clean_text("Hemoglobin") == "hemoglobin"

    def test_ocr_pipe_removal(self):
        assert clean_text("Hemog|obin 11.4 gm/dl") == "hemogobin 11.4 gm/dl"

    def test_ocr_zero_to_o(self):
        assert clean_text("Gl0cose 95 mg/dl") == "glocose 95 mg/dl"

    def test_square_bracket_removal(self):
        assert clean_text("Hemoglobin [Mass/volume]") == "hemoglobin"

    def test_round_bracket_removal(self):
        assert clean_text("Mean Cell Volume (MCV) 89.6 fL") == "mean cell volume 89.6 fl"

    def test_caret_removal(self):
        assert clean_text("Glucose^post meal") == "glucose post meal"

    def test_multiple_spaces_collapsed(self):
        assert clean_text("Hemoglobin   11.4") == "hemoglobin 11.4"

    def test_empty_string(self):
        assert clean_text("") == ""
        assert clean_text("   ") == ""

    def test_non_string(self):
        assert clean_text(None) == ""
        assert clean_text(123) == ""

    def test_preserves_medical_chars(self):
        result = clean_text("gm/dL %")
        assert "%" in result
        assert "/" in result

    def test_hba1c(self):
        assert clean_text("HbA1c 7.2 %") == "hba1c 7.2 %"

    def test_tsh(self):
        assert clean_text("TSH 2.4 mIU/mL") == "tsh 2.4 miu/ml"


class TestCleanUnit:

    def test_gm_dl_normalised(self):
        assert clean_unit("gm/dL") == "g/dl"

    def test_cells_cumm_normalised(self):
        assert clean_unit("cells/cumm") == "cells/mm3"

    def test_lowercase(self):
        assert clean_unit("G/DL") == "g/dl"

    def test_passthrough(self):
        assert clean_unit("mmol/L") == "mmol/l"
