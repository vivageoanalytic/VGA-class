import { securityHeaders } from "./securityHeaders.js";

export interface CalendarNamespace<Id> {
  idFromName(name: string): Id;
  get(id: Id): { fetch(request: Request): Promise<Response> };
}

/** All edge locations use the same object, including authenticated change notifications. */
export async function handlePagesCalendar<Id>(
  request: Request,
  namespace?: CalendarNamespace<Id>,
): Promise<Response> {
  const error = (
    status: number,
    message: string,
    extra: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        ...securityHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...extra,
      },
    });
  if (request.url.length > 4096)
    return error(414, "Alamat permintaan terlalu panjang.");
  const path = new URL(request.url).pathname;
  if (
    ![
      "/api/public-schedule",
      "/api/calendar-changed",
      "/api/schedule-updates",
    ].includes(path)
  )
    return error(404, "Endpoint tidak ditemukan.");
  const method = path === "/api/calendar-changed" ? "POST" : "GET";
  if (request.method !== method)
    return error(405, "Metode tidak diizinkan.", { Allow: method });
  if (!namespace)
    return error(503, "Backend kalender Cloudflare belum terhubung.");
  try {
    return await namespace
      .get(namespace.idFromName("vga-calendar-v1"))
      .fetch(request);
  } catch {
    return error(
      503,
      "Data belum dapat diperbarui. Status ketersediaan belum diketahui.",
    );
  }
}
