# Vero Booking

A patient appointment booking app built as part of the Vero Summer 2026 co-op application.

---

## Running the project

**Prerequisites:** Node.js 20+, a PostgreSQL database (the project uses [Neon](https://neon.tech))

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL with your Neon connection string

# 3. Push the schema and seed demo data
npx prisma db push
npx prisma db seed

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/book` | Patient booking flow |
| `/admin` | Admin dashboard and all-bookings view |
| `/physician` | Physician workspace (select your name to log in) |

---

## What I built

A full-stack clinic scheduling platform with three distinct surfaces:

**Patient booking flow** (`/book`): A five-step wizard — choose physician, pick a time slot, state reason for visit, enter patient details, review and submit. Form state persists in `localStorage` so a refresh does not lose progress. Bookings land in PENDING status awaiting clinic confirmation.

**Admin view** (`/admin`): Today's schedule at a glance with stats, plus an all-bookings list with search, period (upcoming/past), status, and physician filters. Clicking a booking opens a detail page with full patient info, appointment metadata, an admin notes field, and confirm/cancel actions behind a confirmation dialog. Past appointments are listed reverse-chronologically.

**Physician workspace** (`/physician`): Per-physician login via localStorage session. Three tabs:
- **My Schedule** — today's appointments in morning/afternoon sections with a "Next up" countdown, a live "now" divider, and status badges. Cards are fully clickable links.
- **Calendar** — month-view showing appointment density per day. Selecting a day lists that day's bookings; clicking one opens a detail page with full notes and action buttons.
- **All Patients** — list grouped by date with upcoming/past toggle, status filter, and patient name search. Quick confirm/cancel without leaving the list.

Physicians can toggle "accepting new patients" from their schedule page; this is persisted to the database and immediately reflected on the patient-facing booking page.

---

## Key technical and product decisions

**Prisma 7 with driver adapters on Neon**
Neon is serverless PostgreSQL. Prisma 7's `driverAdapters` preview feature uses a pg-compatible adapter instead of binary engine connections, which avoids connection exhaustion in Next.js serverless environments.

**Booking transaction for double-booking prevention**
The POST `/api/bookings` handler wraps the availability check and slot update in a single Prisma `$transaction`. Two simultaneous requests for the same slot cannot both pass the check. A P2002 unique-constraint error is caught as a belt-and-suspenders fallback at the database level.

**Explicit status state machine**
The PATCH `/api/bookings/[id]` handler enforces transitions via a `VALID_TRANSITIONS` table (`PENDING -> CONFIRMED | CANCELLED`, `CONFIRMED -> CANCELLED`, `CANCELLED -> nothing`). Invalid transitions return a descriptive 400 rather than silently no-oping.

**Optimistic UI updates**
Confirm/cancel actions on list pages snapshot the current booking array, apply the status change immediately in state, call the API, and roll back to the snapshot on failure. This makes the UI feel instant without waiting for the network round-trip.

**Period filter at the API level**
Upcoming and past filtering happens in the Prisma query (`startsAt > now` / `startsAt < now`), not client-side, so the server only returns what is needed. Past bookings are ordered descending; upcoming ascending. Calendar month-range queries bypass the period filter entirely via a `useRange` flag.

**No auth server**
For this scope, physician identity is stored in `localStorage` and the admin view is unprotected. The physician layout already validates that the stored ID matches the URL param to prevent accessing another physician's routes. A real deployment would need JWT or session-based auth with role separation.

**`localStorage` for form and session persistence**
The multi-step booking form state lives in a versioned key (`vero-booking-form-v1`). A hydration guard prevents writing the default state back before the stored value is read on first render. The version suffix means a schema change can be rolled without corrupting existing sessions.

**Custom focus-trapped ConfirmDialog**
The cancel confirmation dialog manually implements a keyboard focus trap (Tab/Shift-Tab cycling, Escape to dismiss, return focus to trigger on close) rather than relying on the native `<dialog>` element, which gives full control over styling across browsers.

---

## What I would improve with more time

**Authentication and authorization**
Every route is currently open. A production system needs role-based auth: patients get a lookup link by booking ID, physicians log in with credentials, admins have an elevated role. NextAuth or a dedicated auth service would be the natural fit here.

**Email and SMS notifications**
Patients should receive a confirmation when their booking is accepted or cancelled. A Resend or Twilio integration would close this loop. The booking detail page already exposes all the data needed.

**Real-time updates**
Status changes made by one user are not visible to others without a refresh. Server-Sent Events or a lightweight WebSocket channel would keep the admin and physician views live without polling.

**AI visit summary**
A "Generate visit summary" button on the booking detail page could call an LLM with the reason chip, clinical notes, and physician specialty to produce a structured pre-visit brief. The data model already has `adminNotes` and `reasonNotes` fields that would feed this directly.

**Timezone awareness**
All times display in the browser's local timezone. A clinic serving multiple timezones needs explicit timezone storage on each slot and conversion on display.

**Test coverage**
There are no automated tests. The booking transaction, status transition validation, and the multi-step form flow are the highest-value targets. The API routes are pure functions that are straightforward to cover with a test database.

**Recurring appointments and availability management**
Slots are seeded manually. A production system needs a UI for physicians to publish weekly availability patterns and for the system to generate slots rolling forward automatically.
