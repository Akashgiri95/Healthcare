# Healthcare — Engineering Projects

Monorepo for clinical software built at Adani Healthcare / Adani University.

## Projects

### [`his-system/`](his-system/) — Hospital Information System

Full-stack HIS for Tier 1 Indian hospitals. Covers the complete OPD cycle:
patient registration → appointment → nurse triage → doctor consultation → billing.

- **Backend**: FastAPI + SQLite (Python 3.13)
- **Frontend**: Next.js 15 + shadcn/ui
- **Demo**: Standalone HTML/JS prototype pages

→ [his-system/README.md](his-system/README.md)

---

### [`loinc-predictor/`](loinc-predictor/) — LOINC Code Predictor

Maps clinical lab reports (PDF, image, or raw text) to LOINC codes automatically.
Supports Indian lab formats (Dr Lal, LPL, SRL, Metropolis) with 200+ abbreviations.

- **Backend**: FastAPI + hybrid BM25 + FAISS semantic search
- **Frontend**: Single-page web UI
- **Coverage**: CBC, LFT, KFT, Lipid, Thyroid, Urine, HbA1c, hormones, infection markers

→ [loinc-predictor/README.md](loinc-predictor/README.md)

---

## Quick Start

Each project has its own `README.md` and `start.sh`. See the project directory for setup instructions.

## Repository Structure

```
Healthcare/
├── his-system/
│   ├── backend/        FastAPI + SQLite
│   ├── frontend/       Next.js 15
│   ├── his-demo/       Vanilla JS prototype
│   └── README.md
└── loinc-predictor/
    ├── backend/        FastAPI + BM25/FAISS
    ├── frontend/       Single-page UI
    ├── tests/
    └── README.md
```
