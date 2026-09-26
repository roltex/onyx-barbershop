import { db, tables, outputPath } from "./operator-db.mjs";
import { readFile } from "node:fs/promises";
const source = outputPath(process.argv[2]);
try {
  const data = JSON.parse(await readFile(source, "utf8"));
  if (data.format !== "onyx-v1" || !data.tables)
    throw new Error("Unsupported export format.");
  await db.transaction(async (trx) => {
    for (const table of [...tables, "sessions"])
      if (await trx(table).first())
        throw new Error("Target must be empty. Refusing to overwrite " + table);
    for (const table of tables) {
      if (!Array.isArray(data.tables[table]))
        throw new Error("Missing table: " + table);
      for (let i = 0; i < data.tables[table].length; i += 25)
        await trx(table).insert(data.tables[table].slice(i, i + 25));
    }
  });
  console.log(
    "Imported successfully. Sessions are intentionally not restored.",
  );
} finally {
  await db.destroy();
}
