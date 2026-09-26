import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import dotenv from "dotenv";
export const originalDirectory = process.cwd();
export function outputPath(value) {
  if (!value) throw new Error("Supply an output/input file path.");
  return resolve(originalDirectory, value);
}
process.chdir(fileURLToPath(new URL("../apps/api/", import.meta.url)));
dotenv.config({ quiet: true });
export const { db, id, now } = await import("../apps/api/src/db.js");
export const tables = [
  "users",
  "services",
  "staff",
  "timeoff",
  "customers",
  "bookings",
  "slots",
  "inventory",
  "settings",
  "audit",
  "outbox",
];
