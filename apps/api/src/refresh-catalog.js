/** Refresh demo services + staff without wiping the owner account. */
import { db, id } from "./db.js";

const services = [
  [
    "Haircut",
    "Barber",
    "Precision cuts tailored to your face shape and style.",
    45,
    0,
  ],
  [
    "Beard Trim",
    "Barber",
    "Expert shaping and grooming for the perfect beard.",
    30,
    0,
  ],
  [
    "Razor Shave",
    "Barber",
    "Traditional hot towel shave with premium products.",
    30,
    0,
  ],
  [
    "Premium Package",
    "Barber",
    "Complete grooming experience — haircut, beard & more.",
    75,
    0,
  ],
  [
    "Manicure",
    "Nail",
    "Clean shaping, care and a polished finish for your hands.",
    45,
    0,
  ],
  [
    "Pedicure",
    "Nail",
    "Relaxing foot care with shaping, polish and finish.",
    60,
    0,
  ],
];

await db("bookings").del();
await db("staff").del();
await db("services").del();

const rows = services.map(([name, category, description, duration, price]) => ({
  id: id(),
  name,
  category,
  description,
  duration,
  price,
  active: true,
}));
await db("services").insert(rows);

const barberServices = rows.filter((s) => s.category === "Barber");
const nailServices = rows.filter((s) => s.category === "Nail");
const schedule = JSON.stringify({
  1: { start: "10:00", end: "19:00" },
  2: { start: "10:00", end: "19:00" },
  3: { start: "10:00", end: "19:00" },
  4: { start: "10:00", end: "19:00" },
  5: { start: "10:00", end: "19:00" },
  6: { start: "10:00", end: "18:00" },
});

await db("staff").insert(
  [
    ["Tamo", "Barber", "#d8a75f", "Sharp cuts and classic barbering.", barberServices],
    ["Misho", "Barber", "#c59b76", "Fades, beard work and careful finish.", barberServices],
    ["Ani", "Barber", "#e0c48a", "Modern styles with a precise touch.", barberServices],
    [
      "Mako",
      "Nail specialist",
      "#f1d39b",
      "Manicure and pedicure with premium care.",
      nailServices,
    ],
  ].map(([name, title, color, bio, s]) => ({
    id: id(),
    name,
    title,
    color,
    bio,
    serviceIds: JSON.stringify(s.map((x) => x.id)),
    schedule,
    active: true,
  })),
);

const settings = await db("settings").where({ id: "business" }).first();
if (settings) {
  const value = JSON.parse(settings.value);
  value.notice =
    "Sample team and services. Update these before accepting real bookings.";
  value.address = value.address || "15 Rustaveli Ave, Tbilisi";
  await db("settings")
    .where({ id: "business" })
    .update({ value: JSON.stringify(value) });
}

console.log("Catalog refreshed: 6 services, staff Tamo/Misho/Ani/Mako.");
await db.destroy();
