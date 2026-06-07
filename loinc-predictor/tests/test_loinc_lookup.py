"""
tests/test_loinc_lookup.py — Unit tests for loinc_lookup.py

Tests synonym expansion, property detection, and the parse_query function.
Does NOT require the LOINC CSV (no DataFrame needed for these units).

Run with:  pytest tests/test_loinc_lookup.py -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from loinc_lookup import (
    expand_component,
    detect_property,
    detect_system,
    parse_query,
    CONFIRMED_LOINC,
    DERIVED_INDICES,
    URINE_DIPSTICK_LOINC,
)


# ── Synonym expansion ─────────────────────────────────────────────────────────

class TestExpandComponent:

    def test_hb_to_hemoglobin(self):
        assert expand_component("hb") == "hemoglobin"

    def test_wbc_to_leukocytes(self):
        assert expand_component("wbc") == "leukocytes"

    def test_tsh_to_thyrotropin(self):
        assert expand_component("tsh") == "thyrotropin"

    def test_alt_to_full_name(self):
        assert expand_component("alt") == "alanine aminotransferase"

    def test_hba1c_variants(self):
        assert expand_component("hba1c") == "hemoglobin a1c"
        assert expand_component("a1c")   == "hemoglobin a1c"

    def test_mcv(self):
        assert expand_component("mcv") == "mcv"

    def test_mean_cell_volume(self):
        assert expand_component("mean cell volume") == "mcv"

    def test_segmented_neutrophils(self):
        assert expand_component("segmented neutrophils") == "neutrophils"

    def test_packed_cell_volume(self):
        assert expand_component("packed cell volume") == "hematocrit"

    def test_unknown_passthrough(self):
        assert expand_component("platelet aggregation") == "platelet aggregation"

    def test_ocr_correction(self):
        assert expand_component("hemogobin") == "hemoglobin"
        assert expand_component("glocose")   == "glucose"


# ── Property detection ────────────────────────────────────────────────────────

class TestDetectProperty:

    # Mass concentration
    def test_g_dl_mcnc(self):
        assert detect_property("g/dl") == "MCnc"

    def test_mg_dl_mcnc(self):
        assert detect_property("mg/dl") == "MCnc"

    def test_gm_dl_mcnc(self):
        assert detect_property("gm/dl") == "MCnc"

    # Substance concentration
    def test_mmol_l_scnc(self):
        assert detect_property("mmol/l") == "SCnc"

    # Arbitrary concentration (hormones — NOT SCnc or CCnc)
    def test_miu_ml_acnc(self):
        assert detect_property("miu/ml") == "ACnc"

    def test_iu_l_acnc(self):
        assert detect_property("iu/l") == "ACnc"

    # Catalytic (enzymes)
    def test_u_l_ccnc(self):
        assert detect_property("u/l") == "CCnc"

    # Number concentration (blood cells — NCnc not NCnt)
    def test_cells_ul_ncnc(self):
        assert detect_property("cells/ul") == "NCnc"

    def test_cumm_ncnc(self):
        assert detect_property("/cumm") == "NCnc"

    def test_mill_cmm_ncnc(self):
        assert detect_property("mill/cmm") == "NCnc"

    def test_thou_mm3_ncnc(self):
        assert detect_property("thou/mm3") == "NCnc"

    # Entitic volume / mass (CBC indices)
    def test_fl_vcnt(self):
        assert detect_property("fl") == "Vcnt"

    def test_pg_entmass(self):
        assert detect_property("pg") == "EntMass"

    # % routing — component-dependent
    def test_percent_hba1c_mfr(self):
        assert detect_property("%", "hemoglobin a1c") == "MFr"

    def test_percent_hematocrit_vfr(self):
        assert detect_property("%", "hematocrit") == "VFr"

    def test_percent_neutrophils_nfr(self):
        assert detect_property("%", "neutrophils") == "NFr"

    def test_percent_lymphocytes_nfr(self):
        assert detect_property("%", "lymphocytes") == "NFr"

    def test_percent_rdw_ratio(self):
        assert detect_property("%", "erythrocyte distribution width") == "Ratio"

    def test_percent_mchc_mcnc_override(self):
        assert detect_property("%", "mchc") == "MCnc"

    # Qualitative fallback
    def test_negative_pthr(self):
        assert detect_property("negative") == "PrThr"

    def test_unknown_returns_none(self):
        assert detect_property("xyz_unknown") is None


# ── System detection ──────────────────────────────────────────────────────────

class TestDetectSystem:

    def test_urine_keywords(self):
        assert detect_system("urine routine examination") == "Urine"
        assert detect_system("specific gravity 1.010")    == "Urine"
        assert detect_system("pus cells 3-4 wbc/hpf")    == "Urine"

    def test_serum_keywords(self):
        assert detect_system("hemoglobin in serum") == "Ser/Plas"

    def test_blood_keywords(self):
        assert detect_system("wbc in blood edta") == "Bld"

    def test_default_ser(self):
        assert detect_system("glucose 95") == "Ser"


# ── parse_query ───────────────────────────────────────────────────────────────

class TestParseQuery:

    def test_hemoglobin_gm_dl(self):
        p = parse_query("Hemoglobin 11.4 gm/dl serum")
        assert p is not None
        assert p["component"] == "hemoglobin"
        assert p["property"]  == "MCnc"
        assert p["value"]     == 11.4

    def test_hba1c_percent(self):
        p = parse_query("HbA1c 7.2 %")
        assert p is not None
        assert p["component"] == "hemoglobin a1c"
        assert p["property"]  == "MFr"

    def test_tsh_miu_ml(self):
        p = parse_query("TSH 2.4 mIU/mL")
        assert p is not None
        assert p["component"] == "thyrotropin"
        assert p["property"]  == "ACnc"

    def test_wbc_cells_cumm(self):
        p = parse_query("WBC 7500 cells/cumm blood")
        assert p is not None
        assert p["component"] == "leukocytes"
        assert p["property"]  == "NCnc"

    def test_mcv_fl(self):
        p = parse_query("Mean Cell Volume (MCV) 89.6 fl")
        assert p is not None
        assert p["component"] == "mcv"
        assert p["property"]  == "Vcnt"

    def test_mch_pg(self):
        p = parse_query("Mean Cell Hemoglobin (MCH) 31.3 pg")
        assert p is not None
        assert p["component"] == "mch"
        assert p["property"]  == "EntMass"

    def test_neutrophils_percent(self):
        p = parse_query("Neutrophils 67 %")
        assert p is not None
        assert p["component"] == "neutrophils"
        assert p["property"]  == "NFr"

    def test_abs_neutrophils_slash_cumm(self):
        p = parse_query("Absolute Neutrophils Count 6680 /cumm")
        assert p is not None
        assert p["component"] == "neutrophils"
        assert p["property"]  == "NCnc"

    def test_no_number_returns_none(self):
        assert parse_query("thyroid stimulating hormone serum") is None

    def test_ocr_noise(self):
        p1 = parse_query("Hemog|obin 11.4 gm/dl")
        p2 = parse_query("Gl0cose 95 mg/dl")
        assert p1 is not None and p1["component"] == "hemoglobin"
        assert p2 is not None and p2["component"] == "glucose"


# ── CONFIRMED_LOINC ───────────────────────────────────────────────────────────

class TestConfirmedLoinc:

    # CBC
    def test_mcv_stable_code(self):
        assert CONFIRMED_LOINC["mcv"] == "787-2"

    def test_mch_stable_code(self):
        assert CONFIRMED_LOINC["mch"] == "785-6"

    def test_mean_cell_volume_long_form(self):
        assert CONFIRMED_LOINC["mean cell volume"] == "787-2"

    def test_hematocrit_stable_code(self):
        assert CONFIRMED_LOINC["hematocrit"] == "4544-3"

    def test_rdw_stable_code(self):
        assert CONFIRMED_LOINC["erythrocyte distribution width"] == "788-0"

    # LFT
    def test_alt_sgpt(self):
        assert CONFIRMED_LOINC["alanine aminotransferase"] == "1742-6"

    def test_ast_sgot(self):
        assert CONFIRMED_LOINC["aspartate aminotransferase"] == "1920-8"

    def test_ggt(self):
        assert CONFIRMED_LOINC["gamma glutamyl transferase"] == "2324-2"

    def test_bilirubin_total_serum_not_urine(self):
        # 1975-2 is SERUM total bilirubin
        assert CONFIRMED_LOINC["bilirubin total"] == "1975-2"

    # Urine codes — must NOT map to serum equivalents
    def test_bilirubin_urine_code_is_not_serum(self):
        # Serum = 1975-2; Urine = 1977-8
        assert CONFIRMED_LOINC["bilirubin urine"] == "1977-8"
        assert CONFIRMED_LOINC["bilirubin urine"] != "1975-2"

    def test_urobilinogen_is_dipstick_not_24h(self):
        # 12269-7 = 24-hour urine; 5818-0 = dipstick (spot urine)
        assert CONFIRMED_LOINC["urobilinogen urine"] == "5818-0"
        assert CONFIRMED_LOINC["urobilinogen urine"] != "12269-7"

    def test_urine_specific_gravity(self):
        assert CONFIRMED_LOINC["specific gravity"] == "2965-2"

    # Thyroid
    def test_tsh(self):
        assert CONFIRMED_LOINC["thyrotropin"] == "3016-3"

    # Vitamins
    def test_vitamin_d(self):
        assert CONFIRMED_LOINC["25-hydroxyvitamin d"] == "62292-8"

    def test_vitamin_b12(self):
        assert CONFIRMED_LOINC["cobalamin"] == "2132-9"


# ── DERIVED_INDICES ───────────────────────────────────────────────────────────

class TestDerivedIndices:

    def test_mentzer_index_no_loinc(self):
        assert "mentzer index" in DERIVED_INDICES

    def test_eag_no_loinc(self):
        assert "estimated average glucose" in DERIVED_INDICES
        assert "eag" in DERIVED_INDICES


# ── URINE_DIPSTICK_LOINC ──────────────────────────────────────────────────────

class TestUrineDipstick:

    def test_bilirubin_urine_correct(self):
        assert URINE_DIPSTICK_LOINC["bilirubin"] == "1977-8"

    def test_urobilinogen_dipstick(self):
        assert URINE_DIPSTICK_LOINC["urobilinogen"] == "5818-0"

    def test_glucose_urine(self):
        assert URINE_DIPSTICK_LOINC["glucose"] == "25428-4"

    def test_ketones_urine(self):
        assert URINE_DIPSTICK_LOINC["ketones"] == "2514-8"


# ── Indian lab synonym expansion ──────────────────────────────────────────────

class TestIndianLabSynonyms:

    def test_sgpt_to_alt(self):
        assert expand_component("sgpt") == "alanine aminotransferase"

    def test_sgot_to_ast(self):
        assert expand_component("sgot") == "aspartate aminotransferase"

    def test_alk_phos(self):
        assert expand_component("alk phos") == "alkaline phosphatase"

    def test_alp(self):
        assert expand_component("alp") == "alkaline phosphatase"

    def test_ggt(self):
        assert expand_component("ggt") == "gamma glutamyl transferase"

    def test_ldh(self):
        assert expand_component("ldh") == "lactate dehydrogenase"

    def test_s_creatinine(self):
        assert expand_component("s. creatinine") == "creatinine"

    def test_uric_acid(self):
        assert expand_component("uric acid") == "urate"

    def test_serum_uric_acid(self):
        assert expand_component("serum uric acid") == "urate"

    def test_t_bil(self):
        assert expand_component("t. bil") == "bilirubin total"

    def test_d_bil(self):
        assert expand_component("d. bil") == "bilirubin direct"

    def test_i_bil(self):
        assert expand_component("i. bil") == "bilirubin indirect"

    def test_total_protein(self):
        assert expand_component("total protein") == "protein total"

    def test_triglycerides_plural(self):
        assert expand_component("triglycerides") == "triglyceride"

    def test_tg(self):
        assert expand_component("tg") == "triglyceride"

    def test_hdl_c(self):
        assert expand_component("hdl-c") == "cholesterol.hdl"

    def test_ldl_c(self):
        assert expand_component("ldl-c") == "cholesterol.ldl"

    def test_hbsag(self):
        assert expand_component("hbsag") == "hepatitis b surface ag"

    def test_vit_d(self):
        assert expand_component("vit d") == "25-hydroxyvitamin d"

    def test_vit_b12(self):
        assert expand_component("vit b12") == "cobalamin"

    def test_beta_hcg(self):
        assert expand_component("beta hcg") == "choriogonadotropin"
