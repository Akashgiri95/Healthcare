# HIS System — Learning Journal

> Your personal reference of concepts learned while building this project.
> Organized by category. Add notes in your own words as you learn.

---

## Git & Version Control

### Repository
A folder tracked by git. Contains your code + a hidden `.git` folder that stores all history.

### Commit
A snapshot of your code at a point in time. Like a save point in a video game. Each commit has:
- A unique ID (hash like `7ddd261`)
- A message describing what changed
- Who made it and when

### Staging (git add)
Before committing, you choose which changes to include. `git add filename` moves changes to the "staging area" — like putting items in a shopping cart before checkout.

### Working Directory → Staging → Commit → Remote
```
[Your edits] --git add--> [Staged] --git commit--> [Local repo] --git push--> [GitHub]
```

---

## Database Concepts

### Table
Like an Excel sheet. Has columns (fields) and rows (records). Example: `patients` table has columns like `id`, `name`, `phone`.

### Primary Key
A column that uniquely identifies each row. Usually `id`. No two rows can have the same primary key.

### Foreign Key
A column that points to a row in another table. Example: `appointment.patient_id` points to `patients.id`. This is how tables are LINKED.

### Relationship Types
| Type | Example | Meaning |
|------|---------|---------|
| One-to-One | User → Doctor | One user has exactly one doctor profile |
| One-to-Many | Patient → Appointments | One patient can have many appointments |
| Many-to-Many | Patients ↔ Doctors | One patient sees many doctors; one doctor sees many patients |

### Migration
A script that changes the database structure (add table, add column, rename). Migrations are versioned so you can apply them in order, or roll back.

### ORM (Object-Relational Mapping)
Code that lets you work with database tables as Python classes. Instead of writing SQL, you write:
```python
patient = Patient(name="Ramesh", phone="9876543210")
session.add(patient)  # This becomes INSERT INTO patients...
```
We use **SQLModel** — combines Pydantic (validation) + SQLAlchemy (database).

---

## Architecture Concepts

### Frontend vs Backend
| Frontend | Backend |
|----------|---------|
| What user sees (browser) | The brain (server) |
| React/Next.js | FastAPI/Python |
| Port 3000 | Port 8000 |
| Sends HTTP requests | Receives requests, talks to database |

### API (Application Programming Interface)
A set of URLs the frontend can call to get/send data. Example:
```
GET  /api/patients      → List all patients
POST /api/patients      → Create new patient
GET  /api/patients/123  → Get patient with id=123
```

### REST
A style of designing APIs. Uses HTTP verbs:
| Verb | Meaning |
|------|---------|
| GET | Read data |
| POST | Create new |
| PUT/PATCH | Update existing |
| DELETE | Remove |

### JWT (JSON Web Token)
A "badge" given after login. Every request sends this badge so the server knows who you are without asking for password again.

### State
Data that the app "remembers" while you use it. Example: which patient is selected, who is logged in.

### Zustand
A state management library. Think of it as a "sticky note" the app can read/write. We use it to remember the current patient during OPD flow.

---

## Code Patterns

### Separation of Concerns
Each piece of code should do ONE thing. In our backend:
| File | Responsibility |
|------|----------------|
| router.py | Define URLs, receive requests |
| schemas.py | Validate request/response shape |
| service.py | Business logic (calculations, rules) |
| models.py | Database table definitions |

### DRY (Don't Repeat Yourself)
If you write the same code twice, make it a function. If you write the same structure twice, make it a component.

### Single Source of Truth
One place owns the data. Others read from it. Example: Patient data lives in the `patients` table. Other tables just store `patient_id` and look it up.

---

## Project-Specific Terms

### UHID (Unique Hospital ID)
Our patient identifier. Format: `HIS` + year + 6-digit sequence. Example: `HIS2024000042`

### ABHA (Ayushman Bharat Health Account)
India's national health ID. Format: `XX-XXXX-XXXX-XXXX`. Optional — patient may or may not have one.

### Encounter
One interaction between patient and hospital. Can be:
- OPD Visit (outpatient — comes, sees doctor, goes home)
- IPD Admission (inpatient — stays in bed for days)
- ER Visit (emergency — comes through casualty)

### Order
Something a doctor requests that another department must fulfill:
- Lab Order → Lab collects sample, runs test
- Prescription → Pharmacy dispenses medicines
- Radiology Order → X-ray/CT/MRI department does imaging

### SOAP Notes
Standard format for doctor's consultation notes:
- **S**ubjective — what patient says (complaints, history)
- **O**bjective — what doctor observes (examination, vitals)
- **A**ssessment — diagnosis (what's wrong)
- **P**lan — treatment (medicines, tests, advice)

### ICD-10
International standard codes for diseases. Example:
- `E11.9` = Type 2 Diabetes
- `I10` = Essential Hypertension
- `J06.9` = Acute upper respiratory infection

---

## Commands Reference

### Terminal Basics
```bash
cd foldername     # Change directory (go into folder)
cd ..             # Go up one level
ls                # List files in current folder
ls -la            # List with details (size, date, hidden files)
pwd               # Print working directory (where am I?)
```

### Git Commands
```bash
git status        # What files changed?
git diff          # Show actual changes
git add filename  # Stage a file for commit
git add .         # Stage ALL changed files (careful!)
git commit -m "message"  # Save snapshot with message
git push          # Upload to GitHub
git log --oneline # Show recent commits
```

### Project Commands
```bash
# Backend
cd api
source venv/bin/activate   # Activate Python environment
uvicorn app.main:app --reload --port 8000

# Frontend
cd web
npm run dev                 # Start development server
```

---

## Notes (Add Your Own)

_Use this section to write things in your own words as you learn._
