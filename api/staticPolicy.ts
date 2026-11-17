const allowedExtensions = new Set([
  ".js",
  ".css",
  ".svg",
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".avif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".txt",
  ".xml",
  ".pdf",
]);

/** Defense in depth: deployment must never expose internal/config/backup files even if copied to dist. */
export function isSafePublicPath(path: string): boolean {
  if (
    !path.startsWith("/") ||
    path.length > 2048 ||
    /[\u0000-\u001f\u007f\\]/u.test(path) ||
    path.includes("//")
  )
    return false;
  const parts = path.split("/").filter(Boolean);
  if (
    parts.some(
      (part) =>
        part.startsWith(".") ||
        /(?:^|[._-])(?:credentials?|client_secret|service-account|oauth-token|backup)(?:[._-]|$)/i.test(
          part,
        ),
    )
  )
    return false;
  const filename = parts.at(-1) || "";
  if (!filename.includes(".")) return true; // Known SPA routes are handled separately; others stay HTTP 404.
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (extension === ".html")
    return [
      "/index.html",
      "/404.html",
      "/programs/index.html",
      "/mentors/index.html",
      "/schedule/index.html",
      "/gallery/index.html",
    ].includes(path);
  if (extension === ".pdf")
    return /^\/cv\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(path);
  return allowedExtensions.has(extension);
}
