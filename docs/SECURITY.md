# Security implementation and deployment responsibilities

Implemented controls:

- bcrypt password hashing, generated bootstrap passwords, minimum 12-character new passwords.
- Random opaque sessions, hashed session identifiers in DB, HttpOnly/SameSite cookies, Secure cookies in production, eight-hour expiry.
- Session revocation on logout, account disable, password recovery and other-device password changes.
- Origin validation for writes and synchronizer CSRF tokens for authenticated mutations.
- Server-side owner/manager permissions; public endpoints omit customer identity and internal notes.
- Zod validation and parameterized Knex queries. No client-selected SQL identifiers.
- Rate limits for general API traffic, login and public booking; JSON body-size limit.
- Reservation transactions, unique occupied-slot keys and MySQL specialist row locks.
- Privacy-friendly service worker: never caches API data, login or dashboard.
- Security response headers and no-store API responses; no third-party tracking scripts or runtime font/image CDNs.
- CSV spreadsheet-formula escaping, random private booking tokens stored as hashes.

Important limits:

- Private appointment links are bearer secrets. Anyone holding a link can view/cancel that booking within the configured policy. Do not log query strings or share links publicly.
- Confirmation email bodies contain their private management link. Protect the database and backup storage, set a retention policy for the outbox, and avoid placing it in support exports.
- The app is single-location and not a multi-tenant security boundary.
- No MFA or customer email verification is included. Public booking abuse requires monitoring; add CAPTCHA/provider verification if needed by your traffic profile.
- Application-level audit rows are not an immutable, tamper-proof security log. Send operational/security logs to your own protected service if needed.
- Run under HTTPS, restrict network access to the API/database, use least-privilege accounts, patch dependencies and monitor errors.
- No card data is collected; payment/refund actions only record transactions performed outside this app.
- Privacy/legal text is a launch template and must be approved for the actual salon and jurisdiction. No compliance certification is implied.

This implementation has functional tests, not an independent penetration test or formal security audit.
