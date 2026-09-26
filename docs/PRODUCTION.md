# Deployment without Docker

## Runtime layout

Use one Node.js API process and one Next.js process, behind an HTTPS reverse proxy. Use MySQL 8 with InnoDB and utf8mb4. Keep ports 3000/4000 private; expose only the reverse proxy. The API email worker and rate limiter are designed for a single API instance.

## Clean production initialization

1. Install Node.js 22.13+ and MySQL 8. Extract source, run `npm ci`.
2. Create a dedicated MySQL database and user. Grant schema privileges for migration, then reduce the runtime user to necessary SELECT/INSERT/UPDATE/DELETE privileges. Do not use the MySQL root account.
3. Copy `apps/api/.env.example` to `apps/api/.env`, and `apps/web/.env.example` to `apps/web/.env`.
4. Configure API values:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
PUBLIC_ORIGIN=https://your-onyx-domain.example
DB_CLIENT=mysql
DATABASE_URL=mysql://onyx:URL_ENCODED_PASSWORD@127.0.0.1:3306/onyx
TRUST_PROXY=0
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
MAIL_FROM=Onyx Barbers <bookings@your-onyx-domain.example>
```

Use a local/private MySQL network; configure provider-required TLS when using a remote database. For authenticated public hosting, never switch off TLS certificate validation. `TRUST_PROXY=1` is only appropriate when exactly one trusted proxy sits immediately before the API and overwrites forwarded headers. In the sample reverse proxy below `/api` goes directly to Express, so enable it there. Keep the API private to prevent forged forwarded IP addresses.

5. Run `npm run db:migrate` once against the empty database. This release has one initial schema version. Back up before future schema changes; do not use destructive schema reset commands on live data.
6. Set `ADMIN_EMAIL` and optionally a strong `ADMIN_PASSWORD` in the API environment; run `npm run owner:create`. It creates an owner and settings without sample records. If no password is supplied, it prints a random password once. Remove the bootstrap variables afterwards.
7. Set `apps/web/.env` to `API_URL=http://127.0.0.1:4000`, then run `npm run build`.
8. Start the two processes with a supervisor such as systemd or your hosting panel. Working directories must be `apps/api` and `apps/web`, respectively. Commands: `node src/server.js` for API; `npm start` in the web workspace. Configure automatic restart, non-root service users, restricted file permissions, logs and health monitoring.
9. Reverse-proxy the domain over HTTPS. Sample Nginx location bodies (inside your TLS server block):

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

10. Sign in, change the generated password, configure real business details, services, prices, staff, working hours and breaks. Add the real legal entity, contact details and retention policy to `app/privacy/page.tsx`, then rebuild. Set up SPF/DKIM/DMARC using your mail provider.

## Existing SQLite data → MySQL

Changing `DB_CLIENT` does not move records. Either initialize a clean production database (recommended for demo-only local work), or:

1. Stop API writes and take an SQLite backup.
2. With SQLite still configured, run `node scripts/export-data.mjs /safe/path/onyx-export.json` from the root.
3. Switch to an empty MySQL database, run `npm run db:migrate`. Do not seed or create an owner first.
4. Run `node scripts/import-data.mjs /safe/path/onyx-export.json`.
5. Verify counts, staff schedules, appointments, prices and owner sign-in. Imports exclude sessions. The export includes queued emails; inspect them before enabling SMTP to avoid sending historical messages.
6. Securely delete temporary exports according to your retention policy. Rehearse on a staging database first.

## Backups and recovery

- SQLite: `node scripts/backup-sqlite.mjs /safe/path/onyx-backup.sqlite`. It uses SQLite's backup API, so WAL state is included consistently. Destination must not exist.
- MySQL: use your managed database backups or `mysqldump --single-transaction` with a secure credentials file. Encrypt off-site backups and test restoration regularly.
- Logical export/import is provided for portability, not as a replacement for tested database backups. Quiesce writes for cross-engine migrations.
- Password recovery requires trusted server access: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the API environment, run `npm run owner:reset`, then remove those variables. All sessions for that user are revoked.
- Privacy request: after identity verification and review of retention requirements, use `node scripts/anonymize-customer.mjs CUSTOMER_UUID --confirm`. It refuses customers with confirmed appointments and retains de-identified appointment totals. Backup retention must also be addressed.

## Launch verification

- Two concurrent requests for the same slot: exactly one succeeds.
- Appointment creation, reschedule, time-off conflict, cancellation and no-show work on MySQL.
- Anonymous users cannot read staff/customer data. Managers cannot modify owner settings/access.
- Session cookies are Secure/HttpOnly. Non-origin writes are rejected. Rate limits resolve the correct client IP behind your proxy.
- SMTP actually delivers confirmation, cancellation, reschedule and reminder emails to test mailboxes. Reminders queue in the 24 hours before a confirmed appointment; the API must remain running.
- Verify prices, timezone, daylight-saving behavior if changing from Tbilisi, public contact information and cancellation rules.
- Install and use the PWA on your target Android/iOS devices, including offline fallback.
- Test restore, monitor `/api/health`, and configure disk/database alerts.

No live MySQL host, SMTP account or public domain was supplied with the build. These deployment checks cannot be certified from SQLite tests alone.

## Operational limits

The dashboard returns at most 1,000 appointments per query (use date filters for daily operations), 100 recent email records and 250 audit entries. CSV appointment export reflects the current loaded/filter set. Long-term reporting or large-scale data exports should use the protected operator export. Reports are appointment-date based and not a general ledger. Email delivery is at-least-once: a crash after SMTP accepts a message but before recording delivery may cause a duplicate. For multiple API instances, implement distributed queue claims and shared request-rate limiting first.
