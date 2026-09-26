import "dotenv/config";
import knex from "knex";
const mysql = process.env.DB_CLIENT === "mysql";
export const db = knex({
  client: mysql ? "mysql2" : "better-sqlite3",
  connection: mysql
    ? process.env.DATABASE_URL
    : { filename: process.env.SQLITE_FILENAME || "./onyx.sqlite" },
  useNullAsDefault: !mysql,
  pool: mysql
    ? { min: 0, max: 10 }
    : {
        min: 1,
        max: 1,
        afterCreate(conn, done) {
          conn.pragma("journal_mode = WAL");
          conn.pragma("foreign_keys = ON");
          conn.pragma("busy_timeout = 5000");
          done(null, conn);
        },
      },
});
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export async function setting(conn = db) {
  const row = await conn("settings").where({ id: "business" }).first();
  return row ? JSON.parse(row.value) : {};
}
