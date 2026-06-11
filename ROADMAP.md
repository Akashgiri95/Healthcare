# HIS System — Project Roadmap

> **Last updated:** 2026-06-11
> **Current focus:** Schema refactor for scalable multi-department architecture

---

## Project Vision

Build a complete Hospital Information System for a **Tier 1 Indian hospital** that:
- Covers ALL departments (OPD, IPD, Emergency, OT, Lab, Radiology, Pharmacy, etc.)
- Uses interconnected data (doctor's orders flow to Lab, Pharmacy, Radiology, Billing)
- Follows Indian healthcare standards (ABHA, ICD-10, GST, NABH)
- Is production-quality but runs locally for learning

---

## Architecture Decisions

| Decision | What We Chose | Why |
|----------|---------------|-----|
| Order System | Unified `Order` table | One table handles all order types (Lab, Pharmacy, Radiology, Procedure). Each department filters by `order_type`. Scalable. |
| Encounter Model | Single `Encounter` table | OPD Visit, IPD Admission, ER Triage all use same base structure. Simpler billing, reporting. |
| Department Queues | Filter by `order_type` + `status` | Each department sees their pending work. No separate queue tables needed. |
| Billing | Auto-aggregation | Orders automatically create bill items. No manual entry duplication. |

---

## Phases

### Phase 0: Foundation (Current)
- [x] Project cleanup (removed duplicate folders)
- [x] Teaching mode setup (CLAUDE.md rules)
- [ ] **Schema refactor** — Add unified Order system, Encounter model
- [ ] Migrate existing Prescription/LabOrder to new Order table
- [ ] Update seed.py with new schema

### Phase 1: Complete OPD
- [ ] Billing module — create bill from visit, add items, GST, payments
- [ ] Pharmacy module — dispense against prescription, update stock
- [ ] Lab results — tech enters results, flags abnormal values
- [ ] Doctor sees results in consultation

### Phase 2: IPD (Inpatient)
- [ ] Admission workflow
- [ ] Bed management (ward, room, bed allocation)
- [ ] Nursing station (shift notes, medication administration)
- [ ] Discharge summary
- [ ] IPD billing (room charges, daily services)

### Phase 3: Emergency
- [ ] Triage (color coding: Red/Yellow/Green)
- [ ] Trauma protocols
- [ ] Quick registration (minimal fields)
- [ ] ER to IPD/OT handoff

### Phase 4: Diagnostics
- [ ] Lab (LIS) — sample collection, barcoding, result entry, reports
- [ ] Radiology (RIS) — scheduling, modality tracking, report dictation
- [ ] Blood Bank — inventory, cross-match, transfusion records

### Phase 5: OT & ICU
- [ ] OT scheduling
- [ ] Pre-op checklists
- [ ] Anesthesia records
- [ ] ICU monitoring (hourly vitals, ventilator logs)

### Phase 6: Support Systems
- [ ] Inventory/Store — stock, purchase orders, expiry
- [ ] Insurance/TPA — claim submission, pre-auth
- [ ] MIS Reports — dashboards, NABH indicators
- [ ] ABHA/ABDM integration

---

## Key Learnings Log

| Date | Concept | What We Learned |
|------|---------|-----------------|
| 2026-06-11 | Project structure | Cleaned duplicate folders; single codebase now |
| 2026-06-11 | Order-based architecture | Universal Order table is more scalable than separate tables per order type |

---

## Questions to Revisit

- [ ] Do we need separate `Encounter` table, or can `Visit` handle OPD/IPD/ER with a `type` field?
- [ ] Should Orders link to Encounter or directly to Patient?
- [ ] How to handle partial dispensing (pharmacy gives 15 of 30 tablets)?

---

## How to Update This File

1. When we change plans, update the relevant section
2. Move completed items from [ ] to [x]
3. Add new learnings to the log
4. Update "Last updated" date at top
