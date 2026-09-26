import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
import { db, id, now, setting } from "./db.js";
import {
  available,
  createBooking,
  changeStatus,
  rescheduleBooking,
  hash,
  fail,
} from "./booking.js";
export const app = express();
const production = process.env.NODE_ENV === "production";
const origin = process.env.PUBLIC_ORIGIN || "http://localhost:3000";
if (production && !origin.startsWith("https://"))
  throw new Error("Production PUBLIC_ORIGIN must use HTTPS.");
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 60000, limit: 180 }));
app.use("/api", async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("origin") !== origin
  )
    return res.status(403).json({ error: "Request origin is not allowed." });
  if (req.cookies.onyx_session) {
    const session = await db("sessions")
      .where({ id: hash(req.cookies.onyx_session) })
      .where("expires", ">", Date.now())
      .first();
    if (session) {
      req.session = session;
      req.user = await db("users")
        .select("id", "name", "email", "role")
        .where({ id: session.userId, active: true })
        .first();
    }
  }
  next();
});
const auth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Sign in to continue." });
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.get("x-csrf-token") !== req.session.csrf
  )
    return res
      .status(403)
      .json({ error: "Session verification failed. Reload and try again." });
  next();
};
const owner = (req, res, next) =>
  req.user.role === "owner"
    ? next()
    : res.status(403).json({ error: "Owner access required." });
const audit = (req, action, entityId) =>
  db("audit").insert({
    id: id(),
    actor: req.user?.email || "public",
    action,
    entityId,
    createdAt: now(),
  });
const uuid = z.string().uuid();
const short = z.string().trim().min(1).max(150);
const email = z
  .email()
  .max(200)
  .transform((x) => x.toLowerCase());
const money = z.number().int().min(0).max(10000000);
const bookingSchema = z.object({
  serviceId: uuid,
  staffId: uuid,
  start: z.iso.datetime(),
  name: short,
  email,
  phone: z.string().trim().min(6).max(30),
  notes: z.string().max(1000).optional(),
  marketing: z.boolean().optional(),
  consent: z.literal(true),
});
app.get("/api/health", async (req, res) => {
  await db.raw("select 1");
  res.json({ status: "ok" });
});
app.get("/api/public/catalog", async (req, res) =>
  res.json({
    settings: await setting(),
    services: await db("services").where({ active: true }),
    staff: (await db("staff").where({ active: true })).map((s) => ({
      ...s,
      serviceIds: JSON.parse(s.serviceIds),
      schedule: JSON.parse(s.schedule),
    })),
  }),
);
app.get("/api/public/availability", async (req, res) => {
  const q = z
    .object({
      serviceId: uuid,
      staffId: uuid,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .parse(req.query);
  res.json(await available(q.serviceId, q.staffId, q.date));
});
app.post(
  "/api/public/bookings",
  rateLimit({ windowMs: 3600000, limit: 20 }),
  async (req, res) =>
    res.status(201).json(await createBooking(bookingSchema.parse(req.body))),
);
app.get("/api/public/booking/:token", async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.token))
    fail("Invalid booking link", 404);
  const b = await db("bookings")
    .where({ tokenHash: hash(req.params.token) })
    .first();
  if (!b) fail("Booking not found", 404);
  const staff = await db("staff").where({ id: b.staffId }).first();
  res.json({
    reference: b.reference,
    serviceName: b.serviceName,
    start: b.start,
    end: b.end,
    status: b.status,
    staffName: staff.name,
    price: b.price,
  });
});
app.post("/api/public/booking/:token/cancel", async (req, res) => {
  const b = await db("bookings")
    .where({ tokenHash: hash(req.params.token) })
    .first();
  if (!b) fail("Booking not found", 404);
  const s = await setting();
  if (Date.parse(b.start) - Date.now() < s.cancelHours * 3600000)
    fail("Online cancellation has closed. Please contact the salon.");
  await changeStatus(b.id, "cancelled", "customer");
  res.json({ ok: true });
});
app.post(
  "/api/auth/login",
  rateLimit({ windowMs: 900000, limit: 10 }),
  async (req, res) => {
    const body = z
      .object({ email, password: z.string().max(200) })
      .parse(req.body);
    const user = await db("users")
      .where({ email: body.email, active: true })
      .first();
    if (!user || !(await bcrypt.compare(body.password, user.password)))
      fail("Email or password is incorrect.", 401);
    const token = randomBytes(32).toString("hex");
    const csrf = randomBytes(32).toString("hex");
    await db("sessions").where("expires", "<", Date.now()).delete();
    await db("sessions").insert({
      id: hash(token),
      userId: user.id,
      csrf,
      expires: Date.now() + 8 * 3600000,
    });
    res.cookie("onyx_session", token, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      maxAge: 8 * 3600000,
      path: "/",
    });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrf,
    });
  },
);
app.get("/api/auth/me", auth, (req, res) =>
  res.json({ user: req.user, csrf: req.session.csrf }),
);
app.post("/api/auth/logout", auth, async (req, res) => {
  await db("sessions").where({ id: req.session.id }).delete();
  res.clearCookie("onyx_session", { path: "/" });
  res.json({ ok: true });
});
app.post("/api/auth/password", auth, async (req, res) => {
  const b = z
    .object({ current: z.string(), password: z.string().min(12).max(128) })
    .parse(req.body);
  const user = await db("users").where({ id: req.user.id }).first();
  if (!(await bcrypt.compare(b.current, user.password)))
    fail("Current password is incorrect.");
  await db.transaction(async (trx) => {
    await trx("users")
      .where({ id: user.id })
      .update({ password: await bcrypt.hash(b.password, 12) });
    await trx("sessions")
      .where({ userId: user.id })
      .whereNot({ id: req.session.id })
      .delete();
  });
  res.json({ ok: true });
});
app.use("/api/admin", auth);
app.get("/api/admin/overview", async (req, res) => {
  const s = await setting();
  const start = DateTime.now()
    .setZone(s.timezone)
    .startOf("day")
    .toUTC()
    .toISO();
  const end = DateTime.now().setZone(s.timezone).endOf("day").toUTC().toISO();
  const bookings = await db("bookings").whereBetween("start", [start, end]);
  const all = await db("bookings").whereBetween("start", [
    DateTime.now().minus({ days: 30 }).toUTC().toISO(),
    end,
  ]);
  res.json({
    today: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    revenue: bookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((a, b) => a + b.price + b.tip, 0),
    customers: (await db("customers").count("* as n").first()).n,
    month: all,
    lowStock: await db("inventory").whereColumn("quantity", "<=", "threshold"),
  });
});
app.get("/api/admin/bookings", async (req, res) => {
  let q = db("bookings as b")
    .join("customers as c", "c.id", "b.customerId")
    .join("staff as s", "s.id", "b.staffId")
    .select(
      "b.id",
      "b.reference",
      "b.start",
      "b.end",
      "b.serviceName",
      "b.price",
      "b.status",
      "b.paymentStatus",
      "b.paymentMethod",
      "b.tip",
      "b.notes",
      "b.staffId",
      "b.serviceId",
      "c.name as customerName",
      "c.phone",
      "c.email",
      "s.name as staffName",
      "s.color",
    );
  if (req.query.date) {
    const settings = await setting();
    const d = DateTime.fromISO(String(req.query.date), {
      zone: settings.timezone,
    });
    if (!d.isValid) fail("Invalid date");
    q = q.whereBetween("b.start", [
      d.startOf("day").toUTC().toISO(),
      d.endOf("day").toUTC().toISO(),
    ]);
  }
  res.json(await q.orderBy("b.start", "desc").limit(1000));
});
app.post("/api/admin/bookings", async (req, res) =>
  res
    .status(201)
    .json(await createBooking(bookingSchema.parse(req.body), req.user.email)),
);
app.patch("/api/admin/bookings/:id/status", async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["completed", "cancelled", "no_show"]) })
    .parse(req.body);
  await changeStatus(req.params.id, status, req.user.email);
  res.json({ ok: true });
});
app.post("/api/admin/bookings/:id/reschedule", async (req, res) => {
  const { start } = z.object({ start: z.iso.datetime() }).parse(req.body);
  res.json(await rescheduleBooking(req.params.id, start, req.user.email));
});
app.post("/api/admin/bookings/:id/refund", owner, async (req, res) => {
  const count = await db("bookings")
    .where({ id: req.params.id, paymentStatus: "paid" })
    .update({ paymentStatus: "refunded" });
  if (!count) fail("No recorded payment to refund.", 409);
  await audit(req, "payment.refunded", req.params.id);
  res.json({ ok: true });
});
app.post("/api/admin/bookings/:id/payment", async (req, res) => {
  const b = z
    .object({ method: z.enum(["cash", "card", "bank"]), tip: money })
    .parse(req.body);
  await db.transaction(async (trx) => {
    const count = await trx("bookings")
      .where({ id: req.params.id, paymentStatus: "unpaid" })
      .whereIn("status", ["confirmed", "completed"])
      .update({ paymentStatus: "paid", paymentMethod: b.method, tip: b.tip });
    if (!count) fail("Appointment is already paid or cannot be charged.", 409);
    await trx("audit").insert({
      id: id(),
      actor: req.user.email,
      action: "payment.recorded",
      entityId: req.params.id,
      createdAt: now(),
    });
  });
  res.json({ ok: true });
});
const schemas = {
  services: z.object({
    name: short,
    category: z.enum(["Barber", "Beauty", "Nail"]),
    description: z.string().max(1000),
    duration: z
      .number()
      .int()
      .min(15)
      .max(240)
      .refine((v) => v % 15 === 0),
    price: money,
    active: z.boolean(),
  }),
  customers: z.object({
    name: short,
    email,
    phone: z.string().max(30),
    notes: z.string().max(3000),
    marketing: z.boolean(),
  }),
  inventory: z.object({
    name: short,
    sku: short,
    quantity: z.number().int().min(0).max(100000),
    threshold: z.number().int().min(0).max(100000),
    price: money,
  }),
  staff: z.object({
    name: short,
    title: short,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bio: z.string().max(1000),
    serviceIds: z.array(uuid).min(1),
    schedule: z.record(
      z.string().regex(/^[1-7]$/),
      z
        .object({
          start: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/),
          end: z.string().regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/),
        })
        .refine((v) => v.start < v.end),
    ),
    active: z.boolean(),
  }),
};
for (const [table, schema] of Object.entries(schemas)) {
  app.get(`/api/admin/${table}`, async (req, res) => {
    const rows = await db(table).orderBy("name");
    res.json(
      rows.map((r) =>
        table === "staff"
          ? {
              ...r,
              active: !!r.active,
              serviceIds: JSON.parse(r.serviceIds),
              schedule: JSON.parse(r.schedule),
            }
          : {
              ...r,
              ...("active" in r ? { active: !!r.active } : {}),
              ...("marketing" in r ? { marketing: !!r.marketing } : {}),
            },
      ),
    );
  });
  for (const method of ["post", "put"])
    app[method](
      `/api/admin/${table}${method === "put" ? "/:id" : ""}`,
      async (req, res) => {
        let b = schema.parse(req.body);
        if (table === "staff") {
          const valid = await db("services").whereIn("id", b.serviceIds);
          if (valid.length !== b.serviceIds.length) fail("Unknown service");
          b = {
            ...b,
            serviceIds: JSON.stringify(b.serviceIds),
            schedule: JSON.stringify(b.schedule),
          };
        }
        const entityId = method === "post" ? id() : uuid.parse(req.params.id);
        await db.transaction(async (trx) => {
          if (method === "post")
            await trx(table).insert({
              id: entityId,
              ...b,
              ...(table === "customers" ? { createdAt: now() } : {}),
            });
          else {
            if (table === "staff" && process.env.DB_CLIENT === "mysql")
              await trx("staff").where({ id: entityId }).forUpdate().first();
            const count = await trx(table).where({ id: entityId }).update(b);
            if (!count) fail("Record not found", 404);
          }
          await trx("audit").insert({
            id: id(),
            actor: req.user.email,
            action: `${table}.${method === "post" ? "created" : "updated"}`,
            entityId,
            createdAt: now(),
          });
        });
        res.json({ id: entityId });
      },
    );
}
app.get("/api/admin/customers/:id/history", async (req, res) =>
  res.json(
    await db("bookings")
      .select(
        "reference",
        "serviceName",
        "start",
        "status",
        "price",
        "paymentStatus",
      )
      .where({ customerId: req.params.id })
      .orderBy("start", "desc"),
  ),
);
app.get("/api/admin/timeoff", async (req, res) =>
  res.json(await db("timeoff").orderBy("start", "desc")),
);
app.post("/api/admin/timeoff", async (req, res) => {
  const b = z
    .object({
      staffId: uuid,
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      reason: short,
    })
    .refine((b) => Date.parse(b.end) > Date.parse(b.start))
    .parse(req.body);
  await db.transaction(async (trx) => {
    let staff = trx("staff").where({ id: b.staffId });
    if (process.env.DB_CLIENT === "mysql") staff = staff.forUpdate();
    if (!(await staff.first())) fail("Staff member not found");
    if (
      await trx("bookings")
        .where({ staffId: b.staffId, status: "confirmed" })
        .where("start", "<", b.end)
        .where("end", ">", b.start)
        .first()
    )
      fail(
        "There are confirmed appointments in this period. Cancel them first.",
        409,
      );
    await trx("timeoff").insert({ id: id(), ...b });
  });
  await audit(req, "timeoff.created", b.staffId);
  res.json({ ok: true });
});
app.delete("/api/admin/timeoff/:id", async (req, res) => {
  await db("timeoff").where({ id: req.params.id }).delete();
  await audit(req, "timeoff.deleted", req.params.id);
  res.json({ ok: true });
});
app.get("/api/admin/settings", async (req, res) => res.json(await setting()));
app.put("/api/admin/settings", owner, async (req, res) => {
  const b = z
    .object({
      name: short,
      timezone: z.string().refine((s) => DateTime.now().setZone(s).isValid),
      currency: z.enum(["GEL", "USD", "EUR", "GBP"]),
      address: z.string().max(300),
      phone: z.string().max(40),
      email: z.union([z.email(), z.literal("")]),
      instagram: z.union([
        z.url().refine((v) => v.startsWith("https://")),
        z.literal(""),
      ]),
      leadMinutes: z.number().int().min(15).max(10080),
      horizonDays: z.number().int().min(1).max(365),
      cancelHours: z.number().int().min(0).max(168),
      notice: z.string().max(500),
    })
    .parse(req.body);
  const old = await setting();
  if (old.currency !== b.currency && (await db("bookings").first()))
    fail(
      "Currency is locked once appointments exist, so historical prices remain accurate.",
    );
  await db("settings")
    .where({ id: "business" })
    .update({ value: JSON.stringify(b) });
  await audit(req, "settings.updated", "business");
  res.json({ ok: true });
});
app.get("/api/admin/users", owner, async (req, res) =>
  res.json(await db("users").select("id", "name", "email", "role", "active")),
);
app.post("/api/admin/users", owner, async (req, res) => {
  const b = z
    .object({
      name: short,
      email,
      password: z.string().min(12).max(128),
      role: z.enum(["owner", "manager"]),
    })
    .parse(req.body);
  const entityId = id();
  await db("users").insert({
    id: entityId,
    ...b,
    password: await bcrypt.hash(b.password, 12),
    active: true,
  });
  await audit(req, "user.created", entityId);
  res.json({ id: entityId });
});
app.patch("/api/admin/users/:id", owner, async (req, res) => {
  const b = z.object({ active: z.boolean() }).parse(req.body);
  if (req.params.id === req.user.id)
    fail("You cannot disable your own account.");
  await db("users").where({ id: req.params.id }).update(b);
  await db("sessions").where({ userId: req.params.id }).delete();
  await audit(req, "user.access_changed", req.params.id);
  res.json({ ok: true });
});
app.get("/api/admin/audit", owner, async (req, res) =>
  res.json(await db("audit").orderBy("createdAt", "desc").limit(250)),
);
app.get("/api/admin/outbox", async (req, res) =>
  res.json(
    await db("outbox")
      .select(
        "id",
        "to",
        "subject",
        "status",
        "attempts",
        "createdAt",
        "sentAt",
        "error",
      )
      .orderBy("createdAt", "desc")
      .limit(100),
  ),
);
app.post("/api/admin/outbox/:id/retry", async (req, res) => {
  await db("outbox")
    .where({ id: req.params.id, status: "failed" })
    .update({ status: "queued", attempts: 0 });
  res.json({ ok: true });
});
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
  if (/unique|duplicate/i.test(err.message))
    return res
      .status(409)
      .json({ error: "A record with these details already exists." });
  console.error(err.status ? err.message : err);
  res
    .status(err.status || 500)
    .json({
      error: err.status
        ? err.message
        : "Something went wrong. Please try again.",
    });
});
export async function queueReminders() {
  const upcoming = await db("bookings")
    .where({ status: "confirmed", reminderQueued: false })
    .whereBetween("start", [
      now(),
      new Date(Date.now() + 86400000).toISOString(),
    ]);
  const s = await setting();
  for (const b of upcoming) {
    await db.transaction(async (trx) => {
      const changed = await trx("bookings")
        .where({ id: b.id, status: "confirmed", reminderQueued: false })
        .update({ reminderQueued: true });
      if (!changed) return;
      const c = await trx("customers").where({ id: b.customerId }).first();
      await trx("outbox").insert({
        id: id(),
        bookingId: b.id,
        kind: "reminder",
        to: c.email,
        subject: `Appointment reminder · ${b.reference}`,
        body: `A reminder of your ${b.serviceName} on ${DateTime.fromISO(b.start).setZone(s.timezone).toFormat("dd LLL yyyy, HH:mm")} (${s.timezone}). We look forward to seeing you.`,
        status: "queued",
        attempts: 0,
        createdAt: now(),
      });
    });
  }
}
let sending = false;
export async function sendMail() {
  if (sending || !process.env.SMTP_HOST) return;
  sending = true;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    for (const m of await db("outbox").where({ status: "queued" }).limit(10)) {
      try {
        await transport.sendMail({
          from: process.env.MAIL_FROM,
          to: m.to,
          subject: m.subject,
          text: m.body,
        });
        await db("outbox")
          .where({ id: m.id })
          .update({
            status: "sent",
            sentAt: now(),
            attempts: m.attempts + 1,
            error: null,
          });
      } catch (e) {
        await db("outbox")
          .where({ id: m.id })
          .update({
            status: m.attempts >= 2 ? "failed" : "queued",
            attempts: m.attempts + 1,
            error: "Delivery failed. Check SMTP configuration.",
          });
      }
    }
  } finally {
    sending = false;
  }
}
if (process.argv[1]?.endsWith("server.js")) {
  const server = app.listen(
    Number(process.env.PORT || 4000),
    process.env.HOST || "127.0.0.1",
    () => console.log("Onyx API listening on " + (process.env.PORT || 4000)),
  );
  const timer = setInterval(
    () => queueReminders().then(sendMail).catch(console.error),
    30000,
  );
  const close = () => {
    clearInterval(timer);
    server.close(async () => {
      await db.destroy();
      process.exit(0);
    });
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
