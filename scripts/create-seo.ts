import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import { pageMeta } from "../src/router/meta.ts";
import { safeSiteOrigin } from "../src/utils/urls.ts";

const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const site = safeSiteOrigin(env.VITE_SITE_URL);
const validSite = !!site;
const indexable =
  validSite &&
  env.VITE_SITE_INDEXABLE === "true" &&
  env.VITE_SCHEDULE_DEMO === "false";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const root = resolve("dist");
const template = await readFile(resolve(root, "index.html"), "utf8");
for (const [route, meta] of Object.entries({
  ...pageMeta,
  "/404": {
    title: "Halaman tidak ditemukan — VGA Class",
    description:
      "Halaman yang kamu cari tidak ditemukan. Kembali ke beranda VGA Class.",
  },
})) {
  let html = template.replace(
    /<title>.*?<\/title>/,
    `<title>${escape(meta.title)}</title>`,
  );
  for (const [attr, key, value] of [
    ["name", "description", meta.description],
    ["property", "og:title", meta.title],
    ["property", "og:description", meta.description],
    [
      "name",
      "robots",
      indexable && route !== "/404" ? "index, follow" : "noindex, nofollow",
    ],
  ]) {
    html = html.replace(
      new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*\\/?\\s*>`),
      `<meta ${attr}="${key}" content="${escape(value!)}" />`,
    );
  }
  if (validSite) {
    html = html.replace(
      'content="/og.png"',
      `content="${escape(site)}/og.png"`,
    );
    if (route !== "/404")
      html = html.replace(
        "</head>",
        `<link rel="canonical" href="${escape(site + route)}" /><meta property="og:url" content="${escape(site + route)}" /></head>`,
      );
  }
  const directory =
    route === "/" || route === "/404" ? root : resolve(root, route.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, route === "/404" ? "404.html" : "index.html"),
    html,
  );
}
await writeFile(
  resolve(root, "robots.txt"),
  indexable
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n",
);
await writeFile(
  resolve(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
    indexable
      ? Object.keys(pageMeta)
          .map((route) => `<url><loc>${escape(site + route)}</loc></url>`)
          .join("")
      : ""
  }</urlset>\n`,
);
console.log(
  `Generated route metadata, robots.txt and sitemap.xml (${indexable ? "indexable" : "prototype: noindex"}).`,
);
