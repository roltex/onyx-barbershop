import { db, tables, outputPath } from "./operator-db.mjs";
import { writeFile } from "node:fs/promises";
const destination = outputPath(process.argv[2]);
try {
  const data = await db.transaction(async (trx) => {
    const result = {};
    for (const table of tables) result[table] = await trx(table).select("*");
    return result;
  });
  await writeFile(
    destination,
    JSON.stringify(
      { format: "onyx-v1", createdAt: new Date().toISOString(), tables: data },
      null,
      2,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Export written. Contains personal data and password hashes: protect it.",
  );
} finally {
  await db.destroy();
}
