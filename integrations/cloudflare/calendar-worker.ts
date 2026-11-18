import { DurableObject } from "cloudflare:workers";
import { createHash } from "node:crypto";
import {
  createAppsScriptCalendarService,
  readAppsScriptConfig,
  type AppsScriptState,
  type Snapshot,
} from "../../api/appsScriptCalendar";
import {
  createCalendarHttpHandler,
  calendarJson,
} from "../../api/calendarHttp";

interface Env {
  GOOGLE_APPS_SCRIPT_URL?: string;
  API_SECRET?: string;
  CALENDAR_WEBHOOK_SECRET?: string;
  CALENDAR_CACHE_MODE?: string;
}
interface Catalog {
  version: 1;
  configuration: string;
  revision: string;
  mentors: AppsScriptState["mentors"];
  changes: string[];
}

/** One durable cache and revision stream for all visitors, surviving isolate eviction. */
export class CalendarCoordinator extends DurableObject<Env> {
  private source: ReturnType<typeof createAppsScriptCalendarService>;
  private handle: (request: Request) => Promise<Response>;
  private changes = new Set<string>();
  private saved = new Map<string, string>();
  private persistedVersion = 0;
  private configuration: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const effective = { ...env };
    if (
      (env.CALENDAR_WEBHOOK_SECRET?.length ?? 0) < 32 ||
      (env.CALENDAR_WEBHOOK_SECRET?.length ?? 0) > 512
    )
      effective.CALENDAR_CACHE_MODE = "ttl";
    const config = readAppsScriptConfig(effective);
    this.configuration = createHash("sha256")
      .update(JSON.stringify([config.url, config.secret, config.cacheMode]))
      .digest("hex");
    const sql = ctx.storage.sql;
    sql.exec(
      "CREATE TABLE IF NOT EXISTS calendar_catalog (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS calendar_cache (week_start TEXT PRIMARY KEY, payload TEXT NOT NULL)",
    );
    let initialState: AppsScriptState | undefined;
    try {
      const row = sql
        .exec<{ payload: string }>(
          "SELECT payload FROM calendar_catalog WHERE id = 1",
        )
        .toArray()[0];
      const catalog: Catalog | undefined = row
        ? JSON.parse(row.payload)
        : undefined;
      if (
        catalog?.version === 1 &&
        catalog.configuration === this.configuration &&
        Array.isArray(catalog.mentors) &&
        Array.isArray(catalog.changes)
      ) {
        const snapshots: AppsScriptState["snapshots"] = [];
        for (const item of sql.exec<{ week_start: string; payload: string }>(
          "SELECT week_start, payload FROM calendar_cache LIMIT 64",
        )) {
          snapshots.push({
            weekStart: item.week_start,
            snapshot: JSON.parse(item.payload) as Snapshot,
          });
          this.saved.set(item.week_start, item.payload);
        }
        initialState = {
          version: 1,
          revision: catalog.revision,
          mentors: catalog.mentors,
          snapshots,
        };
        this.changes = new Set(
          catalog.changes
            .filter(
              (id) => typeof id === "string" && /^[a-f0-9-]{36}$/.test(id),
            )
            .slice(-512),
        );
      } else {
        sql.exec("DELETE FROM calendar_cache");
        sql.exec("DELETE FROM calendar_catalog");
      }
    } catch {
      sql.exec("DELETE FROM calendar_cache");
      sql.exec("DELETE FROM calendar_catalog");
      this.saved.clear();
    }
    this.source = createAppsScriptCalendarService(config, { initialState });
    this.handle = createCalendarHttpHandler(this.source, effective, {
      changes: this.changes,
      flush: () => this.persist(),
    });
  }

  private persist() {
    const version = this.source.getStateVersion();
    if (version === this.persistedVersion) return;
    const state = this.source.exportState();
    const next = new Map<string, string>();
    const catalog: Catalog = {
      version: 1,
      configuration: this.configuration,
      revision: state.revision,
      mentors: state.mentors,
      changes: [...this.changes],
    };
    this.ctx.storage.transactionSync(() => {
      for (const { weekStart, snapshot } of state.snapshots) {
        const payload = JSON.stringify(snapshot);
        // Extremely large weeks remain cached in memory; keep SQLite rows below runtime limits.
        if (new TextEncoder().encode(payload).byteLength > 1_000_000) continue;
        next.set(weekStart, payload);
        if (this.saved.get(weekStart) !== payload)
          this.ctx.storage.sql.exec(
            "INSERT INTO calendar_cache (week_start, payload) VALUES (?, ?) ON CONFLICT(week_start) DO UPDATE SET payload = excluded.payload",
            weekStart,
            payload,
          );
      }
      for (const weekStart of this.saved.keys())
        if (!next.has(weekStart))
          this.ctx.storage.sql.exec(
            "DELETE FROM calendar_cache WHERE week_start = ?",
            weekStart,
          );
      this.ctx.storage.sql.exec(
        "INSERT INTO calendar_catalog (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        JSON.stringify(catalog),
      );
    });
    this.saved = next;
    this.persistedVersion = version;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      return await this.handle(request);
    } catch {
      return calendarJson(503, {
        error:
          "Data belum dapat diperbarui. Status ketersediaan belum diketahui.",
      });
    }
  }
}

// Calendar secrets and storage are accessible only through the Pages binding, never a public Worker URL.
export default {
  fetch: () => calendarJson(404, { error: "Endpoint tidak ditemukan." }),
};
