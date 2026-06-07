# HIS Web — CLAUDE.md

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui components
- Zustand (auth state, persisted to localStorage)
- TanStack React Query (all server state — API calls)
- axios (HTTP client, token auto-attached)
- date-fns (date formatting)

## Structure
```
web/src/
├── app/
│   ├── layout.tsx           # Root layout (Providers + Toaster)
│   ├── page.tsx             # Redirects to /dashboard or /login
│   ├── login/page.tsx       # Login screen
│   ├── dashboard/page.tsx   # Home dashboard with stats
│   ├── opd/page.tsx         # OPD Queue (Kanban board)
│   ├── patients/
│   │   ├── page.tsx         # Patient list + search
│   │   ├── new/page.tsx     # Register new patient
│   │   └── [id]/page.tsx    # Patient detail (TODO)
│   ├── appointments/page.tsx # Appointment list + check-in
│   ├── doctor/page.tsx      # Doctor Desk (SOAP + Rx + Lab — all-in-one)
│   ├── lab/page.tsx         # Lab orders
│   ├── billing/page.tsx     # Billing
│   └── pharmacy/page.tsx    # Pharmacy
├── components/
│   ├── his/
│   │   ├── sidebar.tsx      # Left nav (role-based visibility)
│   │   └── topbar.tsx       # Top bar with live clock
│   ├── providers.tsx        # QueryClient provider
│   └── ui/                  # shadcn components (don't edit)
├── lib/
│   ├── api.ts               # Axios instance (auto token, 401 redirect)
│   └── utils.ts             # cn(), calcAge(), fmtDate(), fmtCurrency()
└── store/
    └── auth.ts              # Zustand auth store (persisted)
```

## Conventions
- All pages: `"use client"` at top
- Layout pattern: `<Sidebar /> + <Topbar /> + <main>` in a flex-h-screen div
- API calls via TanStack Query: `useQuery` for reads, `useMutation` for writes
- Import api client: `import api from "@/lib/api"`
- Toast notifications: `import { toast } from "sonner"`
- Icons: lucide-react only
- No hardcoded data — everything fetched from API

## UI Design Principles
- Maximum info on single screen — use tabs/panels, not page navigation
- Sidebar: blue-950 background, role-based nav items
- Cards for content blocks, shadcn/ui primitives for forms
- Status badges: color-coded consistently (gray=scheduled, blue=checked-in, amber=queue, violet=with-doctor, green=completed, red=cancelled)
- Tables for lists, Kanban-style cards for OPD queue

## Key Screens
- `/opd` — Kanban queue: Checked In → In Queue → With Doctor → Completed
- `/doctor` — 3-panel: queue list | SOAP+Rx+Lab tabs | patient info strip
- `/patients/new` — Tabbed form: Demographics | Address | Emergency & Insurance

## Auth Flow
- Login posts to `/api/auth/login` (OAuth2PasswordRequestForm)
- Token stored in Zustand (persisted) + localStorage
- api.ts interceptor attaches token to every request
- 401 response → auto logout + redirect to /login
