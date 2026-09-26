import { db, id } from "./db.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
if (await db("users").first()) {
  console.log("Seed skipped: existing installation.");
  await db.destroy();
  process.exit(0);
}
if (process.env.NODE_ENV === "production")
  throw new Error(
    "Demo seeding is disabled in production. Initialize in a controlled environment, remove demo data, then deploy.",
  );
const password =
  process.env.ADMIN_PASSWORD || randomBytes(15).toString("base64url");
await db("users").insert({
  id: id(),
  name: "Onyx Manager",
  email: "manager@onyx.local",
  password: await bcrypt.hash(password, 12),
  role: "owner",
  active: true,
});
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
    [
      "Tamo",
      "Barber",
      "#d8a75f",
      "Sharp cuts and classic barbering.",
      barberServices,
    ],
    [
      "Misho",
      "Barber",
      "#c59b76",
      "Fades, beard work and careful finish.",
      barberServices,
    ],
    [
      "Ani",
      "Barber",
      "#e0c48a",
      "Modern styles with a precise touch.",
      barberServices,
    ],
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
await db("settings").insert({
  id: "business",
  value: JSON.stringify({
    name: "Onyx Barbers",
    timezone: "Asia/Tbilisi",
    currency: "GEL",
    address: "15 Rustaveli Ave, Tbilisi",
    phone: "",
    email: "",
    instagram: "",
    leadMinutes: 60,
    horizonDays: 60,
    cancelHours: 12,
    notice: "Sample team and services. Update these before accepting real bookings.",
  }),
});
await db("inventory").insert([
  {
    id: id(),
    name: "Matte styling clay",
    sku: "ONYX-CLAY",
    quantity: 18,
    threshold: 5,
    price: 3500,
  },
  {
    id: id(),
    name: "Beard conditioning oil",
    sku: "ONYX-OIL",
    quantity: 4,
    threshold: 5,
    price: 4000,
  },
]);
console.log(
  "\nLocal owner account\nEmail: manager@onyx.local\nPassword: " +
    password +
    "\nSave this password. You can change it in Settings.\n",
);
await db.destroy();
