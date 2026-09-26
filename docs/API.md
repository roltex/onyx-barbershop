# API reference

All routes start with `/api`. JSON requests/responses. Errors use `{ "error": "Readable message" }` with 400/401/403/404/409/429/500 status codes. Mutation requests require `Origin` matching `PUBLIC_ORIGIN`. Authenticated mutations additionally require the `x-csrf-token` returned by login or `/auth/me`.

| Method   | Path                                                                              | Purpose                                           |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| GET      | /health                                                                           | Database health                                   |
| GET      | /public/catalog                                                                   | Settings, active services and staff               |
| GET      | /public/availability?serviceId=UUID&staffId=UUID&date=YYYY-MM-DD                  | Available UTC start/end plus salon-local label    |
| POST     | /public/bookings                                                                  | Create reservation                                |
| GET      | /public/booking/:token                                                            | Private appointment summary                       |
| POST     | /public/booking/:token/cancel                                                     | Cancel within salon policy                        |
| POST     | /auth/login                                                                       | Email/password → session cookie, user, CSRF token |
| GET      | /auth/me                                                                          | Current staff user and CSRF token                 |
| POST     | /auth/logout                                                                      | Revoke session                                    |
| POST     | /auth/password                                                                    | `{current,password}`                              |
| GET      | /admin/overview                                                                   | Daily metrics and 30-day records                  |
| GET      | /admin/bookings?date=YYYY-MM-DD                                                   | Joined appointments, at most 1000                 |
| POST     | /admin/bookings                                                                   | Staff-created reservation                         |
| PATCH    | /admin/bookings/:id/status                                                        | `{status: completed/cancelled/no_show}`           |
| POST     | /admin/bookings/:id/reschedule                                                    | `{start: UTC_ISO}`                                |
| POST     | /admin/bookings/:id/payment                                                       | `{method: cash/card/bank, tip: minor_units}`      |
| POST     | /admin/bookings/:id/refund                                                        | Owner records a full refund already issued        |
| GET/POST | /admin/services, /admin/customers, /admin/staff, /admin/inventory                 | List or create                                    |
| PUT      | /admin/services/:id, /admin/customers/:id, /admin/staff/:id, /admin/inventory/:id | Replace validated editable fields                 |
| GET      | /admin/customers/:id/history                                                      | Customer appointment history                      |
| GET/POST | /admin/timeoff                                                                    | List/create time-off blocks                       |
| DELETE   | /admin/timeoff/:id                                                                | Remove time-off block                             |
| GET/PUT  | /admin/settings                                                                   | Read; owner-only update                           |
| GET/POST | /admin/users                                                                      | Owner-only list/create                            |
| PATCH    | /admin/users/:id                                                                  | Owner enables/disables another account            |
| GET      | /admin/audit                                                                      | Owner reads latest 250 changes                    |
| GET      | /admin/outbox                                                                     | Latest 100 email delivery records (no bodies)     |
| POST     | /admin/outbox/:id/retry                                                           | Retry failed message                              |

Booking body:

```json
{
  "serviceId": "service-uuid",
  "staffId": "staff-uuid",
  "start": "2026-10-06T06:00:00.000Z",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+995555123456",
  "notes": "Optional style preference",
  "marketing": false,
  "consent": true
}
```

Use real UUIDs and an available timestamp from the API. The server calculates prices, duration, status, reference and occupied blocks. Staff schedules use ISO weekdays `1` (Monday) through `7` (Sunday), with `start` and `end` salon-local `HH:mm` on 15-minute boundaries. Omit a weekday to mark it closed. Full field schemas are in `apps/api/src/server.js`.
