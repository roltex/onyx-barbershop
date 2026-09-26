import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node:url";
import next from "next";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const apiDir = path.join(root, "apps/api");
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const api = spawn(process.execPath, ["src/server.js"], {
  cwd: apiDir,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "4000",
    NODE_ENV: "production",
    PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || "https://onyx.buildweb.dev",
    TRUST_PROXY: "1",
  },
  stdio: ["ignore", "inherit", "inherit"],
});

api.on("exit", (code, signal) => {
  console.error("API exited", { code, signal });
  process.exit(code || 1);
});

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

http
  .createServer((req, res) => handle(req, res, parse(req.url, true)))
  .listen(port, hostname, () => {
    console.log(`Onyx web on http://${hostname}:${port}`);
  });
