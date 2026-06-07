# LOINC Predictor — Claude Reference

## What this project does

FastAPI backend that maps clinical lab report data (PDFs, images, or raw text) to
LOINC codes. Input is a lab report; output is a structured JSON with each test row
mapped to its LOINC code, 6-axis detail, and confidence score.

## Running the server

```bash
# From project root
source venv/bin/activate
cd backend
uvicorn api:app --host 127.0.0.1 --port 8001
```

First boot builds the FAISS index (~2 min). Subsequent boots load from cache (~10 s).

## Architecture (5-tier cascade)

```
predict_one(row):
  Tier 0a → DERIVED_INDICES        (Mentzer Index, eAG → NO MATCH)
  Tier 0b → URINE_DIPSTICK_LOINC  (qualitative value + urine test name)
  Tier 0c → CONFIRMED_LOINC       (50+ hand-verified codes, bypass axis matching)
  Tier 1  → Component+Property+System  (axis-based exact lookup)
  Tier 2  → Component+Property         (relaxed)
  Tier 3  → Component only             (loose)
  Tier 4  → Hybrid BM25 + FAISS/RRF   (semantic + keyword fallback)
             └─ Unit-property validation filter on candidates
```

## Key files

| File | Role |
|------|------|
| `backend/loinc_lookup.py` | CONFIRMED_LOINC, COMPONENT_SYNONYMS, axis lookup tiers |
| `backend/biobert_engine.py` | BM25 index + FAISS dense search + RRF merge |
| `backend/ocr_engine.py` | PDF direct extraction, Tesseract OCR, block parser |
| `backend/predictor.py` | Master pipeline: any input → ReportResult |
| `backend/row_parser.py` | Extracts test rows from horizontal/vertical/qualitative text |
| `backend/data_loader.py` | Loads LOINC CSV, applies 7-step filter, builds feature strings |
| `backend/config.py` | All paths and constants — single source of truth |

## Adding a new test mapping

1. Add the abbreviation to `COMPONENT_SYNONYMS` in `loinc_lookup.py`:
   ```python
   "new abbrev": "canonical loinc component name",
   ```
2. Verify the code in the LOINC CSV, then add to `CONFIRMED_LOINC`:
   ```python
   "canonical loinc component name": "LOINC-NUM",
   ```
3. Add the expected default system to `COMPONENT_DEFAULT_SYSTEM`.

## PDF extraction notes

- Digital PDFs: PyMuPDF block parsing (no OCR). Each block follows
  `[name, ref_range, unit, value]` in variable order.
- Scanned PDFs / images: Tesseract OCR (set `OCR_ENGINE=tesseract` in `.env`).
- EasyOCR is disabled — segfaults on macOS with PyTorch ≥ 2.x.

## Model notes

- Fine-tuned BioBERT (`sbert_finetuned/`) gives best results.
- If missing, falls back to `all-MiniLM-L6-v2` (still works, slightly lower accuracy
  on rare tests — compensated by CONFIRMED_LOINC covering common tests).
- FAISS/BM25 cache rebuilds automatically if `loinc_embeddings.npy` is absent.

## Environment

- Python 3.13, macOS (Apple Silicon)
- Tesseract 5.5.2 installed via Homebrew
- LOINC CSV: not in repo (licensed from loinc.org)
- Model weights: not in repo (regenerate or request from team)

## Tests

```bash
pytest tests/ -v                          # all fast tests
pytest tests/ -v -m "not slow"           # skip model-loading tests
pytest tests/test_loinc_lookup.py -v     # synonym/lookup unit tests only
```
