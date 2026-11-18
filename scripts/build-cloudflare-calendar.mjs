import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    "deploy",
    "--config",
    resolve("integrations/cloudflare/wrangler.jsonc"),
    "--dry-run",
    "--outdir",
    resolve(".npm-cache/cloudflare-worker"),
  ],
  { stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
);
process.exitCode = result.status ?? 1;
