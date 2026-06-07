# Healthcare Monorepo — Claude Reference

## Projects

| Directory | Stack | Status |
|-----------|-------|--------|
| `his-system/` | FastAPI + Next.js 15 | Active development |
| `loinc-predictor/` | FastAPI + BM25/FAISS | Production-ready |

## his-system

Full HIS for Tier 1 Indian hospitals. See `his-system/CLAUDE.md` and
`his-system/CLAUDE.local.md` (full architecture) for details.

- **Run backend**: `cd his-system/backend && uvicorn app.main:app --reload --port 8000`
- **Run frontend**: `cd his-system/frontend && npm run dev`
- All demo users: password `his@1234`
- Frontend-first approach: HISContext is the shared state layer

## loinc-predictor

LOINC code prediction from lab reports. See `loinc-predictor/CLAUDE.md`.

- **Run**: `cd loinc-predictor && ./start.sh`
- First boot builds FAISS + BM25 index (~2 min), then cached
- Set `OCR_ENGINE=tesseract` in `loinc-predictor/backend/.env`

## Common conventions

- Python 3.13, venv per project
- No cross-project imports — each project is self-contained
- `.env` files are gitignored; copy from `.env.example`
