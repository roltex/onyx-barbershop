import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const port = process.env.PORT || "3000";

function run(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  child.on("error", (err) => {
    console.error("Failed to start", command, args.join(" "), err);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
  return child;
}

const nextBin = path.join(root, "apps/web/node_modules/next/dist/bin/next");
if (!fs.existsSync(nextBin)) {
  console.error("Missing Next.js binary at", nextBin);
  process.exit(1);
}

const api = run(nodeBin, ["src/server.js"], path.join(root, "apps/api"), {
  HOST: "127.0.0.1",
  PORT: "4000",
  NODE_ENV: "production",
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || "https://onyx.buildweb.dev",
  TRUST_PROXY: "1",
});

const web = run(
  nodeBin,
  [nextBin, "start", "-H", "0.0.0.0", "-p", String(port)],
  path.join(root, "apps/web"),
  {
    API_URL: "http://127.0.0.1:4000",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "0.0.0.0",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    api.kill(signal);
    web.kill(signal);
  });
}
