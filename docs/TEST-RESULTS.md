# Verification report

Verified in this build on 26 September 2026 with Node.js 24, SQLite and headless Chromium.

## Passed

- `npm run build`: optimized Next.js production build and TypeScript validation.
- API integration suite: 14 passing tests using an isolated temporary SQLite database.
  - anonymous access denied and cross-origin writes rejected;
  - HttpOnly sessions and CSRF validation;
  - timezone-aware availability;
  - concurrent double-book prevention;
  - public appointment response omits customer identity;
  - time off overlapping a confirmed reservation is rejected;
  - invalid duration and stock values rejected;
  - cancellation releases slots and rejects repeat changes;
  - concurrent payment recording records only once;
  - manager/owner access boundaries;
  - failed reschedule keeps original reservation; successful reschedule moves slots;
  - refund can be recorded only once;
  - reminders are queued only once;
  - logout revokes session.
- Browser journey: select service/specialist/date/time, enter customer details and consent, confirm booking.
- Browser staff journey: login, open all dashboard modules, create a customer successfully.
- Desktop 1440×1000, tablet 768×1024 and mobile 390×844 checks: landing/dashboard page-width overflow checks and screenshot inspection. Data tables scroll inside their panels on narrow screens.
- PWA service worker: registration in production build and offline navigation fallback.
- SQLite online backup created successfully; logical export restored into a fresh migrated SQLite database.
- `npm audit --omit=dev`: zero reported known vulnerabilities at verification time. This is not proof of absence of vulnerabilities.

## Not verified in this environment

- Live MySQL execution, production concurrent load or infrastructure failover.
- Actual SMTP delivery, mailbox reputation and provider limits.
- Actual Android/iOS installation and native-device behavior.
- Independent security audit, penetration testing or complete accessibility certification.
- Windows/macOS local installation; scripts use cross-platform npm/Node conventions.

## Reproduce

```bash
npm ci
npm run setup
npm test
npm run build
npm start
```

In a second terminal, against a **local demo instance only**:

```bash
npx playwright install chromium
```

Set `TEST_PASSWORD` to the owner password printed by setup, then run:

```bash
node scripts/browser-check.mjs
```

The browser test creates real records in the selected local database. It assumes the sample services and staff from setup. `TEST_BASE_URL` defaults to `http://localhost:3000`; `TEST_EMAIL` defaults to `manager@onyx.local`. Optional `CHROMIUM_EXECUTABLE` selects an installed browser. Test screenshots are written to `test-results/`.
