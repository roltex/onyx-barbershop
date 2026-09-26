# Product plan and flows

## Experience

Onyx uses a charcoal/copper public identity, warm studio photography, editorial typography and generous spacing. The workspace uses a dark side navigation, quiet green accents, practical cards and dense but scrollable tables. Desktop, tablet and phone share the same workflows. On small screens navigation opens in a drawer, forms stack, and tables scroll inside their own panels.

## Customer journey

1. Explore barbering or beauty services; prices and durations come from the database.
2. Select a specialist qualified for the chosen service.
3. Choose a salon-local date. The API calculates 15-minute start times from weekly working hours, existing reservations, time off, minimum notice and booking horizon.
4. Provide name, email and phone; optionally add notes and opt in to marketing. Accept booking/privacy terms.
5. Server revalidates availability and commits the appointment, customer linkage, occupied slots, audit entry and email outbox together.
6. Receive confirmation, private management link and optional `.ics` calendar download.
7. Cancel through the private link before the configured cutoff. For rescheduling, contact the salon; managers can atomically change the appointment time.

## Daily manager journey

1. Sign in with a database-backed session.
2. Review today's appointments, collected payments and low-stock alerts.
3. Use appointment list or date-specific team agenda to find visits.
4. Add phone/walk-in reservations using the same availability rules as the public flow.
5. Reschedule when needed; the original slot is preserved on failure.
6. Mark completion or no-show. Record the payment actually received at the salon.
7. Update customer notes, services, schedules and stock; inspect delivery status.

## Owner journey

Owners have all manager capabilities plus business configuration, user access control, audit inspection and full-refund recording. Owners can disable another user; their sessions are revoked immediately. Accounts are archived rather than deleted to preserve operational history.

## Data rules

- Prices are integers in currency minor units (e.g. 4500 = GEL 45.00).
- Currency becomes immutable after the first booking to avoid relabeling historical money.
- UTC ISO timestamps are stored; Luxon calculates salon-local schedules.
- Each appointment snapshots its service name, price and duration through start/end timestamps.
- Rescheduling preserves price and original duration, same service and specialist.
- Active/archive changes affect new bookings; they do not silently cancel old appointments.
- Confirmed → completed / cancelled / no_show is one-way. Corrective operational actions should be audited via a reviewed support process.
- Customer email is the identity key. Anonymous reservations never overwrite an existing customer's profile or consent.
- Public booking links expose only appointment details, never email, phone, internal notes or customer IDs.
- One specialist cannot occupy the same 15-minute block twice. Database uniqueness is the final concurrency guard.
- Time-off blocks that overlap confirmed appointments are rejected.
- Customers can decline marketing without losing the ability to book.

## Architecture

Browser → Next.js `/api/*` same-origin rewrite → Express API → Knex → SQLite locally / MySQL in production.

Express also runs the durable email queue on a 30-second timer. This release supports one API worker process. A multi-instance deployment must replace in-memory request limiting and add distributed outbox claims before scaling horizontally.

## Scope and extension order

The delivered release covers the core appointment lifecycle and salon management. Sensible next phases, once requirements are confirmed: customer-verified accounts and rebooking; deposits through a payment provider; SMS through a provider; waitlist and multi-service visits; products on receipts and stock ledger; commissions and payroll; multi-location tenancy. They are not represented as working modules in this release.
