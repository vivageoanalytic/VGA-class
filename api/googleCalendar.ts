import { activeMentors } from "../src/content/mentors.js";
import { addDays, atWIB, FRESH_MS } from "../src/utils/dateTime.js";
import type {
  MentorSync,
  PublicEvent,
  PublicSchedule,
} from "../src/types/schedule.js";

export interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendars: Record<string, string>;
}

export function readCalendarConfig(
  env: Record<string, string | undefined>,
): CalendarConfig {
  let mapping: unknown;
  try {
    mapping = JSON.parse(env.GOOGLE_MENTOR_CALENDARS || "{}");
  } catch {
    mapping = {};
  }
  const calendars: Record<string, string> = {};
  if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
    const values = Object.values(mapping);
    for (const mentor of activeMentors) {
      const value = (mapping as Record<string, unknown>)[mentor.id];
      // A duplicated source is not silently assigned to two different mentors.
      if (
        typeof value === "string" &&
        value.trim() &&
        value.length <= 1024 &&
        values.filter((v) => v === value).length === 1
      )
        calendars[mentor.id] = value;
    }
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: env.GOOGLE_REFRESH_TOKEN || "",
    calendars,
  };
}

interface GoogleEvent {
  id?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { shared?: Record<string, string> };
}

function googleTime(value: GoogleEvent["start"]): string {
  if (
    value?.dateTime &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value.dateTime) &&
    Number.isFinite(Date.parse(value.dateTime))
  )
    return new Date(value.dateTime).toISOString();
  if (value?.date && /^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
    const parsed = new Date(`${value.date}T00:00:00Z`);
    if (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value.date
    )
      return atWIB(value.date);
  }
  throw new Error("invalid_event_time");
}

/** Explicit whitelist. Raw text, location, attendees, source IDs and URLs never leave this function. */
export function sanitizeGoogleEvent(
  raw: GoogleEvent,
  mentorId: string,
  weekStart: string,
): PublicEvent | null {
  if (raw.status === "cancelled" || raw.transparency === "transparent")
    return null;
  const start = googleTime(raw.start),
    end = googleTime(raw.end);
  if (Date.parse(start) >= Date.parse(end))
    throw new Error("invalid_event_interval");
  if (
    Date.parse(end) <= Date.parse(atWIB(weekStart)) ||
    Date.parse(start) >= Date.parse(atWIB(addDays(weekStart, 7)))
  )
    return null;
  const mentor = activeMentors.find((m) => m.id === mentorId);
  if (!mentor) throw new Error("unknown_mentor");
  const shared = raw.extendedProperties?.shared;
  const approved = shared?.vgaPublic === "true";
  const session = approved && shared?.vgaKind === "session";
  return {
    mentorId,
    mentorDisplayName: mentor.name,
    start,
    end,
    publicLabel: session ? "Sesi" : "Sedang tidak tersedia",
    availabilityStatus: "busy",
    ...(session &&
    ["kalkulus-1", "kalkulus-2"].includes(shared?.vgaCourse ?? "")
      ? {
          course:
            shared!.vgaCourse === "kalkulus-1"
              ? ("Kalkulus 1" as const)
              : ("Kalkulus 2" as const),
        }
      : {}),
    ...(session && ["online", "offline"].includes(shared?.vgaMode ?? "")
      ? {
          mode:
            shared!.vgaMode === "online"
              ? ("Online" as const)
              : ("Offline" as const),
        }
      : {}),
  };
}

interface CacheEntry {
  events: PublicEvent[];
  updatedAt: string;
  timestamp: number;
}
interface Dependencies {
  fetcher?: typeof fetch;
  now?: () => number;
  onSyncError?: (publicMentorId: string) => void;
}

export function createCalendarService(
  config: CalendarConfig,
  dependencies: Dependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch,
    now = dependencies.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<
    string,
    Promise<{ events: PublicEvent[]; sync: MentorSync }>
  >();
  let token: { value: string; expires: number } | undefined;
  let tokenRequest: Promise<string> | undefined;

  async function accessToken(): Promise<string> {
    if (token && token.expires > now()) return token.value;
    if (tokenRequest) return tokenRequest;
    tokenRequest = (async () => {
      const response = await fetcher("https://oauth2.googleapis.com/token", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!response.ok) throw new Error("authorization_failed");
      const value = (await response.json()) as {
        access_token?: unknown;
        expires_in?: unknown;
        scope?: unknown;
      };
      if (
        typeof value.access_token !== "string" ||
        !value.access_token ||
        typeof value.expires_in !== "number" ||
        value.expires_in < 60
      )
        throw new Error("invalid_authorization");
      // Reject tokens known to have a writable Calendar scope. The refresh token must be issued read-only.
      if (
        typeof value.scope === "string" &&
        value.scope
          .split(" ")
          .some((scope) =>
            [
              "https://www.googleapis.com/auth/calendar",
              "https://www.googleapis.com/auth/calendar.events",
              "https://www.googleapis.com/auth/calendar.app.created",
            ].includes(scope),
          )
      )
        throw new Error("scope_not_readonly");
      token = {
        value: value.access_token,
        expires: now() + (value.expires_in - 60) * 1000,
      };
      return token.value;
    })();
    try {
      return await tokenRequest;
    } finally {
      tokenRequest = undefined;
    }
  }

  async function listMentor(
    mentorId: string,
    weekStart: string,
  ): Promise<{ events: PublicEvent[]; sync: MentorSync }> {
    const calendarId = config.calendars[mentorId];
    if (
      !calendarId ||
      !config.clientId ||
      !config.clientSecret ||
      !config.refreshToken
    )
      return {
        events: [],
        sync: { mentorId, syncStatus: "unconfigured", updatedAt: null },
      };
    const key = `${mentorId}:${weekStart}`;
    const existing = cache.get(key);
    if (
      existing &&
      now() - existing.timestamp < FRESH_MS &&
      now() >= existing.timestamp
    )
      return {
        events: existing.events,
        sync: {
          mentorId,
          syncStatus: "success",
          updatedAt: existing.updatedAt,
        },
      };
    try {
      const access = await accessToken();
      const signal = AbortSignal.timeout(10_000);
      const result: PublicEvent[] = [],
        seen = new Set<string>(),
        pages = new Set<string>();
      let pageToken = "";
      do {
        const query = new URLSearchParams({
          timeMin: atWIB(weekStart),
          timeMax: atWIB(addDays(weekStart, 7)),
          timeZone: "Asia/Jakarta",
          singleEvents: "true",
          showDeleted: "false",
          orderBy: "startTime",
          maxResults: "2500",
          fields:
            "kind,nextPageToken,items(id,status,transparency,start,end,extendedProperties/shared)",
        });
        if (pageToken) query.set("pageToken", pageToken);
        const response = await fetcher(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query}`,
          { headers: { Authorization: `Bearer ${access}` }, signal },
        );
        if (!response.ok) {
          if (response.status === 401) token = undefined;
          throw new Error("calendar_unavailable");
        }
        const payload = (await response.json()) as {
          kind?: unknown;
          items?: unknown;
          nextPageToken?: unknown;
        };
        if (
          payload.kind !== "calendar#events" ||
          (payload.items !== undefined && !Array.isArray(payload.items))
        )
          throw new Error("invalid_calendar_response");
        for (const raw of (payload.items ?? []) as unknown[]) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw))
            throw new Error("invalid_calendar_event");
          const event = sanitizeGoogleEvent(
            raw as GoogleEvent,
            mentorId,
            weekStart,
          );
          if (event) {
            const fingerprint = JSON.stringify(event);
            if (!seen.has(fingerprint)) {
              seen.add(fingerprint);
              result.push(event);
            }
          }
        }
        if (
          payload.nextPageToken !== undefined &&
          typeof payload.nextPageToken !== "string"
        )
          throw new Error("invalid_pagination");
        pageToken = (payload.nextPageToken as string | undefined) || "";
        if (pageToken && (pages.has(pageToken) || pages.size >= 20))
          throw new Error("pagination_limit");
        pages.add(pageToken);
      } while (pageToken);
      const timestamp = now(),
        updatedAt = new Date(timestamp).toISOString();
      if (cache.size >= 512) cache.delete(cache.keys().next().value!);
      cache.set(key, { events: result, updatedAt, timestamp });
      return {
        events: result,
        sync: { mentorId, syncStatus: "success", updatedAt },
      };
    } catch {
      // Do not log upstream bodies, URLs, event contents, or OAuth errors containing secrets.
      dependencies.onSyncError?.(mentorId);
      return {
        events: existing?.events ?? [],
        sync: {
          mentorId,
          syncStatus: existing ? "stale" : "error",
          updatedAt: existing?.updatedAt ?? null,
        },
      };
    }
  }

  async function getMentor(id: string, week: string) {
    const key = `${id}:${week}`;
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const promise = listMentor(id, week);
    pending.set(key, promise);
    try {
      return await promise;
    } finally {
      pending.delete(key);
    }
  }

  return {
    async getSchedule(
      weekStart: string,
      mentorId = "all",
    ): Promise<PublicSchedule> {
      const selected = activeMentors.filter(
        (m) => mentorId === "all" || m.id === mentorId,
      );
      const results = await Promise.all(
        selected.map((m) => getMentor(m.id, weekStart)),
      );
      return {
        weekStart,
        timeZone: "Asia/Jakarta",
        demo: false,
        events: results.flatMap((r) => r.events),
        mentors: results.map((r) => r.sync),
      };
    },
  };
}
