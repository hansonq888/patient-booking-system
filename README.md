# Vero Booking

A patient appointment booking app built as part of the Vero Summer 2026 co-op application.

**Live demo:** https://patient-booking-system-tau.vercel.app

No setup needed. Feel free to click around and try the full booking flow, admin view, and physician workspace.

![Vero Booking home page](public/Screenshot%202026-05-13%20072313.png)

---

## Running the project

The live demo above is the easiest way to explore the app. The four entry points are:

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/book` | Patient booking flow |
| `/admin` | Admin dashboard |
| `/physician` | Physician workspace |

To run locally, you'll need Node.js 20+ and a Neon PostgreSQL database. Add the connection string to `.env.local` as `DATABASE_URL`, then:

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

---

## What I built

1. **Patient booking flow** (`/book`): Five-step wizard (physician, time slot, reason, details, review). Form state persists in `localStorage`. Bookings land as PENDING awaiting clinic confirmation.

2. **Admin view** (`/admin`): Today's schedule with stats, plus an all-bookings list with search, upcoming/past, status, and physician filters. Booking detail includes patient info, admin notes, and confirm/cancel.

3. **Physician workspace** (`/physician`): Per-physician localStorage session with four tabs: **My Schedule** (today's timeline with next-up countdown), **Calendar** (month view with per-day density), **Inbox** (bookings from the last 14 days with a pending badge), and **All Patients** (full filterable list). Physicians can toggle "accepting new patients" live from the schedule page.

---

## Key decisions

- **Prisma `$transaction` for booking:** prevents double-booking under concurrent requests; P2002 unique constraint as a DB-level fallback
- **Explicit status state machine:** `VALID_TRANSITIONS` map enforces `PENDING -> CONFIRMED | CANCELLED -> nothing`; invalid transitions return a 400
- **Optimistic UI:** status changes apply instantly in state and roll back on API failure
- **Server-side period filtering:** upcoming/past filtering happens in the Prisma query, not client-side
- **No auth server:** physician identity via `localStorage`, layout validates URL param matches stored ID; sufficient for this scope

---

## What I'd improve with more time

- **Auth:** role-based access for patients, physicians, and admins
- **Notifications:** email/SMS to patients on confirm or cancel (Resend / Twilio)
- **Real-time updates:** SSE or WebSockets so changes appear without a refresh
- **AI visit summary:** LLM-generated pre-visit brief from reason, notes, and specialty
- **Tests:** the booking transaction and form flow are the highest-value targets
- **Availability management:** UI for physicians to set recurring weekly schedules
