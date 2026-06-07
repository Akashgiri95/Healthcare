# LOINC Predictor

Map clinical lab reports to LOINC codes automatically.

Upload a PDF, image, or paste raw text — the system extracts every test row and returns structured LOINC mappings with 6-axis detail, confidence scores, and patient metadata.

## Features

- **Digital PDF support** — extracts text directly from Dr Lal, LPL, SRL, Metropolis, and similar lab PDFs without OCR
- **Image / scanned PDF** — Tesseract OCR fallback
- **Hybrid retrieval** — BM25 (keyword) + FAISS (semantic) merged with Reciprocal Rank Fusion
- **5-tier lookup cascade** — rule-based tiers handle >90% of tests at 0.92 confidence; semantic search handles novel queries
- **Indian lab context** — 200+ abbreviations (SGPT, SGOT, TLC, PCV, HbA1c, GGT, TSH, HBsAg, etc.)
- **Clinical validation** — derived indices (Mentzer, eAG) correctly return NO MATCH; urine bilirubin and serum bilirubin map to separate codes

## Project Structure

```
loinc_predictor/
├── backend/
│   ├── api.py             # FastAPI REST server
│   ├── predictor.py       # Master pipeline: any input → structured JSON
│   ├── loinc_lookup.py    # CONFIRMED_LOINC, synonyms, 4-tier axis lookup
│   ├── biobert_engine.py  # Hybrid BM25 + FAISS + RRF retrieval
│   ├── ocr_engine.py      # PDF block extraction + Tesseract OCR
│   ├── row_parser.py      # Lab row extraction (horizontal/vertical/qualitative)
│   ├── data_loader.py     # LOINC CSV loading, filtering, feature strings
│   ├── text_cleaner.py    # OCR noise removal
│   ├── config.py          # All paths and constants
│   └── debug_ocr.py       # CLI tool: show OCR output + parsed rows
├── frontend/
│   └── public/index.html  # Single-file web UI
├── tests/
│   ├── conftest.py
│   ├── test_loinc_lookup.py
│   ├── test_row_parser.py
│   ├── test_text_cleaner.py
│   └── test_predictor.py
├── docs/
│   └── API.md
├── loinc_biobert_models/  # ← not in git; auto-generated on first boot
├── .env.example
├── requirements.txt
├── start.sh
└── CLAUDE.md
```

## Quick Start

### Prerequisites

```bash
# macOS
brew install tesseract python@3.13

# Ubuntu
sudo apt install tesseract-ocr python3.13
```

### 1. Clone and set up

```bash
git clone https://github.com/<your-org>/loinc_predictor.git
cd loinc_predictor
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example backend/.env
# Edit backend/.env — set LOINC_CSV_PATH and MODELS_DIR
```

Download the LOINC CSV from [loinc.org/downloads](https://loinc.org/downloads/) (free registration required). Point `LOINC_CSV_PATH` at it.

### 3. Start

```bash
./start.sh
# Opens http://127.0.0.1:5500/index.html in browser
# API at http://127.0.0.1:8001  |  Docs at http://127.0.0.1:8001/docs
```

On first boot the system builds the FAISS index and BM25 index from the LOINC CSV (~2 min). Subsequent boots load from cache (~10 s).

### 4. Run tests

```bash
pytest tests/ -v
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predict/text` | Predict from raw text body |
| `POST` | `/predict/file` | Predict from uploaded PDF or image |
| `POST` | `/predict/refine` | Re-query by LOINC axis values |
| `GET`  | `/loinc/{code}` | Look up a LOINC code |
| `GET`  | `/loinc/axes/values` | Valid values for each axis (for dropdowns) |
| `GET`  | `/health` | Server health + readiness |

Full reference: [`docs/API.md`](docs/API.md)

### Example

```bash
curl -X POST http://127.0.0.1:8001/predict/text \
  -H "Content-Type: application/json" \
  -d '{"text": "SGPT 45 U/L\nHbA1c 7.2 %\nHemoglobin 11.4 g/dL"}'
```

```json
{
  "report_type": "Diabetes Panel",
  "results": [
    {
      "test_name": "SGPT",
      "loinc_code": "1742-6",
      "loinc_name": "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
      "confidence": 0.92,
      "stage": "exact/tier0_confirmed"
    }
  ]
}
```

## Architecture

```
Input (PDF / image / text)
         │
         ▼
  [PDF Block Extractor]    ← PyMuPDF direct text (digital PDFs)
  [Tesseract OCR]         ← fallback for scanned documents
         │
         ▼
  [Row Parser]            ← horizontal / vertical / qualitative modes
         │
         ▼
  For each test row:
  ┌──────────────────────────────────────────────────┐
  │  Tier 0a  DERIVED_INDICES      → NO MATCH        │
  │  Tier 0b  URINE_DIPSTICK_LOINC → urine code      │
  │  Tier 0c  CONFIRMED_LOINC      → direct code     │
  │  Tier 1   Component+Prop+Sys   → axis match      │
  │  Tier 2   Component+Property   → relaxed match   │
  │  Tier 3   Component only       → loose match     │
  │  Tier 4   BM25 + FAISS / RRF  → semantic search │
  │           + unit-property validation filter      │
  └──────────────────────────────────────────────────┘
         │
         ▼
  Structured JSON: loinc_code, loinc_name, 6 axes, confidence, stage
```

**Why hybrid retrieval?**  
BM25 handles exact abbreviation/keyword matches in LOINC's `RELATEDNAMES2` field (SGPT, HbA1c, WBC). Dense FAISS handles semantic paraphrase. RRF combines both without score normalisation.

## Fine-tuning (optional)

For maximum accuracy, place a SentenceTransformer model fine-tuned on LOINC clinical text at `loinc_biobert_models/sbert_finetuned/`. Without it the system falls back to `all-MiniLM-L6-v2`, which still achieves high accuracy for common tests due to the comprehensive `CONFIRMED_LOINC` dictionary.

## License

MIT. LOINC content is copyright © Regenstrief Institute and is used under the LOINC License (free for clinical and research use — see [loinc.org/license](https://loinc.org/license)).
