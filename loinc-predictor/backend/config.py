"""
config.py — Single source of truth for all paths, constants, and model config.

All other modules import from here. Change paths/settings once, everywhere updates.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# ── Paths ─────────────────────────────────────────────────────────────────────
LOINC_CSV_PATH: str  = os.getenv("LOINC_CSV_PATH", "")
MODELS_DIR:     Path = Path(os.getenv("MODELS_DIR", "loinc_biobert_models"))

FINETUNE_DIR:   Path = MODELS_DIR / "sbert_finetuned"
EMBED_CACHE:    Path = MODELS_DIR / "loinc_embeddings.npy"
META_CACHE:     Path = MODELS_DIR / "loinc_meta.json"
FAISS_CACHE:    Path = MODELS_DIR / "loinc_faiss.index"
CLEANED_CSV:    Path = MODELS_DIR / "loinc_filtered_for_verification.csv"

# ── Model ─────────────────────────────────────────────────────────────────────
BASE_MODEL_NAME: str = "dmis-lab/biobert-base-cased-v1.2"
FALLBACK_MODEL:  str = "all-MiniLM-L6-v2"   # used if BioBERT not fine-tuned yet
EMBED_DIM:       int = 768
FAISS_TOP_K:     int = 20                     # candidates to retrieve before re-rank

# ── LOINC Filtering ───────────────────────────────────────────────────────────
KEEP_COLUMNS = [
    "LOINC_NUM", "COMPONENT", "PROPERTY", "TIME_ASPCT",
    "SYSTEM", "SCALE_TYP", "METHOD_TYP", "LONG_COMMON_NAME", "CLASSTYPE",
    "SHORTNAME", "RELATEDNAMES2", "EXAMPLE_UNITS",
]

KEEP_SCALE_TYP = {"Qn", "Ord", "Nom", "OrdQn", "SemiQn"}

KEEP_PROPERTY = {
    "MCnc", "SCnc", "NCnc", "ACnc", "CCnc",
    "MFr",  "NFr",  "VFr",  "RelFr", "MoFr",
    "Ratio","MRto", "SRto", "CRto",
    "NCnt", "MCnt", "SCnt",
    "Vcnt", "EntMass",
    "PrThr","Prid",  "Susc", "Arb",
    "Vol",  "Mass",  "Len",  "Temp","Pres","Score",
    # Urine qualitative
    "Naric","Aper",  "SRatX","Type","Find",
}

KEEP_TIME_ASPCT = {"Pt", "24H", "2H", "12H", "8H", "Rand", "Spot"}

DROP_SYSTEMS = {
    "XXX", "Unk sub", "Isolate", "RBC^Donor", "RBC^BPU",
    "Bld.dot", "BldCo", "BldCoV", "BldCoA", "BldCV", "BldCRRT", "BldCoMV",
    "Ser/Plas^Donor", "Bld^BPU", "Bld^Donor",
    "Feed", "Food", "Hair", "Nail", "Envir", "Air", "Water",
    "Plant", "Eggylk", "Egg", "Cheese", "Mlk.raw",
}

DROP_METHODS = {
    "Probe.amp.tar", "Non-probe.amp.tar", "Probe", "Probe.amp.sig",
    "Probe.mag capture", "Genotyping", "Sequencing", "FISH", "Chromo", "LHR",
}

MIN_COMPONENT_OCCURRENCES: int = 2   # drop singletons

# ── OCR ───────────────────────────────────────────────────────────────────────
OCR_ENGINE:          str   = os.getenv("OCR_ENGINE", "auto")  # auto|tesseract|easyocr
OCR_TARGET_WIDTH:    int   = 1800    # upscale images to this width for better OCR
OCR_CONTRAST:        float = 3.0
OCR_BINARISE_THRESH: int   = 140    # Tesseract binarisation threshold
OCR_Y_TOLERANCE:     int   = 15     # EasyOCR row-grouping tolerance (pixels)
PDF_DPI:             int   = 200

TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "")   # override binary path

# ── Confidence thresholds ─────────────────────────────────────────────────────
CONF_TIER0:  float = 0.92
CONF_TIER1:  float = 0.85
CONF_TIER2:  float = 0.70
CONF_TIER3:  float = 0.50
CONF_HIGH:   float = 0.80
CONF_MEDIUM: float = 0.60

# ── API ───────────────────────────────────────────────────────────────────────
API_HOST:        str = os.getenv("API_HOST",   "0.0.0.0")
API_PORT:        int = int(os.getenv("API_PORT", "8000"))
CORS_ORIGINS:    str = os.getenv("CORS_ORIGINS", "*")
LOG_LEVEL:       str = os.getenv("LOG_LEVEL",   "INFO")

# ── Validated at import ───────────────────────────────────────────────────────
def validate() -> None:
    """Call this at startup to catch missing configuration early."""
    errors = []
    if not LOINC_CSV_PATH:
        errors.append("LOINC_CSV_PATH is not set. Add it to .env")
    elif not Path(LOINC_CSV_PATH).exists():
        errors.append(f"LOINC_CSV_PATH does not exist: {LOINC_CSV_PATH}")
    if not MODELS_DIR.exists():
        errors.append(f"MODELS_DIR does not exist: {MODELS_DIR}")
    if errors:
        raise EnvironmentError("Configuration errors:\n  " + "\n  ".join(errors))
