/** Configuration is public. Return null for unsafe/ambiguous links, never repair them into an executable URL. */
export function safeHttpsUrl(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    /[\s\u0000-\u001f\u007f\\]/u.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function safeSiteOrigin(value: unknown): string {
  const safe = safeHttpsUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  return url.pathname === "/" && !url.search && !url.hash ? url.origin : "";
}

export function safeCvUrl(value: unknown): string | null {
  if (
    typeof value === "string" &&
    /^\/cv\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.pdf$/.test(value)
  )
    return value;
  return safeHttpsUrl(value);
}
