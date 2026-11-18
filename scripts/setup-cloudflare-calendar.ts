import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

type Run = (args: string[], input?: string) => void;
class SetupError extends Error {}

/** Run explicitly by the owner: creates the private Worker and uploads server secrets over stdin. */
export function setupCalendar(
  env: Record<string, string | undefined>,
  run: Run,
) {
  const names = [
    "GOOGLE_APPS_SCRIPT_URL",
    "API_SECRET",
    "CALENDAR_WEBHOOK_SECRET",
  ] as const;
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length)
    throw new SetupError(
      `Isi terlebih dahulu pada .env: ${missing.join(", ")}`,
    );
  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
      env.GOOGLE_APPS_SCRIPT_URL!.trim(),
    )
  )
    throw new SetupError(
      "GOOGLE_APPS_SCRIPT_URL harus URL deployment HTTPS Google berakhiran /exec.",
    );
  if (
    env.CALENDAR_WEBHOOK_SECRET!.length < 32 ||
    env.CALENDAR_WEBHOOK_SECRET!.length > 512
  )
    throw new SetupError(
      "CALENDAR_WEBHOOK_SECRET harus 32 sampai 512 karakter.",
    );
  const config = resolve("integrations/cloudflare/wrangler.jsonc");
  run(["deploy", "--config", config]);
  run(
    ["secret", "bulk", "--config", config],
    JSON.stringify(Object.fromEntries(names.map((name) => [name, env[name]!]))),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const env = { ...parseEnv(readFileSync(".env", "utf8")), ...process.env };
    console.log(
      "Membuat Worker vga-class-calendar dan memasang tiga secret dari .env. Nilainya tidak dicetak.",
    );
    setupCalendar(env, (args, input) => {
      const result = spawnSync(
        process.execPath,
        [resolve("node_modules/wrangler/bin/wrangler.js"), ...args],
        {
          ...(input === undefined
            ? { stdio: "inherit" as const }
            : { input, stdio: ["pipe", "inherit", "inherit"] as const }),
          env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
        },
      );
      if (result.status !== 0)
        throw new SetupError(
          "Penyiapan Cloudflare belum berhasil. Periksa login akun dan pesan Wrangler di atas.",
        );
    });
    console.log(
      "Worker dan secret siap. Push perubahan Pages ke GitHub, lalu periksa /api/public-schedule pada domain produksi.",
    );
  } catch (error) {
    console.error(
      error instanceof SetupError
        ? error.message
        : "Penyiapan Cloudflare gagal. Periksa keberadaan/format .env dan instalasi Wrangler.",
    );
    process.exitCode = 1;
  }
}
