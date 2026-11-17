export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Vue calendar positions use style attributes. Inline style elements/scripts remain blocked.
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'none'",
};
