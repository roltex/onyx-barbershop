# Onyx Barbers

A Next.js frontend and Node.js/Express backend for a single-location barber and beauty salon. SQLite for local development; MySQL 8 for production. No Docker.

## Start locally

Install **Node.js 22.13+ (Node 24 LTS recommended)**. Extract this ZIP, open a terminal in the `onyx-barbers` folder, then run:

```bash
npm ci
npm run setup
npm run dev
```

Open **http://localhost:3000**. Staff sign-in: **http://localhost:3000/login**.

- Email: `manager@onyx.local`
- Password: **a random password printed by `npm run setup`**. Save it when shown.
- Setup creates `.env` files and an SQLite database. Existing installations are preserved; setup never resets passwords or overwrites records.
- Keep the terminal running. Press Ctrl+C to stop.
- API runs on port 4000. Use the website on port 3000, so cookies and API requests share the same origin.
- First installation needs internet to download npm dependencies. Fonts and the studio image are included locally; the app has no runtime image/font CDN dependency.

If `better-sqlite3` needs compilation on your platform, install the C++ build tools recommended by Node.js. Use an official Node 22/24 build matching your OS and CPU.

## What is included

| Area | Implemented functionality |
|---|---|
| Public website | Responsive editorial landing, barber/beauty service filters, team cards, business contact details |
| Booking | Service → specialist → live availability → details → confirmation; database-enforced slot exclusivity; timezone-aware schedules; lead time and advance booking limits |
| Customer self-service | Private appointment link, cancellation cutoff, calendar file download; rescheduling through the salon |
| Appointments | Search, date/status filters, list and team agenda views, staff-created bookings, reschedule, completion, cancellation and no-show states |
| Customers | Create/edit records, internal notes, marketing consent, visit history, CSV export |
| Services | Prices, duration, category, description, active/archive state |
| Team | Specialist service assignment, weekly schedules, time off and breaks with appointment conflict protection |
| Checkout | Record money received at salon, cash/card-terminal/bank methods, tips; owner-only full-refund recording |
| Inventory | Product/SKU, editable quantity and price, low-stock thresholds and alerts |
| Reports | Last-30-day appointment metrics and collected service revenue |
| Email | Durable confirmation, cancellation, reschedule and reminder outbox; SMTP delivery, retries, visible delivery status |
| Settings | Business details, timezone, currency, booking notice, horizon, cancellation window |
| Access | Owner and manager roles, account creation/disable, password changes, session revocation, server-side authorization |
| Audit | Business record changes and booking/payment actions |
| PWA | Install manifest, app icons, service worker, offline fallback and connection notice; no sensitive offline cache |

Services, team names and products from local setup are **sample data**. The studio photograph is generated imagery, not a photograph of an actual Onyx location. Default location/timezone/currency are Tbilisi / Asia/Tbilisi / GEL. Replace sample content before launch.

## Commands

```bash
npm run dev          # Next.js and API, with reload
npm run build        # Production frontend build + TypeScript validation
npm start            # Run the production build and API
npm test             # API integration tests against a temporary SQLite DB
npm run typecheck    # Frontend TypeScript checks
npm run db:migrate   # Create the initial database schema
npm run db:seed      # Local sample setup, refuses production and existing users
npm run owner:create # Create first owner + empty business settings, no sample data
npm run owner:reset  # Operator-only password recovery, revokes all user sessions
```

For production-mode PWA testing locally:

```bash
npm run build
npm start
```

Open localhost in Chrome/Edge and use the browser's **Install app** action. On iPhone use Safari → Share → Add to Home Screen. Service workers are enabled in production builds only. HTTPS is required away from localhost. The app does not cache customer records, dashboard pages, API responses or booking submissions for offline use.

## Structure

```text
apps/
  web/                    Next.js App Router + React + TypeScript
    app/                  Landing, booking, login, privacy, dashboard
    public/               Studio image, icons, manifest, service worker
  api/
    src/server.js         HTTP API, authentication, role enforcement, email worker
    src/booking.js        Availability, reservations, atomic rescheduling
    src/db.js             Knex SQLite/MySQL configuration
    src/migrate.js        Initial schema
    src/seed.js           Local sample setup
    src/integration.test.js
scripts/
  setup.mjs               Cross-platform local initialization
  browser-check.mjs       End-to-end browser verification
  backup-sqlite.mjs        Consistent SQLite backup
  anonymize-customer.mjs   Operator-only privacy request processing
  export-data.mjs          Portable logical backup
  import-data.mjs          Restore logical backup to an empty migrated database
docs/
  PRODUCT-PLAN.md
  PRODUCTION.md
  SECURITY.md
  TEST-RESULTS.md
  API.md
  ASSETS.md
```

## Before going live

Read **[docs/PRODUCTION.md](docs/PRODUCTION.md)**. Configure MySQL, HTTPS, SMTP, real staff/services/business details, and your approved legal/privacy text. Test the entire booking and email workflow on your actual host. Backups, monitoring, operator recovery and restore drills are part of deployment.

This is a working application and source delivery, **not a claim of independently audited production readiness**. The included test report distinguishes tested SQLite/browser behavior from deployment checks that require your MySQL server, SMTP service and domain.

Deliberate boundaries: single location; one service and one specialist per appointment; no online payment gateway or card storage; no SMS, push delivery, recurring appointments, packages, gift cards, payroll/commission accounting, stock sales ledger, third-party calendar sync, or customer accounts. These require separate business rules/integrations. Stock is adjusted manually. Reports are operational, not a tax/accounting system.
