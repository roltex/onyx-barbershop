import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const dir of ["apps/api", "apps/web"])
  if (!existsSync(`${dir}/.env`))
    copyFileSync(`${dir}/.env.example`, `${dir}/.env`);
for (const cmd of ["db:migrate", "db:seed"]) {
  const r = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", cmd],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (r.status) process.exit(r.status);
}
