import { db, id } from "./db.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
const email = z
  .email()
  .parse(process.env.ADMIN_EMAIL || "manager@onyx.local")
  .toLowerCase();
const password =
  process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
z.string().min(12).max(128).parse(password);
try {
  if (await db("users").where({ role: "owner", active: true }).first())
    throw new Error(
      "An active owner already exists. Use the password recovery command instead.",
    );
  await db("users").insert({
    id: id(),
    name: "Onyx Owner",
    email,
    password: await bcrypt.hash(password, 12),
    role: "owner",
    active: true,
  });
  if (!(await db("settings").first()))
    await db("settings").insert({
      id: "business",
      value: JSON.stringify({
        name: "Onyx Barbers",
        timezone: "Asia/Tbilisi",
        currency: "GEL",
        address: "Tbilisi, Georgia",
        phone: "",
        email: "",
        instagram: "",
        leadMinutes: 60,
        horizonDays: 60,
        cancelHours: 12,
        notice: "",
      }),
    });
  console.log("Owner created: " + email);
  if (!process.env.ADMIN_PASSWORD)
    console.log("Generated password (save it securely): " + password);
} finally {
  await db.destroy();
}
