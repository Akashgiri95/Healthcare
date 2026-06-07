# HIS — CLAUDE.md (Quick Reference)

> Full details: see `CLAUDE.local.md`

---

## Build Status (2026-05-20)

| Layer | Status |
|---|---|
| Backend (FastAPI :8000) | ✅ Running — SQLite dev, PostgreSQL prod |
| Frontend (React+Vite :5173) | ✅ Running — Tailwind CSS v4 |
| Auth (JWT + bcrypt) | ✅ 12 demo users seeded (his@1234) |
| HISContext (shared state) | ✅ 10 cross-dept flows, 5 seed patients |
| Registration, OPD Queue | ✅ Built |
| Emergency Reg + ED Queue | ✅ Built — triage, MLC, unknown patient |
| Doctor Workbench | ✅ Built — 5 tabs |
| Lab, Pharmacy, Billing | ✅ Built |
| IPD & Ward | 🔨 Next |

---

## Dev Commands

```bash
# Backend
cd backend && ./venv/bin/uvicorn app.main:app --port 8000 --reload

# Frontend
cd frontend && npm run dev

# Seed (run once on fresh DB)
cd backend && ./venv/bin/python seed.py

# Demo
open http://localhost:5173   # use quick-login badges
```

---

## Project Rules (every session)

1. **Discuss before coding** — state plan, wait for approval
2. **One scenario at a time** — complete coverage before moving on
3. **Everything interlinked** — no isolated screens; use HISContext flows
4. **Separate venv** — always `backend/venv/`; never system Python
5. **Discuss architecture changes** — don't change structure silently

---

## Key Decisions (do not re-discuss)

| Decision | Choice |
|---|---|
| Auth library | Direct `bcrypt` — passlib breaks on Python 3.13 |
| Frontend data | HISContext shared state — swap API calls in later |
| Emergency | Separate module — NOT under OPD, NOT under IPD |
| OPD Queue | Visible in both Registration sidebar AND OPD Management |
| Master role | Sees ALL departments without switching login |
| UHID format | `HIS26NNNNN` auto-generated |
| bcrypt import | `import bcrypt` directly — never `from passlib` |
