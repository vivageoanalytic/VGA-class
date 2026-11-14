import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readCalendarConfig, createCalendarService } from "./googleCalendar.js";
import { createPublicScheduleHandler } from "./publicSchedule.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = here.includes(`${sep}dist-server${sep}`)
  ? resolve(here, "../..")
  : resolve(here, "..");
const dist = resolve(root, "dist");
const schedule = createPublicScheduleHandler(
  createCalendarService(readCalendarConfig(process.env), {
    onSyncError: (mentorId) =>
      console.warn(JSON.stringify({ event: "schedule_sync_failed", mentorId })),
  }),
);
const port = Number(process.env.PORT || 3001),
  host = process.env.HOST || "127.0.0.1";
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
const paths = ["/", "/programs", "/mentors", "/schedule", "/gallery"];
const indexable =
  process.env.SITE_INDEXABLE === "true" &&
  process.env.VITE_SITE_INDEXABLE === "true" &&
  process.env.VITE_SCHEDULE_DEMO === "false" &&
  /^https:\/\/[^/]+\/?$/.test(process.env.VITE_SITE_URL || "");
const siteUrl = (process.env.VITE_SITE_URL || "").replace(/\/$/, "");
const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  );
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/api/public-schedule") {
      const forwarded =
        process.env.TRUST_PROXY === "true"
          ? req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
          : undefined;
      const response = await schedule(
        new Request(url, { method: req.method }),
        forwarded || req.socket.remoteAddress || "unknown",
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end('{"error":"Endpoint tidak ditemukan."}');
      return;
    }
    if (!["GET", "HEAD"].includes(req.method || "")) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    if (url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml") {
      const robots = indexable
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`
        : "User-agent: *\nDisallow: /\n";
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexable ? paths.map((path) => `<url><loc>${xmlEscape(siteUrl + path)}</loc></url>`).join("") : ""}</urlset>`;
      res.writeHead(200, {
        "Content-Type": types[url.pathname === "/robots.txt" ? ".txt" : ".xml"],
      });
      res.end(
        req.method === "HEAD"
          ? undefined
          : url.pathname === "/robots.txt"
            ? robots
            : sitemap,
      );
      return;
    }
    const decoded = decodeURIComponent(url.pathname);
    const candidate = resolve(dist, `.${decoded}`);
    if (!candidate.startsWith(dist + sep) && candidate !== dist) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = candidate;
    let isFile = false;
    try {
      isFile = (await stat(file)).isFile();
    } catch {
      /* SPA route or missing asset */
    }
    if (!isFile) {
      if (extname(decoded) && !paths.includes(decoded)) {
        res.writeHead(404);
        res.end();
        return;
      }
      file = resolve(
        dist,
        paths.includes(url.pathname)
          ? `.${url.pathname}/index.html`
          : "404.html",
      );
      try {
        await stat(file);
      } catch {
        file = resolve(dist, "index.html");
      }
    }
    let body: Buffer | string = await readFile(file);
    const html = extname(file) === ".html";
    const known = paths.includes(url.pathname);
    if (html) {
      body = body.toString();
      if (!indexable || !known)
        body = body.replace(
          /<meta name="robots" content="[^"]*"\s*\/?\s*>/,
          '<meta name="robots" content="noindex, nofollow" />',
        );
    }
    const immutable = url.pathname.startsWith("/assets/");
    res.writeHead(html && !known ? 404 : 200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": html
        ? "no-cache"
        : immutable
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      ...(!indexable ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    // Generic errors only: never expose filesystem paths or provider payloads.
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Layanan belum tersedia. Jalankan build sebelum memulai server produksi.",
    );
  }
});
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.listen(port, host, () =>
  console.log(`VGA Class server: http://${host}:${port}`),
);
