import { createHash, randomUUID } from "node:crypto";
import { activeMentors } from "../src/content/mentors.js";
import { addDays, atWIB, FRESH_MS } from "../src/utils/dateTime.js";
import { validMentorLabel } from "../src/utils/scheduleMentors.js";
import type {
  MentorSync,
  PublicEvent,
  PublicSchedule,
  SyncStatus,
} from "../src/types/schedule.js";

export interface AppsScriptConfig {
  url: string;
  secret: string;
  cacheMode?: "ttl" | "changes";
}
export interface AppsScriptDependencies {
  fetcher?: typeof fetch;
  now?: () => number;
  onSyncError?: (publicMentorId: string) => void;
}

export function readAppsScriptConfig(
  env: Record<string, string | undefined>,
): AppsScriptConfig {
  const input = env.GOOGLE_APPS_SCRIPT_URL?.trim() ?? "";
  const secret = env.API_SECRET ?? "";
  return {
    url: /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
      input,
    )
      ? input
      : "",
    secret: secret.trim() && secret.length <= 4096 ? secret : "",
    cacheMode:
      env.CALENDAR_CACHE_MODE === "changes" &&
      !!env.CALENDAR_WEBHOOK_SECRET?.trim()
        ? "changes"
        : "ttl",
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function timestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
function allowedRedirect(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.hash &&
    url.hostname === "script.googleusercontent.com" &&
    url.pathname === "/macros/echo"
  );
}
async function readPayload(response: Response): Promise<unknown> {
  const maxBytes = 1_048_576;
  if (
    !response.ok ||
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") ?? "",
    ) ||
    Number(response.headers.get("content-length")) > maxBytes ||
    !response.body
  )
    throw new Error("invalid_apps_script_response");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) throw new Error("apps_script_response_too_large");
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

interface CalendarMentor {
  id: string;
  name: string;
}
interface Snapshot {
  data: PublicSchedule;
  expires: number;
}

/** Accepts the owner's existing success/timezone/count/schedules/warnings JSON unchanged. */
export function createAppsScriptCalendarService(
  config: AppsScriptConfig,
  dependencies: AppsScriptDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch,
    now = dependencies.now ?? Date.now;
  const cache = new Map<string, Snapshot>(),
    pending = new Map<string, Promise<Snapshot>>();
  const knownMentors = new Map<string, CalendarMentor>();
  const listeners = new Set<(revision: string) => void>();
  let revision = randomUUID();
  const cacheMode = config.cacheMode ?? "ttl";
  // Change notifications invalidate this early; a six-hour fallback also recovers missed notifications.
  const cacheMs = cacheMode === "changes" ? 6 * 60 * 60_000 : FRESH_MS;

  function calendarMentor(name: string): CalendarMentor {
    const clean = name.trim().normalize("NFKC");
    const match = activeMentors.find(
      (mentor) => mentor.name === clean || mentor.fullName === clean,
    );
    const id =
      match?.id ??
      `calendar-${createHash("sha256").update(clean).digest("hex").slice(0, 16)}`;
    const existing = knownMentors.get(id);
    if (existing) return existing;
    if (knownMentors.size >= 64) throw new Error("mentor_limit");
    const mentor = { id, name: clean };
    knownMentors.set(id, mentor);
    return mentor;
  }

  function unavailable(
    weekStart: string,
    status: SyncStatus,
    previous?: Snapshot,
  ): PublicSchedule {
    const updatedAt = previous?.data.updatedAt ?? null;
    return {
      weekStart,
      timeZone: "Asia/Jakarta",
      demo: false,
      source: "apps-script",
      syncStatus: previous && updatedAt ? "stale" : status,
      updatedAt,
      partial: previous?.data.partial ?? false,
      revision,
      cacheMode,
      validUntil: previous?.data.validUntil ?? null,
      events: previous?.data.events ?? [],
      mentors: [...knownMentors.values()].map((mentor) => ({
        mentorId: mentor.id,
        mentorDisplayName: mentor.name,
        syncStatus: previous && updatedAt ? "stale" : status,
        updatedAt,
        validUntil: previous?.data.validUntil ?? null,
      })),
    };
  }

  async function fetchWeek(weekStart: string): Promise<unknown> {
    let url = new URL(config.url),
      post = true;
    const signal = AbortSignal.timeout(12_000);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetcher(url.href, {
        method: post ? "POST" : "GET",
        redirect: "manual",
        signal,
        headers: post
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
        ...(post
          ? {
              body: JSON.stringify({
                token: config.secret,
                // Discover mentor names even when they have no sessions in the selected week.
                // The source accepts at most 31 days; only the selected seven days become busy blocks.
                start: atWIB(addDays(weekStart, -12)),
                end: atWIB(addDays(weekStart, 19)),
              }),
            }
          : {}),
      });
      if (![301, 302, 303, 307, 308].includes(response.status))
        return readPayload(response);
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (
        !location ||
        redirects === 3 ||
        (post && [307, 308].includes(response.status))
      )
        throw new Error("invalid_apps_script_redirect");
      const next = new URL(location, url);
      if (!allowedRedirect(next))
        throw new Error("invalid_apps_script_redirect");
      url = next;
      post = false;
    }
    throw new Error("apps_script_redirect_limit");
  }

  async function refresh(
    weekStart: string,
    previous?: Snapshot,
  ): Promise<Snapshot> {
    const requestRevision = revision;
    let data: PublicSchedule;
    try {
      const payload = await fetchWeek(weekStart);
      if (requestRevision !== revision)
        return { data: unavailable(weekStart, "error", previous), expires: 0 };
      if (
        !record(payload) ||
        payload.success !== true ||
        payload.timezone !== "Asia/Jakarta" ||
        !Array.isArray(payload.schedules) ||
        payload.schedules.length > 10_000 ||
        payload.count !== payload.schedules.length ||
        !Array.isArray(payload.warnings) ||
        !payload.warnings.every((warning) => typeof warning === "string")
      )
        throw new Error("invalid_apps_script_schedule");
      let partial = payload.warnings.length > 0;
      const events: PublicEvent[] = [],
        seen = new Set<string>();
      const from = Date.parse(atWIB(weekStart)),
        to = Date.parse(atWIB(addDays(weekStart, 7)));
      for (const item of payload.schedules) {
        if (
          !record(item) ||
          !validMentorLabel(item.mentor) ||
          !timestamp(item.start) ||
          !timestamp(item.end) ||
          typeof item.allDay !== "boolean" ||
          Date.parse(item.start) >= Date.parse(item.end)
        ) {
          partial = true;
          continue;
        }
        const mentor = calendarMentor(item.mentor);
        if (Date.parse(item.end) <= from || Date.parse(item.start) >= to)
          continue;
        // Only selected fields leave the server; raw title, locations, students and URLs are never forwarded.
        const event: PublicEvent = {
          mentorId: mentor.id,
          mentorDisplayName: mentor.name,
          start: new Date(item.start).toISOString(),
          end: new Date(item.end).toISOString(),
          publicLabel: "Sesi",
          availabilityStatus: "busy",
          allDay: item.allDay,
        };
        const fingerprint = JSON.stringify(event);
        if (!seen.has(fingerprint)) {
          seen.add(fingerprint);
          events.push(event);
        }
      }
      // A mentor already returned by the source remains part of the roster even in a quiet window.
      const updatedAt = new Date(now()).toISOString();
      const validUntil = new Date(
        now() + (partial ? 15_000 : cacheMs),
      ).toISOString();
      data = {
        weekStart,
        timeZone: "Asia/Jakarta",
        demo: false,
        source: "apps-script",
        syncStatus: "success",
        updatedAt,
        partial,
        revision: requestRevision,
        cacheMode,
        validUntil,
        events: events.sort(
          (a, b) => Date.parse(a.start) - Date.parse(b.start),
        ),
        mentors: [...knownMentors.values()].map((mentor): MentorSync => ({
          mentorId: mentor.id,
          mentorDisplayName: mentor.name,
          updatedAt,
          validUntil,
          // The API's generic warnings cannot identify the failed calendar. Keep busy events, withhold free intervals.
          syncStatus: partial ? "stale" : "success",
        })),
      };
    } catch {
      for (const mentor of knownMentors.values())
        dependencies.onSyncError?.(mentor.id);
      data = unavailable(weekStart, "error", previous);
    }
    const snapshot = {
      data,
      expires:
        now() +
        (data.syncStatus === "success" && !data.partial ? cacheMs : 15_000),
    };
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    if (revision === requestRevision) cache.set(weekStart, snapshot);
    return snapshot;
  }

  return {
    getRevision: () => revision,
    subscribe(listener: (next: string) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    invalidate() {
      revision = randomUUID();
      for (const snapshot of cache.values()) snapshot.expires = 0;
      pending.clear();
      for (const listener of listeners) {
        try {
          listener(revision);
        } catch {
          /* disconnected listener */
        }
      }
      return revision;
    },
    async getSchedule(
      weekStart: string,
      mentorId = "all",
    ): Promise<PublicSchedule> {
      if (!config.url || !config.secret)
        return unavailable(weekStart, "unconfigured");
      for (let attempt = 0; attempt < 3; attempt++) {
        const requestedRevision = revision;
        const existing = cache.get(weekStart);
        let snapshot: Snapshot;
        if (existing && now() < existing.expires) snapshot = existing;
        else {
          let request = pending.get(weekStart);
          if (!request) {
            request = refresh(weekStart, existing);
            pending.set(weekStart, request);
          }
          try {
            snapshot = await request;
          } finally {
            if (pending.get(weekStart) === request) pending.delete(weekStart);
          }
        }
        if (requestedRevision !== revision) continue;
        return {
          ...snapshot.data,
          events: snapshot.data.events.filter(
            (event) => mentorId === "all" || event.mentorId === mentorId,
          ),
          mentors: snapshot.data.mentors.filter(
            (mentor) => mentorId === "all" || mentor.mentorId === mentorId,
          ),
        };
      }
      return unavailable(weekStart, "error", cache.get(weekStart));
    },
  };
}
