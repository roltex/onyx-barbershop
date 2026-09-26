import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { DateTime } from "luxon";
const dir = await mkdtemp(join(tmpdir(), "onyx-test-"));
process.env.SQLITE_FILENAME = join(dir, "test.sqlite");
process.env.DB_CLIENT = "sqlite";
process.env.PUBLIC_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
const { db, id, now } = await import("./db.js");
const { migrate } = await import("./migrate.js");
const { app } = await import("./server.js");
let server, base, cookie, csrf, serviceId, staffId, booking, slot, day;
const password = "Test-owner-password-42";
async function request(
  path,
  {
    method = "GET",
    body,
    auth = false,
    csrfToken = csrf,
    origin = "http://localhost:3000",
  } = {},
) {
  const headers = { origin };
  if (body) headers["content-type"] = "application/json";
  if (auth) {
    headers.cookie = cookie;
    headers["x-csrf-token"] = csrfToken || "";
  }
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  return { status: r.status, json, headers: r.headers };
}
before(async () => {
  await migrate();
  await db("users").insert({
    id: id(),
    name: "Owner",
    email: "owner@example.com",
    password: await bcrypt.hash(password, 4),
    role: "owner",
    active: true,
  });
  serviceId = id();
  staffId = id();
  await db("services").insert({
    id: serviceId,
    name: "Cut",
    category: "Barber",
    description: "Test",
    duration: 45,
    price: 4500,
    active: true,
  });
  await db("staff").insert({
    id: staffId,
    name: "Barber",
    title: "Barber",
    bio: "",
    color: "#123456",
    serviceIds: JSON.stringify([serviceId]),
    schedule: JSON.stringify(
      Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((d) => [d, { start: "10:00", end: "19:00" }]),
      ),
    ),
    active: true,
  });
  await db("settings").insert({
    id: "business",
    value: JSON.stringify({
      name: "Onyx",
      timezone: "Asia/Tbilisi",
      currency: "GEL",
      address: "Test",
      phone: "",
      email: "",
      instagram: "",
      leadMinutes: 60,
      horizonDays: 60,
      cancelHours: 12,
      notice: "",
    }),
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
  day = DateTime.now().setZone("Asia/Tbilisi").plus({ days: 2 }).toISODate();
});
after(async () => {
  await new Promise((r) => server.close(r));
  await db.destroy();
  await rm(dir, { recursive: true, force: true });
});
test("anonymous admin requests are denied; origin is enforced", async () => {
  assert.equal((await request("/admin/customers")).status, 401);
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        body: { email: "owner@example.com", password },
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
});
test("login uses an HttpOnly session and CSRF token", async () => {
  const r = await request("/auth/login", {
    method: "POST",
    body: { email: "owner@example.com", password },
  });
  assert.equal(r.status, 200);
  csrf = r.json.csrf;
  cookie = r.headers.get("set-cookie").split(";")[0];
  assert.match(r.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal(
    (
      await request("/admin/services", {
        auth: true,
        method: "POST",
        csrfToken: "wrong",
        body: {},
      })
    ).status,
    403,
  );
});
test("availability is timezone aware and enforces grid", async () => {
  const r = await request(
    `/public/availability?serviceId=${serviceId}&staffId=${staffId}&date=${day}`,
  );
  assert.equal(r.status, 200);
  assert.equal(r.json[0].label, "10:00");
  assert.match(r.json[0].start, /T06:00:00.000Z$/);
  slot = r.json[0];
});
test("parallel reservations cannot double-book a specialist", async () => {
  const input = {
    serviceId,
    staffId,
    start: slot.start,
    name: "Customer",
    email: "customer@example.com",
    phone: "+995555123456",
    consent: true,
  };
  const results = await Promise.all([
    request("/public/bookings", { method: "POST", body: input }),
    request("/public/bookings", {
      method: "POST",
      body: { ...input, email: "second@example.com" },
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  booking = results.find((r) => r.status === 201).json;
  assert.equal((await db("slots")).length, 3);
  assert.equal((await db("outbox")).length, 1);
});
test("public booking response contains no customer data or internal notes", async () => {
  const r = await request("/public/booking/" + booking.token);
  assert.equal(r.status, 200);
  assert.equal(r.json.email, undefined);
  assert.equal(r.json.customerId, undefined);
  assert.equal(r.json.tokenHash, undefined);
});
test("overlapping time off is rejected without discarding the appointment", async () => {
  const r = await request("/admin/timeoff", {
    auth: true,
    method: "POST",
    body: { staffId, start: slot.start, end: slot.end, reason: "Break" },
  });
  assert.equal(r.status, 409);
  assert.equal((await db("timeoff")).length, 0);
});
test("invalid service duration and negative inventory are rejected", async () => {
  assert.equal(
    (
      await request("/admin/services", {
        auth: true,
        method: "POST",
        body: {
          name: "Invalid",
          category: "Barber",
          description: "",
          duration: 20,
          price: 100,
          active: true,
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/admin/inventory", {
        auth: true,
        method: "POST",
        body: {
          name: "Oil",
          sku: "OIL",
          quantity: -1,
          threshold: 2,
          price: 100,
        },
      })
    ).status,
    400,
  );
});
test("cancellation releases slots and forbids repeated state changes", async () => {
  assert.equal(
    (
      await request("/public/booking/" + booking.token + "/cancel", {
        method: "POST",
        body: {},
      })
    ).status,
    200,
  );
  assert.equal((await db("slots")).length, 0);
  assert.equal(
    (
      await request("/public/booking/" + booking.token + "/cancel", {
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
});
test("payment recording is idempotent under concurrent requests", async () => {
  const r = await request("/public/bookings", {
    method: "POST",
    body: {
      serviceId,
      staffId,
      start: slot.start,
      name: "Paying Customer",
      email: "pay@example.com",
      phone: "55555555",
      consent: true,
    },
  });
  const results = await Promise.all(
    [1, 2].map(() =>
      request("/admin/bookings/" + r.json.id + "/payment", {
        auth: true,
        method: "POST",
        body: { method: "cash", tip: 500 },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await db("bookings").where({ id: r.json.id }).first()).tip,
    500,
  );
});
test("managers cannot change business settings or access owner audit", async () => {
  const r = await request("/admin/users", {
    auth: true,
    method: "POST",
    body: {
      name: "Manager",
      email: "manager@example.com",
      password,
      role: "manager",
    },
  });
  assert.equal(r.status, 200);
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: "manager@example.com", password },
  });
  const oldCookie = cookie,
    oldCsrf = csrf;
  cookie = login.headers.get("set-cookie").split(";")[0];
  csrf = login.json.csrf;
  assert.equal((await request("/admin/audit", { auth: true })).status, 403);
  assert.equal(
    (await request("/admin/settings", { auth: true, method: "PUT", body: {} }))
      .status,
    403,
  );
  cookie = oldCookie;
  csrf = oldCsrf;
});
test("failed rescheduling keeps the original slot and successful rescheduling moves it", async () => {
  const b = await db("bookings").where({ status: "confirmed" }).first();
  const oldStart = b.start;
  const failed = await request("/admin/bookings/" + b.id + "/reschedule", {
    auth: true,
    method: "POST",
    body: { start: "2000-01-01T10:00:00.000Z" },
  });
  assert.equal(failed.status, 409);
  assert.equal((await db("slots").where({ bookingId: b.id })).length, 3);
  assert.equal(
    (await db("bookings").where({ id: b.id }).first()).start,
    oldStart,
  );
  const choices = await request(
    `/public/availability?serviceId=${serviceId}&staffId=${staffId}&date=${day}`,
  );
  const moved = await request("/admin/bookings/" + b.id + "/reschedule", {
    auth: true,
    method: "POST",
    body: { start: choices.json.at(-1).start },
  });
  assert.equal(moved.status, 200);
  assert.notEqual(
    (await db("bookings").where({ id: b.id }).first()).start,
    oldStart,
  );
  assert.equal((await db("slots").where({ bookingId: b.id })).length, 3);
});
test("refund can only be recorded once", async () => {
  const b = await db("bookings").where({ paymentStatus: "paid" }).first();
  assert.equal(
    (
      await request("/admin/bookings/" + b.id + "/refund", {
        auth: true,
        method: "POST",
        body: {},
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/admin/bookings/" + b.id + "/refund", {
        auth: true,
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
});
test("reminder generation queues each confirmed appointment once", async () => {
  const { queueReminders } = await import("./server.js");
  const b = await db("bookings").where({ status: "confirmed" }).first();
  await db("bookings")
    .where({ id: b.id })
    .update({
      start: new Date(Date.now() + 3600000).toISOString(),
      reminderQueued: false,
    });
  await queueReminders();
  await queueReminders();
  const reminders = await db("outbox").where({
    bookingId: b.id,
    kind: "reminder",
  });
  assert.equal(reminders.length, 1);
});
test("logout revokes the database session", async () => {
  assert.equal(
    (await request("/auth/logout", { auth: true, method: "POST", body: {} }))
      .status,
    200,
  );
  assert.equal((await request("/auth/me", { auth: true })).status, 401);
});
