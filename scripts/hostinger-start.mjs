import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT || "3000";

function run(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
  return child;
}

const api = run("node", ["src/server.js"], path.join(root, "apps/api"), {
  HOST: "127.0.0.1",
  PORT: "4000",
  NODE_ENV: "production",
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || "https://onyx.buildweb.dev",
  TRUST_PROXY: "1",
});

const web = run(
  "npx",
  ["next", "start", "-H", "0.0.0.0", "-p", String(port)],
  path.join(root, "apps/web"),
  {
    API_URL: "http://127.0.0.1:4000",
    NODE_ENV: "production",
    PORT: String(port),
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    api.kill(signal);
    web.kill(signal);
  });
}
