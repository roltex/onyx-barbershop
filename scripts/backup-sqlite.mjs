import { db, outputPath } from "./operator-db.mjs";
import { existsSync } from "node:fs";
const destination = outputPath(process.argv[2]);
try {
  if (process.env.DB_CLIENT === "mysql")
    throw new Error("Use mysqldump for MySQL.");
  if (existsSync(destination))
    throw new Error("Destination already exists; refusing overwrite.");
  const conn = await db.client.acquireConnection();
  try {
    await conn.backup(destination);
  } finally {
    await db.client.releaseConnection(conn);
  }
  console.log("Consistent SQLite backup created: " + destination);
} finally {
  await db.destroy();
}
