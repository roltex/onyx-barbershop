import { db } from "./db.js";
export async function migrate() {
  if (await db.schema.hasTable("schema_version")) return;
  await db.schema.createTable("users", (t) => {
    t.string("id", 36).primary();
    t.string("name");
    t.string("email").unique();
    t.string("password");
    t.string("role");
    t.boolean("active").defaultTo(true);
  });
  await db.schema.createTable("sessions", (t) => {
    t.string("id", 64).primary();
    t.string("userId", 36).references("users.id").onDelete("CASCADE");
    t.string("csrf", 64);
    t.bigInteger("expires");
  });
  await db.schema.createTable("services", (t) => {
    t.string("id", 36).primary();
    t.string("name");
    t.string("category");
    t.text("description");
    t.integer("duration");
    t.integer("price");
    t.boolean("active").defaultTo(true);
  });
  await db.schema.createTable("staff", (t) => {
    t.string("id", 36).primary();
    t.string("name");
    t.string("title");
    t.string("color");
    t.text("bio");
    t.text("serviceIds");
    t.text("schedule");
    t.boolean("active").defaultTo(true);
  });
  await db.schema.createTable("timeoff", (t) => {
    t.string("id", 36).primary();
    t.string("staffId", 36).references("staff.id");
    t.string("start");
    t.string("end");
    t.string("reason");
  });
  await db.schema.createTable("customers", (t) => {
    t.string("id", 36).primary();
    t.string("name");
    t.string("email").unique();
    t.string("phone");
    t.text("notes");
    t.boolean("marketing").defaultTo(false);
    t.string("createdAt");
  });
  await db.schema.createTable("bookings", (t) => {
    t.string("id", 36).primary();
    t.string("reference").unique();
    t.string("customerId", 36).references("customers.id");
    t.string("staffId", 36).references("staff.id");
    t.string("serviceId", 36).references("services.id");
    t.string("serviceName");
    t.string("start");
    t.string("end");
    t.integer("price");
    t.string("status");
    t.string("paymentStatus").defaultTo("unpaid");
    t.string("paymentMethod");
    t.integer("tip").defaultTo(0);
    t.text("notes");
    t.string("tokenHash", 64);
    t.string("createdAt");
    t.boolean("reminderQueued").defaultTo(false);
    t.index(["staffId", "start"]);
  });
  await db.schema.createTable("slots", (t) => {
    t.string("staffId", 36);
    t.string("start");
    t.string("bookingId", 36).references("bookings.id").onDelete("CASCADE");
    t.primary(["staffId", "start"]);
  });
  await db.schema.createTable("inventory", (t) => {
    t.string("id", 36).primary();
    t.string("name");
    t.string("sku").unique();
    t.integer("quantity");
    t.integer("threshold");
    t.integer("price");
  });
  await db.schema.createTable("settings", (t) => {
    t.string("id").primary();
    t.text("value");
  });
  await db.schema.createTable("audit", (t) => {
    t.string("id", 36).primary();
    t.string("actor");
    t.string("action");
    t.string("entityId");
    t.string("createdAt");
  });
  await db.schema.createTable("outbox", (t) => {
    t.string("id", 36).primary();
    t.string("bookingId", 36);
    t.string("kind").defaultTo("confirmation");
    t.string("to");
    t.string("subject");
    t.text("body");
    t.string("status");
    t.integer("attempts").defaultTo(0);
    t.string("createdAt");
    t.string("sentAt");
    t.text("error");
  });
  await db.schema.createTable("schema_version", (t) => {
    t.integer("version").primary();
  });
  await db("schema_version").insert({ version: 1 });
}
if (process.argv[1]?.endsWith("migrate.js")) {
  await migrate();
  console.log("Database schema ready.");
  await db.destroy();
}
