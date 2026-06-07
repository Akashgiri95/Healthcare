"""
loinc_lookup.py — Exact LOINC lookup: synonym expansion, property mapping, 4-tier search.

Tier 0: CONFIRMED_LOINC  — direct code for stable CBC/coag codes
         Bypasses PROPERTY matching; codes stable since 1995
Tier 1: Component + Property + System  (strict)
Tier 2: Component + Property           (relaxed — no system filter)
Tier 3: Component only                 (loose)
"""

import re
import logging

import pandas as pd

from text_cleaner import clean_text, clean_unit
import config

log = logging.getLogger(__name__)


# ── Synonym maps ──────────────────────────────────────────────────────────────

COMPONENT_SYNONYMS: dict[str, str] = {
    # ── CBC abbreviations ──────────────────────────────────────────────────────
    "hb": "hemoglobin",    "hgb": "hemoglobin",    "haemoglobin": "hemoglobin",
    "hemogobin": "hemoglobin",
    "wbc": "leukocytes",   "tbc": "leukocytes",
    "rbc": "erythrocytes", "plt": "platelets",      "plts": "platelets",
    "hct": "hematocrit",   "packed cell volume": "hematocrit", "pcv": "hematocrit",
    "r.b.c. count": "erythrocytes", "rbc count": "erythrocytes",
    "red blood cell count": "erythrocytes",
    "mcv": "mcv",          "mean cell volume": "mcv",
    "mean corpuscular volume": "mcv",
    "mch": "mch",          "mean cell hemoglobin": "mch",
    "mean corpuscular hemoglobin": "mch",
    "mchc": "mchc",        "mean cell hb conc": "mchc",
    "rdw": "erythrocyte distribution width",
    "rdw-cv": "erythrocyte distribution width",
    "rdw-sd": "erythrocyte distribution width",
    "red cell distribution width": "erythrocyte distribution width",
    "total wbc count": "leukocytes", "total wbc": "leukocytes",
    "white blood cell count": "leukocytes",
    "total leukocyte count": "leukocytes", "tlc": "leukocytes",
    "dlc": "neutrophils",
    "segmented neutrophils": "neutrophils", "seg neutrophils": "neutrophils",
    "polymorphs": "neutrophils",
    "neutrophils": "neutrophils",   "lymphocytes": "lymphocytes",
    "eosinophils": "eosinophils",   "monocytes": "monocytes",
    "basophils": "basophils",       "bands": "band neutrophils",
    "absolute neutrophils count": "neutrophils",
    "absolute neutrophil count": "neutrophils",
    "absolute lymphocytes count": "lymphocytes",
    "absolute lymphocyte count": "lymphocytes",
    "absolute monocytes count": "monocytes",
    "absolute eosinophils count": "eosinophils",
    "absolute basophils count": "basophils",
    "platelet count": "platelets",  "total platelet count": "platelets",
    "thrombocyte count": "platelets",
    "mpv": "platelet mean volume",  "m.p.v.": "platelet mean volume",
    "mean platelet volume": "platelet mean volume",
    "pdw": "platelet distribution width", "p.d.w.": "platelet distribution width",
    "pct": "plateletcrit",          "p.c.t.": "plateletcrit",
    "nlr": "neutrophil lymphocyte ratio",
    "esr": "erythrocyte sedimentation rate",
    "cbc": "leukocytes",            "fbc": "leukocytes",
    "haemogram": "leukocytes",      "hemogram": "leukocytes",
    # ── Liver Function Tests (LFT) ─────────────────────────────────────────────
    "alt": "alanine aminotransferase",
    "sgpt": "alanine aminotransferase",
    "s.g.p.t.": "alanine aminotransferase",
    "s.g.p.t": "alanine aminotransferase",
    "alanine transaminase": "alanine aminotransferase",
    "ast": "aspartate aminotransferase",
    "sgot": "aspartate aminotransferase",
    "s.g.o.t.": "aspartate aminotransferase",
    "s.g.o.t": "aspartate aminotransferase",
    "aspartate transaminase": "aspartate aminotransferase",
    "alp": "alkaline phosphatase",
    "alk phos": "alkaline phosphatase",
    "alkphos": "alkaline phosphatase",
    "alk. phos.": "alkaline phosphatase",
    "ggt": "gamma glutamyl transferase",
    "ggtp": "gamma glutamyl transferase",
    "gamma gt": "gamma glutamyl transferase",
    "gamma-gt": "gamma glutamyl transferase",
    "ldh": "lactate dehydrogenase",
    "lactic dehydrogenase": "lactate dehydrogenase",
    "tbil": "bilirubin total",
    "t. bil": "bilirubin total",
    "t.bil": "bilirubin total",
    "total bilirubin": "bilirubin total",
    "serum bilirubin": "bilirubin total",
    "s. bilirubin": "bilirubin total",
    "dbil": "bilirubin direct",
    "d. bil": "bilirubin direct",
    "d.bil": "bilirubin direct",
    "direct bilirubin": "bilirubin direct",
    "conjugated bilirubin": "bilirubin direct",
    "ibil": "bilirubin indirect",
    "i. bil": "bilirubin indirect",
    "i.bil": "bilirubin indirect",
    "indirect bilirubin": "bilirubin indirect",
    "unconjugated bilirubin": "bilirubin indirect",
    "tp": "protein total",
    "t. protein": "protein total",
    "total protein": "protein total",
    "serum protein": "protein total",
    "s. protein": "protein total",
    "alb": "albumin",
    "serum albumin": "albumin",
    "s. albumin": "albumin",
    "glob": "globulin",
    "serum globulin": "globulin",
    "a/g ratio": "albumin/globulin ratio",
    "a/g": "albumin/globulin ratio",
    "liver function test alt": "alanine aminotransferase",
    "liver enzymes": "alanine aminotransferase",
    # ── Renal Function Tests (KFT/RFT) ────────────────────────────────────────
    "cr": "creatinine",          "cre": "creatinine",
    "s. creatinine": "creatinine",
    "serum creatinine": "creatinine",
    "cretinine": "creatinine",
    "bun": "urea nitrogen",
    "s. urea": "urea nitrogen",
    "blood urea": "urea nitrogen",
    "blood urea nitrogen": "urea nitrogen",
    "urea": "urea nitrogen",
    "kidney function": "creatinine", "renal function": "creatinine",
    "kft": "creatinine",         "rft": "creatinine",
    "uric acid": "urate",
    "s. uric acid": "urate",
    "serum uric acid": "urate",
    "egfr": "glomerular filtration rate",
    "gfr": "glomerular filtration rate",
    "estimated gfr": "glomerular filtration rate",
    "calcium": "calcium",
    "ca": "calcium",
    "s. calcium": "calcium",
    "serum calcium": "calcium",
    "phosphorus": "phosphate",
    "s. phosphorus": "phosphate",
    "inorganic phosphate": "phosphate",
    # ── Electrolytes ──────────────────────────────────────────────────────────
    "na": "sodium",
    "s. sodium": "sodium",
    "serum sodium": "sodium",
    "sodim": "sodium",
    "k": "potassium",
    "s. potassium": "potassium",
    "serum potassium": "potassium",
    "cl": "chloride",
    "s. chloride": "chloride",
    "serum chloride": "chloride",
    "co2": "carbon dioxide",
    "bicarbonate": "bicarbonate",
    "hco3": "bicarbonate",
    # ── Diabetes Panel ────────────────────────────────────────────────────────
    "glu": "glucose",           "gluc": "glucose",
    "blood sugar": "glucose",   "blood glucose": "glucose",
    "fasting glucose": "glucose", "random glucose": "glucose",
    "fasting blood sugar": "glucose",
    "fbs": "glucose",           "rbs": "glucose",  "pbs": "glucose",
    "pp blood sugar": "glucose",
    "glucose random": "glucose", "glucose fasting": "glucose",
    "glucose r": "glucose",     "glucose f": "glucose",
    "glucose random (r)": "glucose",
    "hba1c": "hemoglobin a1c",  "a1c": "hemoglobin a1c",
    "hgba1c": "hemoglobin a1c", "glycated hemoglobin": "hemoglobin a1c",
    "haemoglobin a1c": "hemoglobin a1c",
    "glycosylated hemoglobin": "hemoglobin a1c",
    # ── Lipid Profile ─────────────────────────────────────────────────────────
    "chol": "cholesterol",      "tc": "cholesterol",
    "t. chol": "cholesterol",   "total cholesterol": "cholesterol",
    "serum cholesterol": "cholesterol",
    "lipid profile": "cholesterol", "lipid panel": "cholesterol",
    "trig": "triglyceride",     "tg": "triglyceride",
    "trigs": "triglyceride",    "triglycerides": "triglyceride",
    "serum triglycerides": "triglyceride",
    "hdl": "cholesterol.hdl",   "hdl-c": "cholesterol.hdl",
    "hdl cholesterol": "cholesterol.hdl",
    "ldl": "cholesterol.ldl",   "ldl-c": "cholesterol.ldl",
    "ldl cholesterol": "cholesterol.ldl",
    "vldl": "cholesterol.vldl", "vldl-c": "cholesterol.vldl",
    "vldl cholesterol": "cholesterol.vldl",
    # ── Thyroid Function Tests ────────────────────────────────────────────────
    "tsh": "thyrotropin",
    "thyroid stimulating hormone": "thyrotropin",
    "thyroid stimulating": "thyrotropin",
    "thyroid function": "thyrotropin",
    "t3": "triiodothyronine",   "total t3": "triiodothyronine",
    "serum t3": "triiodothyronine",
    "t4": "thyroxine",          "total t4": "thyroxine",
    "serum t4": "thyroxine",    "thyroxine total": "thyroxine",
    "ft3": "triiodothyronine free",
    "free t3": "triiodothyronine free",
    "f.t3": "triiodothyronine free",
    "ft4": "thyroxine free",
    "free t4": "thyroxine free",
    "f.t4": "thyroxine free",
    "thyroxine free": "thyroxine free",
    # ── Iron Studies ──────────────────────────────────────────────────────────
    "fe": "iron",               "s. iron": "iron",
    "serum iron": "iron",       "serum fe": "iron",
    "ferr": "ferritin",         "serum ferritin": "ferritin",
    "tibc": "transferrin",
    "total iron binding capacity": "transferrin",
    # ── Vitamins ─────────────────────────────────────────────────────────────
    "25ohd": "25-hydroxyvitamin d",
    "vitamin d": "25-hydroxyvitamin d",
    "vit d": "25-hydroxyvitamin d",
    "25-oh vit d": "25-hydroxyvitamin d",
    "25-oh vitamin d": "25-hydroxyvitamin d",
    "b12": "cobalamin",
    "vitamin b12": "cobalamin",
    "vit b12": "cobalamin",
    "cobal": "cobalamin",
    "folic acid": "folate",     "folate serum": "folate",
    "vit b9": "folate",
    # ── Cardiac Markers ───────────────────────────────────────────────────────
    "ck": "creatine kinase",    "cpk": "creatine kinase",
    "ck total": "creatine kinase",
    "cpk total": "creatine kinase",
    "ck-mb": "creatine kinase.mb",
    "cpk-mb": "creatine kinase.mb",
    "ck mb": "creatine kinase.mb",
    "troponin i": "troponin i cardiac",
    "troponin t": "troponin t cardiac",
    "trop i": "troponin i cardiac",
    "trop t": "troponin t cardiac",
    "hs troponin": "troponin i cardiac",
    "hs-troponin": "troponin i cardiac",
    "bnp": "natriuretic peptide b",
    "pro-bnp": "natriuretic peptide b.prohormone",
    "nt-probnp": "natriuretic peptide b.prohormone",
    # ── Coagulation ───────────────────────────────────────────────────────────
    "inr": "inr",
    "pt": "prothrombin time",
    "aptt": "aptt",
    "ptt": "aptt",
    "fibrinogen": "fibrinogen",
    "d-dimer": "fibrin d-dimer",
    "d dimer": "fibrin d-dimer",
    # ── Inflammatory markers ──────────────────────────────────────────────────
    "crp": "c reactive protein",
    "c-rp": "c reactive protein",
    "hs-crp": "c reactive protein",
    "hscrp": "c reactive protein",
    "high sensitivity crp": "c reactive protein",
    # ── Hormones ─────────────────────────────────────────────────────────────
    "fsh": "follitropin",
    "follicle stimulating hormone": "follitropin",
    "lh": "lutropin",
    "luteinizing hormone": "lutropin",
    "e2": "estradiol",
    "oestradiol": "estradiol",
    "prog": "progesterone",
    "testo": "testosterone",
    "prolactin": "prolactin",
    "prl": "prolactin",
    "beta hcg": "choriogonadotropin",
    "b-hcg": "choriogonadotropin",
    "beta-hcg": "choriogonadotropin",
    "pregnancy test": "choriogonadotropin",
    "hcg": "choriogonadotropin",
    "psa": "prostate specific ag",
    "total psa": "prostate specific ag",
    "tpsa": "prostate specific ag",
    "prostate specific antigen": "prostate specific ag",
    "dhea-s": "dehydroepiandrosterone sulfate",
    "dheas": "dehydroepiandrosterone sulfate",
    "cortisol": "cortisol",
    "insulin": "insulin",
    "c-peptide": "c peptide",
    "igf-1": "insulin-like growth factor i",
    "igf1": "insulin-like growth factor i",
    # ── Infection markers ─────────────────────────────────────────────────────
    "hbsag": "hepatitis b surface ag",
    "hbs ag": "hepatitis b surface ag",
    "hepatitis b surface antigen": "hepatitis b surface ag",
    "hepatitis b ag": "hepatitis b surface ag",
    "anti-hcv": "hepatitis c virus ab",
    "hcv ab": "hepatitis c virus ab",
    "hcv antibody": "hepatitis c virus ab",
    "hepatitis c ab": "hepatitis c virus ab",
    "hiv": "hiv 1+2 ag+ab",
    "hiv ag ab": "hiv 1+2 ag+ab",
    "hiv combo": "hiv 1+2 ag+ab",
    "widal": "widal test",
    "mp smear": "malaria parasite",
    "malaria": "malaria parasite",
    "dengue ns1": "dengue virus ns1 ag",
    "dengue antigen": "dengue virus ns1 ag",
    "dengue igg": "dengue virus ab igg",
    "dengue igm": "dengue virus ab igm",
    "vdrl": "reagin ab",
    "rpr": "reagin ab",
    "mantoux": "tuberculin",
    "aso": "antistreptolysin o",
    "aslo": "antistreptolysin o",
    "rf": "rheumatoid factor",
    "rheumatoid factor": "rheumatoid factor",
    "ana": "antinuclear ab",
    # ── Serology / Antenatal ──────────────────────────────────────────────────
    "torch": "toxoplasma ab",
    "rubella igg": "rubella virus ab igg",
    "rubella igm": "rubella virus ab igm",
    "cmv igg": "cytomegalovirus ab igg",
    "cmv igm": "cytomegalovirus ab igm",
    "afp": "alpha-fetoprotein",
    "double marker": "choriogonadotropin",
    "triple marker": "alpha-fetoprotein",
    # ── OCR correction variants ───────────────────────────────────────────────
    "glocose": "glucose", "sodim": "sodium", "cretinine": "creatinine",
    "haemoglobin a1c": "hemoglobin a1c",
    # ── Urine routine examination ─────────────────────────────────────────────
    "colour": "color of urine",   "color": "color of urine",
    "urine colour": "color of urine", "urine color": "color of urine",
    "proteins": "protein",        "urine protein": "protein",
    "urine glucose": "glucose urine", "sugar urine": "glucose urine",
    "urine ketones": "ketones urine", "ketone bodies": "ketones urine",
    "urine bilirubin": "bilirubin urine",
    "urobilinogen": "urobilinogen urine",
    "blood urine": "hemoglobin urine", "occult blood urine": "hemoglobin urine",
    "leucocyte esterase": "leukocyte esterase",
    "leukocytes urine": "leukocyte esterase",
    "nitrites": "nitrite urine",  "urine nitrite": "nitrite urine",
    "r.b.c.": "erythrocytes urine", "rbc urine": "erythrocytes urine",
    "pus cells": "leukocytes urine sediment",
    "wbc urine": "leukocytes urine sediment",
    "epithelial cells": "epithelial cells urine",
    "casts": "casts urine",       "crystals": "crystals urine",
    # eAG is derived from HbA1c — no measured test, no LOINC synonym
}

# Direct code lookup — bypasses axis-based matching for stable, well-known codes.
# All codes verified against the LOINC database (June 2026).
CONFIRMED_LOINC: dict[str, str] = {
    # ── CBC / Haematology ─────────────────────────────────────────────────────
    "mcv"                                     : "787-2",
    "mch"                                     : "785-6",
    "mchc"                                    : "786-4",
    "hematocrit"                              : "4544-3",
    "erythrocyte distribution width"          : "788-0",
    "platelet mean volume"                    : "32623-1",
    "platelet distribution width"             : "32207-3",
    "plateletcrit"                            : "51637-7",
    "mean cell volume"                        : "787-2",
    "mean corpuscular volume"                 : "787-2",
    "mean cell hemoglobin"                    : "785-6",
    "mean corpuscular hemoglobin"             : "785-6",
    "mean cell hb conc"                       : "786-4",
    "mean corpuscular hemoglobin concentration": "786-4",
    "red cell distribution width"             : "788-0",
    "mean platelet volume"                    : "32623-1",
    "erythrocyte sedimentation rate"          : "4537-7",
    # ── Coagulation ───────────────────────────────────────────────────────────
    "inr"                                     : "6301-6",
    "prothrombin time"                        : "5902-2",
    "aptt"                                    : "3173-2",
    # ── Liver Function Tests ──────────────────────────────────────────────────
    "alanine aminotransferase"                : "1742-6",   # ALT / SGPT
    "aspartate aminotransferase"              : "1920-8",   # AST / SGOT
    "alkaline phosphatase"                    : "6768-6",   # ALP
    "gamma glutamyl transferase"              : "2324-2",   # GGT / GGTP
    "lactate dehydrogenase"                   : "14804-9",  # LDH
    "bilirubin total"                         : "1975-2",   # T. Bilirubin (serum)
    "bilirubin direct"                        : "1968-7",   # D. Bilirubin (serum)
    "bilirubin indirect"                      : "1971-1",   # I. Bilirubin (serum)
    "albumin"                                 : "1751-7",   # Albumin (serum)
    "protein total"                           : "2885-2",   # Total Protein (serum)
    # ── Renal Function Tests ──────────────────────────────────────────────────
    "creatinine"                              : "2160-0",   # Serum Creatinine
    "urea nitrogen"                           : "3094-0",   # BUN
    "urate"                                   : "3084-1",   # Uric Acid
    "calcium"                                 : "17861-6",  # Serum Calcium
    "phosphate"                               : "2777-1",   # Phosphate (serum)
    # ── Electrolytes ─────────────────────────────────────────────────────────
    "sodium"                                  : "2951-2",
    "potassium"                               : "2823-3",
    "chloride"                                : "2075-0",
    # ── Glucose / Diabetes ───────────────────────────────────────────────────
    "hemoglobin a1c"                          : "4548-4",   # HbA1c
    # ── Lipid Profile ─────────────────────────────────────────────────────────
    "cholesterol"                             : "2093-3",   # Total Cholesterol
    "triglyceride"                            : "2571-8",   # Triglycerides
    "cholesterol.hdl"                         : "2085-9",   # HDL-C
    "cholesterol.ldl"                         : "13457-7",  # LDL-C (calculated)
    # ── Thyroid ───────────────────────────────────────────────────────────────
    "thyrotropin"                             : "3016-3",   # TSH
    "thyroxine"                               : "3026-2",   # Total T4
    "thyroxine free"                          : "3024-7",   # Free T4
    "triiodothyronine free"                   : "14928-6",  # Free T3 (molar, most common)
    # ── Iron Studies ─────────────────────────────────────────────────────────
    "iron"                                    : "2498-4",   # Serum Iron
    "ferritin"                                : "2276-4",   # Ferritin
    # ── Vitamins ─────────────────────────────────────────────────────────────
    "25-hydroxyvitamin d"                     : "62292-8",  # Vit D (D2+D3 total)
    "cobalamin"                               : "2132-9",   # Vitamin B12
    "folate"                                  : "2284-8",   # Folate (serum)
    # ── Inflammatory / Infection ─────────────────────────────────────────────
    "c reactive protein"                      : "1988-5",   # CRP
    "hepatitis b surface ag"                  : "5196-1",   # HBsAg
    "hepatitis c virus ab"                    : "13955-0",  # Anti-HCV
    # ── Hormones ─────────────────────────────────────────────────────────────
    "choriogonadotropin"                      : "19080-1",  # Beta-hCG
    "estradiol"                               : "2243-4",   # Estradiol (E2)
    "progesterone"                            : "2839-9",   # Progesterone
    "lutropin"                                : "10501-5",  # LH
    "prolactin"                               : "2842-3",   # Prolactin
    "testosterone"                            : "2986-8",   # Testosterone (total)
    "prostate specific ag"                    : "2857-1",   # PSA
    # ── Cardiac ───────────────────────────────────────────────────────────────
    "troponin i cardiac"                      : "10839-9",  # Troponin I
    "troponin t cardiac"                      : "6597-9",   # Troponin T
    "natriuretic peptide b"                   : "30934-4",  # BNP
    # ── Urine Routine (dipstick + microscopy) ─────────────────────────────────
    "color of urine"                          : "5778-6",   # Colour of Urine
    "specific gravity"                        : "2965-2",   # Specific gravity of Urine
    "specific gravity of urine"               : "2965-2",
    "ph"                                      : "2756-5",   # pH of Urine
    "ph of urine"                             : "2756-5",
    "protein"                                 : "20454-5",  # Protein [Presence] in Urine by Test strip
    "glucose urine"                           : "25428-4",  # Glucose [Presence] in Urine by Test strip
    "ketones urine"                           : "2514-8",   # Ketones [Presence] in Urine by Test strip
    "bilirubin urine"                         : "1977-8",   # Bilirubin.total [Presence] in Urine ✓ (not serum)
    "urobilinogen urine"                      : "5818-0",   # Urobilinogen [Presence] in Urine by Test strip ✓
    "hemoglobin urine"                        : "5794-3",   # Hemoglobin [Presence] in Urine by Test strip
    "leukocyte esterase"                      : "5799-2",   # Leukocyte esterase [Presence] in Urine by Test strip
    "nitrite urine"                           : "5802-4",   # Nitrite [Presence] in Urine by Test strip
    "erythrocytes urine"                      : "13945-1",  # Erythrocytes [#/area] in Urine sediment by Microscopy
    "leukocytes urine sediment"               : "5821-4",   # Leukocytes [#/area] in Urine sediment by Microscopy
    "epithelial cells urine"                  : "105114-3", # Epithelial cells [Presence] in Urine sediment ✓
    "casts urine"                             : "101248-3", # Pathologic casts [Presence] in Urine sediment
}

# Urine dipstick qualitative tests — used when value is qualitative (Negative/Positive/Normal)
# These tests are ambiguous by name alone (glucose, bilirubin exist in serum too) but
# are always urine dipstick when the result is qualitative.
URINE_DIPSTICK_LOINC: dict[str, str] = {
    "ph"                  : "2756-5",    # pH of Urine — always urine in routine lab panels
    "ph of urine"         : "2756-5",
    "glucose"             : "25428-4",   # Glucose [Presence] in Urine by Test strip
    "ketones"             : "2514-8",    # Ketones [Presence] in Urine by Test strip
    "bilirubin"           : "1977-8",    # Bilirubin.total [Presence] in Urine ✓ (1975-2 = serum)
    "blood"               : "5794-3",    # Hemoglobin [Presence] in Urine by Test strip
    "nitrite"             : "5802-4",    # Nitrite [Presence] in Urine by Test strip
    "urobilinogen"        : "5818-0",    # Urobilinogen [Presence] in Urine by Test strip ✓ (12269-7 = 24h)
    "leukocyte esterase"  : "5799-2",    # Leukocyte esterase [Presence] in Urine by Test strip
    "protein"             : "20454-5",   # Protein [Presence] in Urine by Test strip
    "proteins"            : "20454-5",
    "colour"              : "5778-6",    # Color of Urine
    "color"               : "5778-6",
    "specific gravity"    : "2965-2",    # Specific gravity of Urine
}

# Derived / calculated indices with no standard LOINC code.
# Returns no_match rather than a wrong code.
DERIVED_INDICES: frozenset = frozenset({
    "mentzer index",
    "estimated average glucose",
    "eag",
    "sokolow-lyon index",
    "corrected calcium",
    "anion gap",
    "bmi",
    "others",           # catch-all microscopy line, no standard LOINC
    "other",
})

COMPONENT_DEFAULT_SYSTEM: dict[str, str] = {
    # Blood
    "hemoglobin": "Bld",              "hemoglobin a1c": "Bld",
    "leukocytes": "Bld",              "erythrocytes": "Bld",
    "platelets": "Bld",               "hematocrit": "Bld",
    "mcv": "Bld",                     "mch": "Bld",
    "mchc": "Bld",                    "mean cell volume": "Bld",
    "mean cell hemoglobin": "Bld",    "mean cell hb conc": "Bld",
    "erythrocyte distribution width": "Bld",
    "neutrophils": "Bld",             "lymphocytes": "Bld",
    "eosinophils": "Bld",             "monocytes": "Bld",
    "basophils": "Bld",               "platelet mean volume": "Bld",
    "platelet distribution width": "Bld", "plateletcrit": "Bld",
    "erythrocyte sedimentation rate": "Bld",
    # Serum / Plasma
    "glucose": "Ser/Plas",            "sodium": "Ser/Plas",
    "potassium": "Ser/Plas",          "chloride": "Ser/Plas",
    "urea nitrogen": "Ser/Plas",      "creatinine": "Ser/Plas",
    "calcium": "Ser/Plas",            "phosphate": "Ser/Plas",
    "alanine aminotransferase": "Ser/Plas",
    "aspartate aminotransferase": "Ser/Plas",
    "alkaline phosphatase": "Ser/Plas",
    "gamma glutamyl transferase": "Ser/Plas",
    "lactate dehydrogenase": "Ser/Plas",
    "bilirubin total": "Ser/Plas",    "bilirubin direct": "Ser/Plas",
    "bilirubin indirect": "Ser/Plas",
    "albumin": "Ser/Plas",            "protein total": "Ser/Plas",
    "urate": "Ser/Plas",
    "thyrotropin": "Ser/Plas",        "thyroxine": "Ser/Plas",
    "thyroxine free": "Ser/Plas",     "triiodothyronine free": "Ser/Plas",
    "cholesterol": "Ser/Plas",        "cholesterol.hdl": "Ser/Plas",
    "cholesterol.ldl": "Ser/Plas",    "triglyceride": "Ser/Plas",
    "iron": "Ser/Plas",               "ferritin": "Ser/Plas",
    "transferrin": "Ser/Plas",
    "c reactive protein": "Ser/Plas",
    "cobalamin": "Ser/Plas",          "25-hydroxyvitamin d": "Ser/Plas",
    "folate": "Ser/Plas",
    "inr": "Ser/Plas",                "prothrombin time": "Ser/Plas",
    "creatine kinase": "Ser/Plas",    "creatine kinase.mb": "Ser/Plas",
    "troponin i cardiac": "Ser/Plas", "troponin t cardiac": "Ser/Plas",
    "choriogonadotropin": "Ser/Plas", "estradiol": "Ser/Plas",
    "progesterone": "Ser/Plas",       "lutropin": "Ser/Plas",
    "follitropin": "Ser/Plas",        "prolactin": "Ser/Plas",
    "testosterone": "Ser/Plas",       "prostate specific ag": "Ser/Plas",
    "hepatitis b surface ag": "Ser/Plas",
    "hepatitis c virus ab": "Ser/Plas",
}

UNIT_TO_PROPERTY: dict[str, str] = {
    # Mass concentration
    "g/dl": "MCnc",  "mg/dl": "MCnc", "gm/dl": "MCnc",
    "g/l":  "MCnc",  "mg/l":  "MCnc",
    "ng/ml":"MCnc",  "ug/ml": "MCnc", "ug/dl": "MCnc",
    # Substance concentration
    "mmol/l":"SCnc", "umol/l":"SCnc", "nmol/l":"SCnc", "pmol/l":"SCnc",
    # Arbitrary concentration (immunoassay hormones)
    "miu/ml":"ACnc", "miu/l": "ACnc", "uiu/ml":"ACnc", "iu/l":  "ACnc",
    # Number concentration (blood cells — NCnc not NCnt)
    "cells/ul":"NCnc","cells/mm3":"NCnc","cells/cumm":"NCnc",
    "k/ul":"NCnc",   "/ul":"NCnc",    "/cumm":"NCnc", "mill/cmm":"NCnc",
    "thou/mm3":"NCnc","thou/ul":"NCnc","mill/mm3":"NCnc",
    "10*3/ul":"NCnc","10*6/ul":"NCnc","10^3/ul":"NCnc","10^6/ul":"NCnc",
    # Catalytic concentration (enzymes)
    "u/l":"CCnc",    "ku/l":"CCnc",
    # Entitic volume (MCV, MPV)
    "fl":"Vcnt",
    # Entitic mass (MCH)
    "pg":"EntMass",
    # Ratio / time
    "ratio":"Ratio", "s":"Time",    "sec":"Time",
    # Timed excretion
    "mg/24h":"MRto", "mmol/24h":"SRto",
}

_PARSE_RE = re.compile(
    r"([a-z][a-z0-9\s\.\-]*?)\s+([\d.]+)\s*([a-z%/][a-z0-9/%*.]*)"
)


# ── Functions ─────────────────────────────────────────────────────────────────

def expand_component(name: str) -> str:
    """Expand abbreviations/synonyms to canonical LOINC component name."""
    name = name.strip()
    if name in COMPONENT_SYNONYMS:
        return COMPONENT_SYNONYMS[name]
    for abbr, full in COMPONENT_SYNONYMS.items():
        if re.search(r"\b" + re.escape(abbr) + r"\b", name):
            return full
    return name


def detect_property(unit: str, component: str = "") -> str | None:
    """
    Infer LOINC PROPERTY from unit + component.

    Priority:
      1. Component override (HbA1c→MFr, Hematocrit→VFr, MCHC→MCnc)
      2. % routing by cell biology
      3. Unit table lookup
      4. Keyword fallback (positive/negative → PrThr)
    """
    norm = clean_unit(unit)
    comp = component.lower()

    COMP_OVERRIDE = {
        "hemoglobin a1c": "MFr",
        "hematocrit":     "VFr",
        "mchc":           "MCnc",
        "reticulocytes":  "NFr",
    }
    for k, v in COMP_OVERRIDE.items():
        if k in comp:
            return v

    DIFF_CELLS = {
        "neutrophils", "lymphocytes", "eosinophils",
        "monocytes", "basophils", "granulocytes", "bands", "blasts",
    }
    if "%" in norm:
        if any(c in comp for c in DIFF_CELLS):
            return "NFr"
        if "hematocrit" in comp:
            return "VFr"
        return "Ratio"

    for u, prop in UNIT_TO_PROPERTY.items():
        if u == norm or norm.startswith(u):
            return prop

    if any(x in norm for x in ["positive", "negative", "detected", "reactive"]):
        return "PrThr"

    return None


def detect_system(text: str) -> str:
    """Detect specimen type from keywords. Urine has priority."""
    t = text.lower()
    if any(k in t for k in ["urine", "urinalysis", "urine r/e", "routine r/e",
                              "specific gravity", "pus cell", "wbc/hpf",
                              "rbc/hpf", "epi cell"]):
        return "Urine"
    if any(k in t for k in ["plasma", "serum"]):
        return "Ser/Plas"
    if any(k in t for k in ["blood", "edta", "whole blood"]):
        return "Bld"
    return "Ser"


def get_best_system(component: str, text_system: str) -> str:
    """Biology override: component-based default beats text keyword."""
    if text_system and "urine" in text_system.lower():
        return "Urine"
    return COMPONENT_DEFAULT_SYSTEM.get(component.lower(), text_system)


def parse_query(text: str) -> dict | None:
    """
    Extract LOINC axes from a raw query string.

    Returns
    -------
    dict with keys: component, property, system, unit, value
    or None if no numeric value found.
    """
    cleaned = clean_text(text)
    m = _PARSE_RE.search(cleaned)
    if not m:
        return None
    raw  = m.group(1).strip()
    unit = m.group(3).strip()
    comp = expand_component(raw)
    return {
        "component": comp,
        "property":  detect_property(unit, comp),
        "system":    detect_system(cleaned),
        "unit":      unit,
        "value":     float(m.group(2)),
    }


def rank_results(result: pd.DataFrame) -> pd.DataFrame:
    """
    Sort LOINC candidates by clinical frequency.

    COMMON_TEST_RANK: 1 = most commonly ordered, 0 = unranked → sort last.
    Tiebreaks: no METHOD_TYP (generic first), shorter SYSTEM (Bld before BldV).
    """
    result = result.copy()
    rk = pd.to_numeric(result["COMMON_TEST_RANK"], errors="coerce").fillna(0)
    result["_rank"] = rk.apply(lambda r: 999999 if r == 0 else r)
    result["_nom"]  = (result["METHOD_TYP"] == "").astype(int)
    result["_slen"] = result["SYSTEM"].str.len()
    return (
        result
        .sort_values(["_rank", "_nom", "_slen"], ascending=[True, False, True])
        .drop(columns=["_rank", "_nom", "_slen"])
    )


def exact_lookup(
    parsed: dict | None,
    df: pd.DataFrame,
    raw_loinc_df: pd.DataFrame,
) -> tuple[pd.DataFrame, str]:
    """
    4-tier exact match against the LOINC dataframe.

    Tier 0: CONFIRMED_LOINC direct lookup (uses raw_loinc_df to survive filters)
    Tier 1: Component + Property + System
    Tier 2: Component + Property
    Tier 3: Component only
    """
    if parsed is None:
        return pd.DataFrame(), "no_parse"

    comp = parsed["component"]
    prop = parsed.get("property")
    sys  = get_best_system(comp, parsed.get("system", ""))

    cols = [
        "LOINC_NUM", "COMPONENT", "PROPERTY", "SYSTEM",
        "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME", "COMMON_TEST_RANK",
    ]
    valid_cols = [c for c in cols if c in df.columns]

    # ── Tier 0: confirmed direct lookup ───────────────────────────────────────
    if comp.lower() in CONFIRMED_LOINC:
        code = CONFIRMED_LOINC[comp.lower()]
        # Use raw_loinc_df — code may be filtered out of df in some LOINC versions
        valid_raw = [c for c in cols if c in raw_loinc_df.columns]
        r = raw_loinc_df[raw_loinc_df["LOINC_NUM"] == code][valid_raw].copy()
        if len(r):
            return rank_results(r), "tier0_confirmed"

    # ── Tiers 1–3: axis-based matching ───────────────────────────────────────
    base = df["COMPONENT"].str.lower().str.startswith(comp.lower())

    for tier, use_prop, use_sys in [
        ("tier1_strict",  True,  True),
        ("tier2_relaxed", True,  False),
        ("tier3_loose",   False, False),
    ]:
        mask = base.copy()
        if use_prop and prop:
            mask = mask & (df["PROPERTY"] == prop)
        if use_sys and sys:
            mask = mask & df["SYSTEM"].str.contains(
                re.escape(sys), case=False, na=False
            )
        r = df[mask][valid_cols].copy()
        if len(r):
            return rank_results(r), tier

    return pd.DataFrame(), "no_match"


def refine_by_axes(
    df: pd.DataFrame,
    raw_loinc_df: pd.DataFrame,
    component:  str | None = None,
    property_:  str | None = None,
    time_aspct: str | None = None,
    system:     str | None = None,
    scale_typ:  str | None = None,
    method_typ: str | None = None,
    top_k:      int = 10,
) -> pd.DataFrame:
    """
    Filter LOINC codes by whichever axes the user provides.

    Any axis left as None / empty string is ignored (wildcard).
    Searches both the filtered df and raw_loinc_df so no code is missed.
    Returns up to top_k ranked results.
    """
    cols = [
        "LOINC_NUM", "COMPONENT", "PROPERTY", "TIME_ASPCT",
        "SYSTEM", "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME", "COMMON_TEST_RANK",
    ]

    results = []
    for source in (df, raw_loinc_df):
        valid_cols = [c for c in cols if c in source.columns]
        mask = pd.Series([True] * len(source), index=source.index)

        if component and component.strip():
            mask &= source["COMPONENT"].str.lower().str.contains(
                re.escape(component.strip().lower()), na=False
            )
        if property_ and property_.strip():
            mask &= source["PROPERTY"].str.lower() == property_.strip().lower()
        if time_aspct and time_aspct.strip():
            mask &= source["TIME_ASPCT"].str.lower() == time_aspct.strip().lower()
        if system and system.strip():
            mask &= source["SYSTEM"].str.lower().str.contains(
                re.escape(system.strip().lower()), na=False
            )
        if scale_typ and scale_typ.strip():
            mask &= source["SCALE_TYP"].str.lower() == scale_typ.strip().lower()
        if method_typ and method_typ.strip():
            mask &= source["METHOD_TYP"].str.lower().str.contains(
                re.escape(method_typ.strip().lower()), na=False
            )

        results.append(source[mask][valid_cols])

    combined = pd.concat(results).drop_duplicates(subset=["LOINC_NUM"])
    return rank_results(combined).head(top_k) if len(combined) else pd.DataFrame(columns=cols)
