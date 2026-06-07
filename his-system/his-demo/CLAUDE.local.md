# HIS Demo — Full Reference (CLAUDE.local.md)

> Quick reference: `.claude/CLAUDE.md`
> Last updated: 2026-05-20

---

## Architecture

```
index.html          ← shell only: CSS classes, <script src> tags, ALL_PAGES map
shared.js           ← helper functions (no state)
login.js            ← auth + NAV_TREE + navTo() + pageJourney()
pg-registration.js  ← Registration, Appointments, Front Desk pages + globals
pg-billing.js       ← Billing, Insurance, MIS, GST pages
```

### How navigation works

```
user clicks sidebar item
  → navTo('page-id')          [login.js:294]
  → ALL_PAGES['page-id']()    [index.html ALL_PAGES map]
  → returns HTML string
  → innerHTML of #main-content set
```

`navTo` also highlights the active sidebar item and updates `currentPage`.

---

## Shared Helpers (`shared.js`)

| Function | Signature | Purpose |
|---|---|---|
| `pageHeader` | `(title, breadcrumb, actions)` | Page title + breadcrumb + right-side action buttons |
| `sectionCard` | `(title, body, footer?)` | White card with title bar and optional footer |
| `kpiCards` | `([ {label, value, color, sub} ])` | Row of KPI stat boxes |
| `table` | `(headers[], rows[][], emptyMsg?)` | Styled data table |
| `formRow` | `(...fields)` | Horizontal form row (up to 3 columns) |
| `formField` | `(label, inputHtml, required?)` | Labelled form field wrapper |
| `inp` | `(placeholder, value?)` | `<input class="form-input">` shorthand |
| `sel` | `(options[])` | `<select class="form-select">` shorthand |
| `badge` | `(text, color)` | Coloured pill badge (green/blue/yellow/red/gray/purple/orange) |
| `stepBar` | `([ {label, status} ])` | Step progress bar (status: active/done/pending) |
| `showTab` | `(id, tabs[])` | Show/hide tab panels |
| `fmt` | `(n)` | Format number as ₹ with commas |
| `fmtN` | `(n)` | Number with commas, no ₹ |

---

## CSS Classes (defined in `index.html` `<style>`)

```css
.sidebar-link         /* sidebar nav item */
.sidebar-link.active  /* active nav item */
.sidebar-cat          /* sidebar section header */
.badge                /* pill badge base */
.badge-green/blue/yellow/red/gray/purple/orange
.kpi-card             /* KPI stat box */
.step-done/active/pending     /* step bar circles */
.step-line-done/pending       /* step bar connectors */
.btn-primary/outline/danger/success
.form-label/input/select/textarea
.card                 /* generic white card */
.section-title/page-title/breadcrumb
.modal-overlay        /* fixed full-screen overlay */
.modal-box            /* centred modal panel */
.required             /* red asterisk */
```

---

## Login & Roles (`login.js`)

### Demo users (password: his@1234 in React frontend)

| Role | Name | Sees |
|---|---|---|
| master | Admin Master | ALL departments |
| receptionist | Anita Sharma | registration, opd, appointments |
| doctor | Dr. Anil Mehta | emergency, opd, ipd, lab |
| nurse | Priya Nair | emergency, opd, ipd |
| billing | Rahul Gupta | billing, ipd |
| cashier | Suresh Patel | billing |
| pharmacist | Meena Joshi | pharmacy |
| lab | Kavita Rao | lab |

### `NAV_TREE` structure (login.js)

```js
{ id:'section-id', label:'...', icon:'...', roles:[...], items:[
  { id:'item-id', label:'...', page:'page-id' },
]}
```

Roles array controls which roles see each section. `master` always sees all.

### `currentUser` global

Set by `loginAs(roleId)`. Available in all page functions.
```js
currentUser.name   // display name
currentUser.role   // role string
currentUser.title  // job title
```

---

## pg-registration.js — Global State Variables

| Variable | Purpose |
|---|---|
| `DEMO_PATIENTS[]` | 5 seed patients (HIS2600001–005) |
| `_regCounter` | UHID auto-increment counter (starts at 6) |
| `_regStep` | Current step in registration wizard (1/2/3) |
| `REG_SCENARIOS[]` | All 12 Registration scenarios with steps |
| `FD_DOCTORS{}` | Doctors by department for Front Desk Workstation |
| `FD_SYMPTOM_MAP[]` | Symptom keyword → department mapping |
| `_fd{}` | Front Desk Workstation state object |
| `_APT_DOCTORS[]` | 6 appointment doctors with fee/qual |
| `_APT_BOOKED{}` | Pre-booked slots per doctor |
| `_AM_APTS[]` | Full appointment dataset (6 seed records) |
| `_AM_LOG[]` | Appointment audit log entries |
| `_AM_BLOCKED{}` | Blocked slots per doctor |
| `_amTab` | Active tab in Appointment Management |
| `_amBulk[]` | Selected appointment numbers for bulk ops |

---

## pg-registration.js — Page Functions

| Function | Page ID | Description |
|---|---|---|
| `pageRegHome()` | `reg-home` | 12-scenario cards with flow modal |
| `pageRegDesk()` | `reg-desk` | Front Desk Workstation (symptom→doctor→slot→token) |
| `pagePatientReg()` | `patient-reg` | 3-step new patient registration wizard |
| `pageOpdQueue()` | `opd-queue` | Live OPD queue table with call-in |
| `pageAppointments()` | `appointments` | 4-tab appointment management |
| `pageBedStatus()` | `bed-status` | Ward bed availability board |

---

## pg-registration.js — Global Handler Functions

### Registration wizard
- `regToggle(v)` — switch between 'search' and 'new' panels
- `regShowStep(n)` — navigate to step 1/2/3, update step bar
- `regCheckDuplicate()` — live mobile+DOB duplicate detection
- `regNext()` — validate and advance to next step
- `regSearch(q)` — returning patient search
- `regReset()` — clear all form fields

### Front Desk Workstation (`fd*`)
- `fdSearchPatient(q)` — search + show results dropdown
- `fdPickPatient(p)` — select patient, show card
- `fdNewPatient()` — switch to new patient inline form
- `fdDetectDept(q)` — symptom→department suggestion
- `fdSelectDept(dept)` — confirm department, load doctors
- `fdLoadDoctors(dept)` — render doctor cards sorted by fee
- `fdSelectDoctor(docId)` — pick doctor, show slot grid
- `fdPickSlot(s)` — select/deselect slot
- `fdConfirm()` — book and show token card
- `fdReset()` — start fresh

### Appointment Management (`am*`)
- `amTab(t)` — switch tab (book/schedule/manage/audit)
- `amBookSearch(q)` — search with duplicate check
- `amPickPatient(p)` / `amBookNonReg()` — select patient
- `amDocFilter()` / `amDocPick()` — department/doctor selection
- `amSetSess(s)` / `amPickSlot(s)` — session and slot
- `amConfirm()` — book + add to `_AM_APTS` + log + show slip
- `amShowSlip(a)` / `amShowSlipByNo(no)` — appointment slip modal
- `amRenderSchedule()` — load doctor schedule grid
- `amToggleBlock(docId, slot)` — block/unblock a slot
- `amRenderManage()` — filtered appointment table
- `amBulkToggle(no)` / `amBulkCancel()` / `amBulkTransfer()` — bulk ops
- `amReschedule(no)` / `amReschedConfirm()` — reschedule modal
- `amCancelOne(no)` — single appointment cancel
- `amRenderAudit()` — audit log table
- `amLog(action, patient, aptNo, detail)` — append to `_AM_LOG`

### OPD Queue
- `opdCallPatient(uhid)` — update queue row to "In Consult"

---

## pg-billing.js — Page Functions

| Function | Page ID |
|---|---|
| `pageDashboard()` | `dashboard` |
| `pageSetupTariff()` | `setup-tariff` |
| `pageSetupPackages()` | `setup-packages` |
| `pageSetupInsurance()` | `setup-insurance` |
| `pageOPDRegistration()` | `opd-registration` |
| `pageOPDProcedures()` | `opd-procedures` |
| `pageIPDAdmission()` | `ipd-admission` |
| `pageIPDCharges()` | `ipd-charges` |
| `pageIPDFinalBill()` | `ipd-finalbill` |
| `pageIPDDaycare()` | `ipd-daycare` |
| `pageIPDProvisional()` | `ipd-provisional` |
| `pageInsPreauth()` | `ins-preauth` |
| `pageInsCashless()` | `ins-cashless` |
| `pageCorpBilling()` | `corp-billing` |
| `pageCorpGovt()` | `corp-govt` |
| `pageRefRefund()` | `ref-refund` |
| `pageRefCancel()` | `ref-cancel` |
| `pageRefDuplicate()` | `ref-duplicate` |
| `pageMISDaily()` | `mis-daily` |
| `pageMISAudit()` | `mis-audit` |
| `pageMISRevenue()` | `mis-revenue` |
| `pageMISLeakage()` | `mis-leakage` |
| `pageCompGST()` | `comp-gst` |

---

## ALL_PAGES map (`index.html`)

Every page function must be registered here:
```js
const ALL_PAGES = {
  'page-id':  pageFunctionReference,
  ...
};
```

---

## Seed Data

### DEMO_PATIENTS (5 patients)

| UHID | Name | Age | Dept | Doctor | Status | Type |
|---|---|---|---|---|---|---|
| HIS2600001 | Ramesh Kumar | 42M | General Medicine | Dr. Anil Mehta | waiting | OPD |
| HIS2600002 | Sunita Patel | 35F | Gynaecology | Dr. Priya Sharma | in-consultation | OPD |
| HIS2600003 | Mohammed Iqbal | 58M | Cardiology | Dr. Suresh Verma | waiting | OPD |
| HIS2600004 | Kavita Desai | 29F | Orthopaedics | Dr. Rajesh Nair | done | OPD |
| HIS2600005 | Arjun Singh | 67M | General Medicine | Dr. Anil Mehta | admitted | IPD |

### _APT_DOCTORS (6 doctors)

| ID | Name | Dept | Fee |
|---|---|---|---|
| D001 | Dr. Anil Mehta | General Medicine | ₹600 |
| D002 | Dr. Priya Sharma | Gynaecology | ₹700 |
| D003 | Dr. Suresh Verma | Cardiology | ₹1000 |
| D004 | Dr. Rajesh Nair | Orthopaedics | ₹700 |
| D005 | Dr. Meena Joshi | Paediatrics | ₹600 |
| D006 | Dr. Vinod Patel | ENT | ₹600 |

---

## Indian Standards Embedded

| Standard | Implementation |
|---|---|
| UHID format | `HIS26NNNNN` (year-prefixed, auto-increment) |
| ABHA | Optional field on registration, ABDM-compliant label |
| Duplicate check | Mobile + DOB combination triggers mandatory review |
| Aadhaar masking | Only last 4 digits displayed (UIDAI compliance) |
| MLC flag | Emergency registration, police station fields |
| Triage | RED/YELLOW/GREEN/BLACK (START method) |
| Payment modes | Cash, UPI, Card, CGHS, ECHS, PMJAY, Insurance cashless, Corporate |
| GST | Consultation NIL, Lab 18%, Pharma 5–12% (in billing pages) |
| NABH | Consent capture, audit trail, staff ID on every action |
| Schedule H | To be flagged in Rx tab of Doctor Workbench |

---

## OPD Cycle Plan (Next Build)

### Agreed scope (discussed 2026-05-20)

**7 stages — 4 screens (minimize switching):**

```
[1] OPD Queue & Check-in    → enhance existing opd-queue page
[2] Nurse Pre-consultation  → NEW page (opd-nurse)
[3] Doctor Consultation     → enhance existing opd-consult (6 comprehensive tabs)
[4] Lab / Radiology         → existing (minor enhancements)
[5] Pharmacy                → existing (minor enhancements)
[6] OPD Billing             → enhance existing opd-registration
[7] Discharge / Follow-up   → inline in Doctor Consultation Tab 6
```

### Doctor Consultation — 6-tab design

| Tab | Content |
|---|---|
| 1. History & Complaint | Chief complaint, HPI, past/family/social history, ROS, menstrual (female) |
| 2. Examination | General findings, CVS/RS/PA/CNS, local examination |
| 3. Diagnosis | ICD-10 search, primary + secondary, provisional/confirmed, severity |
| 4. Investigations | Lab orders (panels), Radiology orders, previous results inline |
| 5. Prescription | Generic drug search, dose/route/frequency/duration, Schedule H flag, drug-allergy check |
| 6. Plan & Advice | Follow-up booking, referral, diet/activity advice, certificates, IPD admission |

**Left sidebar (always visible):** Patient card, vitals from nurse (colour-coded), allergy alerts, last 3 visits, quick actions.

### Nurse Pre-consultation — single screen

Vitals (BP sys/dia, Pulse, Temp, SpO2, RBS, Weight, Height → BMI auto), Pain scale 0–10, chief complaint, history flags (DM/HTN/cardiac/asthma/pregnancy), allergy entry, triage colour.

### OPD Queue enhancements

- Appointment vs walk-in queue separation
- Priority flags: Senior Citizen (60+), Pregnant, Disabled
- Estimated wait time per doctor
- "Send to Vitals" → moves to nurse workstation
- No-show marking
- Queue reassignment

### Pending questions from discussion

1. Nurse screen — separate sidebar item or triggered from queue?
2. Doctor screen — 6 tabs or scrollable single page with persistent left panel?
3. ICD-10 — live typeahead or category picker?
4. Prescription — generic-first or brand-first?

---

## Common Patterns

### Correct way to add interactive elements

```js
// WRONG — script inside returned HTML string does nothing
function pageXxx() {
  return '<div>' +
    '<script>function doThing(){...}</s' + 'cript>' +   // never execute
    '<button onclick="doThing()">Click</button>' +
  '</div>';
}

// RIGHT — global function declared at top of file
function doThing() { ... }  // global, executes fine

function pageXxx() {
  return '<div><button onclick="doThing()">Click</button></div>';
}
```

### Passing object data to onclick

```js
// Use JSON.stringify wrapped in single quotes
'<div onclick=\'pickItem(' + JSON.stringify(item) + ')\'>' + item.name + '</div>'
```

### Modal pattern

```js
// Show
document.getElementById('my-modal').style.display = 'flex';

// HTML (in page function return string)
'<div id="my-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);' +
'z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
'  <div style="background:#fff;border-radius:16px;padding:28px;width:480px" onclick="event.stopPropagation()">' +
'    ...' +
'  </div>' +
'</div>'
```

### Tab switching pattern

```js
function showMyTab(t) {
  ['tab1','tab2','tab3'].forEach(function(id) {
    var btn = document.getElementById('mytab-btn-' + id);
    var pnl = document.getElementById('mytab-pnl-' + id);
    if (btn) { btn.style.background = id===t ? '#2563eb' : '#f8fafc'; btn.style.color = id===t ? '#fff' : '#374151'; }
    if (pnl) pnl.style.display = id===t ? '' : 'none';
  });
}
```
