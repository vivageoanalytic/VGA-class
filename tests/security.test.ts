import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { safeHttpsUrl, safeSiteOrigin } from "../src/utils/urls";
import { isSafePublicPath } from "../api/staticPolicy";
import { securityHeaders } from "../api/securityHeaders";
import {
  auditPublicDirectory,
  hasCredentialLiteral,
} from "../scripts/check-security";

describe("URL publik dan CV", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "//evil.example/cv.pdf",
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/\nfoo",
    "https://example.com\\evil",
    "",
    null,
  ])("Menolak URL tidak aman: %s", (value) =>
    expect(safeHttpsUrl(value)).toBeNull(),
  );
  it("HTTPS valid tetap bisa dibuka, origin harus tanpa path/query/credentials", () => {
    expect(safeHttpsUrl("https://example.com/cv.pdf")).toBe(
      "https://example.com/cv.pdf",
    );
    expect(safeSiteOrigin("https://example.com/")).toBe("https://example.com");
    expect(safeSiteOrigin("https://example.com/?ref=other")).toBe("");
    expect(safeSiteOrigin("https://example.com/other")).toBe("");
    expect(safeSiteOrigin("javascript:alert(1)")).toBe("");
  });
});

describe("Static root dan security headers", () => {
  it.each([
    "/.env",
    "/.git/config",
    "/credentials.json",
    "/client_secret.json",
    "/backup.zip",
    "/assets/app.js.map",
    "/dump.sql",
    "/x/../secret.txt",
    "/x\\..\\secret.txt",
    "//example.com",
    "/cv/../cv.pdf",
    "/cv/private.key",
    "/other.pdf",
    "/private.html",
  ])("Tidak mengekspos path internal: %s", (path) =>
    expect(isSafePublicPath(path)).toBe(false),
  );
  it.each([
    "/",
    "/programs",
    "/assets/app-123.js",
    "/assets/main.css",
    "/mentors/placeholder.svg",
    "/banners/calculus.webp",
    "/cv/mentor-01.pdf",
    "/licenses/lato-OFL.txt",
  ])("Aset/route publik tetap valid: %s", (path) =>
    expect(isSafePublicPath(path)).toBe(true),
  );
  it("CSP membatasi pengecualian style, menolak script inline, objek, dan framing", () => {
    const csp = securityHeaders["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("style-src-elem 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(securityHeaders["X-Frame-Options"]).toBe("DENY");
  });
});

describe("Gate artefak", () => {
  const temporary: string[] = [];
  afterEach(async () => {
    for (const directory of temporary.splice(0)) {
      if (!directory.startsWith(resolve(".npm-cache") + sep))
        throw new Error("Unsafe cleanup target");
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("Mendeteksi file credential, source map, backup, SVG aktif; tidak mencetak nilai", async () => {
    await mkdir(resolve(".npm-cache"), { recursive: true });
    const directory = await mkdtemp(resolve(".npm-cache/security-gate-"));
    temporary.push(directory);
    await Promise.all(
      [".env", "app.js.map", "backup.zip", "image.svg"].map((file) =>
        writeFile(
          resolve(directory, file),
          file.endsWith(".svg")
            ? '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'
            : "data uji bukan credential asli",
        ),
      ),
    );
    await mkdir(resolve(directory, "assets"));
    await writeFile(
      resolve(directory, "assets/valid.js"),
      'console.log("valid")',
    );
    const findings = await auditPublicDirectory(directory);
    expect(findings.map((f) => f.file).sort()).toEqual(
      [".env", "app.js.map", "backup.zip", "image.svg"].sort(),
    );
    expect(JSON.stringify(findings)).not.toContain("data uji");
  });
  it("Menangkap format token dan private key; mengizinkan nama variabel contoh tanpa nilainya", () => {
    expect(hasCredentialLiteral(["ya29", ".", "a".repeat(40)].join(""))).toBe(
      true,
    );
    expect(
      hasCredentialLiteral(["-----BEGIN ", "PRIVATE KEY-----"].join("")),
    ).toBe(true);
    expect(hasCredentialLiteral("GOOGLE_CLIENT_SECRET=")).toBe(false);
  });
});
