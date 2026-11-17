import type { IncomingMessage, ServerResponse } from "node:http";
import { createScheduleService } from "./scheduleService.js";
import { createPublicScheduleHandler } from "./publicSchedule.js";
import { securityHeaders } from "./securityHeaders.js";
import type { AppsScriptDependencies } from "./appsScriptCalendar.js";
import { createCalendarNotifications } from "./calendarNotifications.js";

/** Server-only bridge so Vite dev/preview serves the same API without another process. */
export function createViteScheduleMiddleware(
  env: Record<string, string | undefined>,
  dependencies: AppsScriptDependencies = {},
) {
  const service = createScheduleService(env, dependencies);
  const notifications = createCalendarNotifications(service, env);
  const handler = createPublicScheduleHandler(service, {
    now: dependencies.now,
  });
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
      next();
      return;
    }
    for (const [name, value] of Object.entries(securityHeaders))
      res.setHeader(name, value);
    if ((req.url?.length ?? 0) > 2048) {
      res.writeHead(414, { "Content-Type": "application/json" });
      res.end('{"error":"Alamat permintaan terlalu panjang."}');
      return;
    }
    void (async () => {
      try {
        if (await notifications(req, res)) return;
        const response = await handler(
          new Request(url, { method: req.method ?? "GET" }),
          req.socket.remoteAddress ?? "unknown",
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
      } catch {
        res.writeHead(503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          '{"error":"Data belum dapat diperbarui. Status ketersediaan belum diketahui."}',
        );
      }
    })();
  };
}
