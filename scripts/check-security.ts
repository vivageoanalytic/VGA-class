import { lstat, readdir, readFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { isSafePublicPath } from "../api/staticPolicy.ts";

export interface SecurityFinding {
  file: string;
  reason: string;
}
const sensitiveName =
  /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]+)?|\.dev\.vars(?:\.(?!example$)[^/]+)?|(?:credentials?|client_secret|service-account|oauth-token)[^/]*\.(?:json|txt)|[^/]+\.(?:pem|key|p12|bak|sql|sqlite3?|dump|zip))$/i;
const markers = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /ya29\.[A-Za-z0-9_.-]{20,}/,
  /(?:^|["'\s])1\/\/[A-Za-z0-9_.-]{30,}/,
  /(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/,
];

export function hasCredentialLiteral(text: string): boolean {
  return markers.some((pattern) => pattern.test(text));
}

export async function auditPublicDirectory(
  root: string,
): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name);
      const name = relative(root, file).split(sep).join("/");
      if (entry.isSymbolicLink() || (await lstat(file)).isSymbolicLink()) {
        findings.push({
          file: name,
          reason: "Symlink tidak diizinkan pada aset publik.",
        });
        continue;
      }
      if (entry.isDirectory()) {
        await visit(file);
        continue;
      }
      if (sensitiveName.test(name) || !isSafePublicPath(`/${name}`)) {
        findings.push({
          file: name,
          reason: "File internal, backup, atau tipe aset tidak diizinkan.",
        });
        continue;
      }
      if (/\.(?:html|js|css|svg|txt|xml)$/i.test(name)) {
        const content = await readFile(file, "utf8");
        if (
          hasCredentialLiteral(content) ||
          /GOOGLE_(?:CLIENT_SECRET|REFRESH_TOKEN|MENTOR_CALENDARS)/.test(
            content,
          )
        )
          findings.push({
            file: name,
            reason:
              "Penanda credential/server-only ditemukan pada aset publik.",
          });
        if (
          /\.map(?:$|[?#])/.test(name) ||
          /sourceMappingURL=data:/.test(content)
        )
          findings.push({
            file: name,
            reason: "Source map publik tidak diizinkan.",
          });
        if (
          /\.svg$/i.test(name) &&
          /<script\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?:javascript|data:text\/html):/i.test(
            content,
          )
        )
          findings.push({
            file: name,
            reason: "Markup SVG aktif tidak diizinkan.",
          });
      }
    }
  }
  await visit(root);
  return findings;
}

async function main() {
  const findings: SecurityFinding[] = [];
  for (const root of ["public", "dist"]) {
    try {
      findings.push(
        ...(await auditPublicDirectory(resolve(root))).map((f) => ({
          ...f,
          file: `${root}/${f.file}`,
        })),
      );
    } catch {
      findings.push({
        file: root,
        reason:
          "Direktori artefak tidak tersedia; jalankan build terlebih dahulu.",
      });
    }
  }
  const tracked = spawnSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (tracked.status === 0) {
    for (const file of tracked.stdout.split("\0").filter(Boolean)) {
      if (sensitiveName.test(file))
        findings.push({
          file,
          reason: "File credential/backup ter-track Git.",
        });
      if (/\.(?:ts|vue|js|mjs|json|yml|yaml|html|md)$/i.test(file)) {
        const content = await readFile(resolve(file), "utf8");
        if (hasCredentialLiteral(content))
          findings.push({
            file,
            reason:
              "Pola credential ditemukan dalam file tracked; nilai tidak dicetak.",
          });
      }
    }
  } else
    console.log(
      "Git index scan tidak tersedia pada direktori ini; riwayat Git tidak diperiksa.",
    );
  for (const finding of findings)
    console.error(`${finding.file}: ${finding.reason}`);
  if (findings.length) {
    console.error(
      `Security gate gagal: ${findings.length} temuan (nilai sensitif tidak dicetak).`,
    );
    process.exitCode = 1;
  } else
    console.log(
      "Security gate lulus: public/build paths, source maps, credential patterns, dan Git index. Ini bukan pengganti secret scanning/history review.",
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void main().catch(() => {
    console.error(
      "Security gate gagal dijalankan; detail internal tidak dicetak.",
    );
    process.exitCode = 1;
  });
