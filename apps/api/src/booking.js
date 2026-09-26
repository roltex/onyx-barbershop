import { DateTime } from "luxon";
import { randomBytes, createHash } from "node:crypto";
import { db, id, now, setting } from "./db.js";
export const hash = (v) => createHash("sha256").update(v).digest("hex");
export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
export function slotTimes(start, end) {
  const a = [];
  for (let t = Date.parse(start); t < Date.parse(end); t += 900000)
    a.push(new Date(t).toISOString());
  return a;
}
export async function available(
  serviceId,
  staffId,
  date,
  conn = db,
  durationOverride,
) {
  const s = await setting(conn);
  const service = await conn("services")
    .where({ id: serviceId, active: true })
    .first();
  const staff = await conn("staff")
    .where({ id: staffId, active: true })
    .first();
  if (!service || !staff || !JSON.parse(staff.serviceIds).includes(serviceId))
    return [];
  if (durationOverride) service.duration = durationOverride;
  const day = DateTime.fromISO(date, { zone: s.timezone });
  if (!day.isValid || day.toISODate() !== date) return [];
  const today = DateTime.now().setZone(s.timezone);
  if (day.startOf("day") > today.plus({ days: s.horizonDays }).endOf("day"))
    return [];
  const hours = JSON.parse(staff.schedule)[day.weekday];
  if (!hours) return [];
  const begin = DateTime.fromISO(`${date}T${hours.start}`, {
    zone: s.timezone,
  });
  const finish = DateTime.fromISO(`${date}T${hours.end}`, { zone: s.timezone });
  const occupied = await conn("slots")
    .where({ staffId })
    .where("start", ">=", day.startOf("day").toUTC().toISO())
    .where("start", "<", day.endOf("day").toUTC().toISO());
  const used = new Set(occupied.map((x) => x.start));
  const off = await conn("timeoff").where({ staffId });
  const result = [];
  for (
    let t = begin;
    t.plus({ minutes: service.duration }) <= finish;
    t = t.plus({ minutes: 15 })
  ) {
    const end = t.plus({ minutes: service.duration });
    const startISO = t.toUTC().toISO(),
      endISO = end.toUTC().toISO();
    if (t < today.plus({ minutes: s.leadMinutes })) continue;
    if (
      off.some(
        (o) =>
          Date.parse(o.start) < end.toMillis() &&
          Date.parse(o.end) > t.toMillis(),
      )
    )
      continue;
    if (slotTimes(startISO, endISO).some((x) => used.has(x))) continue;
    result.push({ start: startISO, end: endISO, label: t.toFormat("HH:mm") });
  }
  return result;
}
export async function createBooking(input, actor = "public") {
  const settings = await setting();
  const date = DateTime.fromISO(input.start)
    .setZone(settings.timezone)
    .toISODate();
  const token = randomBytes(32).toString("hex");
  try {
    return await db.transaction(async (trx) => {
      // A per-staff row lock also serializes schedule/time-off changes in MySQL.
      if (process.env.DB_CLIENT === "mysql")
        await trx("staff").where({ id: input.staffId }).forUpdate().first();
      const slots = await available(input.serviceId, input.staffId, date, trx);
      const chosen = slots.find(
        (x) => x.start === new Date(input.start).toISOString(),
      );
      if (!chosen)
        fail("This time is no longer available. Please choose another.", 409);
      const service = await trx("services")
        .where({ id: input.serviceId })
        .first();
      let customer = await trx("customers")
        .where({ email: input.email.toLowerCase() })
        .first();
      if (!customer) {
        customer = {
          id: id(),
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          notes: "",
          marketing: input.marketing || false,
          createdAt: now(),
        };
        await trx("customers").insert(customer);
      }
      const booking = {
        id: id(),
        reference: "OX-" + randomBytes(4).toString("hex").toUpperCase(),
        customerId: customer.id,
        staffId: input.staffId,
        serviceId: input.serviceId,
        serviceName: service.name,
        start: chosen.start,
        end: chosen.end,
        price: service.price,
        status: "confirmed",
        paymentStatus: "unpaid",
        tip: 0,
        notes: input.notes || "",
        tokenHash: hash(token),
        createdAt: now(),
      };
      await trx("bookings").insert(booking);
      await trx("slots").insert(
        slotTimes(booking.start, booking.end).map((start) => ({
          staffId: booking.staffId,
          start,
          bookingId: booking.id,
        })),
      );
      await trx("audit").insert({
        id: id(),
        actor,
        action: "booking.created",
        entityId: booking.id,
        createdAt: now(),
      });
      await trx("outbox").insert({
        id: id(),
        bookingId: booking.id,
        kind: "confirmation",
        to: input.email,
        subject: `Your Onyx appointment · ${booking.reference}`,
        body: `Hi ${input.name},\nYour ${service.name} is confirmed for ${DateTime.fromISO(booking.start).setZone(settings.timezone).toFormat("dd LLL yyyy, HH:mm")} (${settings.timezone}).\nManage your appointment: ${process.env.PUBLIC_ORIGIN}/book?token=${token}\nReference: ${booking.reference}`,
        status: "queued",
        attempts: 0,
        createdAt: now(),
      });
      return {
        id: booking.id,
        reference: booking.reference,
        start: booking.start,
        end: booking.end,
        price: booking.price,
        serviceName: booking.serviceName,
        token,
      };
    });
  } catch (e) {
    if (/unique|duplicate|SQLITE_BUSY|deadlock/i.test(e.message))
      fail(
        "This appointment could not be reserved. Refresh availability and try again.",
        409,
      );
    throw e;
  }
}
export async function changeStatus(bookingId, status, actor) {
  return db.transaction(async (trx) => {
    let query = trx("bookings").where({ id: bookingId });
    if (process.env.DB_CLIENT === "mysql") query = query.forUpdate();
    const b = await query.first();
    if (!b) fail("Appointment not found", 404);
    if (!["confirmed"].includes(b.status))
      fail("Only confirmed appointments can change status.", 409);
    await trx("bookings").where({ id: bookingId }).update({ status });
    if (status !== "completed")
      await trx("slots").where({ bookingId }).delete();
    await trx("outbox")
      .where({ bookingId, kind: "reminder", status: "queued" })
      .delete();
    if (status === "cancelled") {
      const customer = await trx("customers")
        .where({ id: b.customerId })
        .first();
      await trx("outbox").insert({
        id: id(),
        bookingId,
        kind: "cancellation",
        to: customer.email,
        subject: `Appointment cancelled · ${b.reference}`,
        body: `Your ${b.serviceName} appointment has been cancelled. Contact the salon if you need help booking another visit.`,
        status: "queued",
        attempts: 0,
        createdAt: now(),
      });
    }
    await trx("audit").insert({
      id: id(),
      actor,
      action: `booking.${status}`,
      entityId: bookingId,
      createdAt: now(),
    });
    return { ...b, status };
  });
}

export async function rescheduleBooking(bookingId, start, actor) {
  const original = await db("bookings").where({ id: bookingId }).first();
  if (!original) fail("Appointment not found", 404);
  try {
    return await db.transaction(async (trx) => {
      if (process.env.DB_CLIENT === "mysql")
        await trx("staff").where({ id: original.staffId }).forUpdate().first();
      let q = trx("bookings").where({ id: bookingId });
      if (process.env.DB_CLIENT === "mysql") q = q.forUpdate();
      const b = await q.first();
      if (b.status !== "confirmed")
        fail("Only confirmed appointments can be rescheduled.", 409);
      await trx("slots").where({ bookingId }).delete();
      const s = await setting(trx);
      const date = DateTime.fromISO(start).setZone(s.timezone).toISODate();
      const duration = (Date.parse(b.end) - Date.parse(b.start)) / 60000;
      const options = await available(
        b.serviceId,
        b.staffId,
        date,
        trx,
        duration,
      );
      const slot = options.find(
        (o) => o.start === new Date(start).toISOString(),
      );
      if (!slot)
        fail(
          "The new time is not available. Your original appointment is unchanged.",
          409,
        );
      await trx("bookings")
        .where({ id: bookingId })
        .update({ start: slot.start, end: slot.end });
      await trx("slots").insert(
        slotTimes(slot.start, slot.end).map((time) => ({
          staffId: b.staffId,
          start: time,
          bookingId,
        })),
      );
      await trx("outbox")
        .where({ bookingId, kind: "reminder", status: "queued" })
        .delete();
      await trx("bookings")
        .where({ id: bookingId })
        .update({ reminderQueued: false });
      const customer = await trx("customers")
        .where({ id: b.customerId })
        .first();
      await trx("outbox").insert({
        id: id(),
        bookingId,
        kind: "change",
        to: customer.email,
        subject: `Appointment rescheduled · ${b.reference}`,
        body: `Your ${b.serviceName} has been moved to ${DateTime.fromISO(slot.start).setZone(s.timezone).toFormat("dd LLL yyyy, HH:mm")} (${s.timezone}).\nYour original private appointment link still works.`,
        status: "queued",
        attempts: 0,
        createdAt: now(),
      });
      await trx("audit").insert({
        id: id(),
        actor,
        action: "booking.rescheduled",
        entityId: bookingId,
        createdAt: now(),
      });
      return { ok: true };
    });
  } catch (e) {
    if (/unique|duplicate|SQLITE_BUSY|deadlock/i.test(e.message))
      fail(
        "The new time could not be reserved. Your original appointment is unchanged.",
        409,
      );
    throw e;
  }
}
