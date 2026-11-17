import { brand } from "../content/brand";
import { isCalendarMentorId, validMentorLabel } from "../utils/scheduleMentors";
import { activeMentors } from "../content/mentors";
import { addDays, atWIB, FRESH_MS } from "../utils/dateTime";
import type {
  PublicSchedule,
  PublicEvent,
  MentorSync,
} from "../types/schedule";

export type DemoScenario = "success" | "empty" | "stale" | "error" | "partial";

export function createDemoSchedule(
  weekStart: string,
  scenario: DemoScenario = "success",
  now = Date.now(),
): PublicSchedule {
  const definitions: [number, number, number, number, boolean?][] = [
    [0, 0, 540, 660],
    [1, 0, 570, 660],
    [2, 1, 780, 870],
    [3, 1, 960, 1080],
    [0, 2, 390, 480, true],
    [4, 2, 840, 960],
    [1, 3, 600, 720],
    [2, 3, 990, 1080, true],
    [0, 4, 900, 1020],
    [3, 4, 930, 1020],
    [4, 5, 1200, 1320, true],
    [1, 6, 540, 660],
  ];
  const mentors: MentorSync[] = activeMentors.map((mentor, i) => ({
    mentorId: mentor.id,
    syncStatus:
      scenario === "stale"
        ? "stale"
        : scenario === "error" || (scenario === "partial" && i === 4)
          ? "error"
          : "success",
    updatedAt:
      scenario === "error" || (scenario === "partial" && i === 4)
        ? null
        : new Date(
            now - (scenario === "stale" ? FRESH_MS + 60_000 : 0),
          ).toISOString(),
  }));
  const events: PublicEvent[] =
    scenario === "empty" || scenario === "error"
      ? []
      : definitions
          .filter(([i]) => !(scenario === "partial" && i === 4))
          .map(([i, day, start, end, blocked], index) => ({
            mentorId: activeMentors[i]!.id,
            mentorDisplayName: activeMentors[i]!.name,
            start: atWIB(addDays(weekStart, day), start),
            end: atWIB(addDays(weekStart, day), end),
            publicLabel: blocked ? "Sedang tidak tersedia" : "Sesi",
            ...(blocked
              ? {}
              : {
                  course:
                    index % 2
                      ? ("Kalkulus 2" as const)
                      : ("Kalkulus 1" as const),
                  mode: index % 3 ? ("Online" as const) : ("Offline" as const),
                }),
            availabilityStatus: "busy",
          }));
  return { weekStart, timeZone: "Asia/Jakarta", demo: true, events, mentors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" &&
  /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

/** Reject malformed responses; a partial/invalid payload must never imply availability. */
export function validateSchedule(
  value: unknown,
  weekStart: string,
): PublicSchedule {
  if (
    !isRecord(value) ||
    value.weekStart !== weekStart ||
    value.timeZone !== "Asia/Jakarta" ||
    value.demo !== false ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.mentors)
  )
    throw new Error("Data jadwal tidak valid.");
  const ids = new Set(activeMentors.map((m) => m.id));
  const appsScript = value.source === "apps-script";
  if (
    appsScript &&
    (!["success", "error", "stale", "unconfigured"].includes(
      String(value.syncStatus),
    ) ||
      typeof value.partial !== "boolean" ||
      (value.updatedAt !== null && !isTimestamp(value.updatedAt)) ||
      (value.syncStatus === "success" && !isTimestamp(value.updatedAt)))
  )
    throw new Error("Status pembaruan jadwal tidak valid.");
  if (
    appsScript &&
    ((value.validUntil !== undefined &&
      value.validUntil !== null &&
      !isTimestamp(value.validUntil)) ||
      (value.cacheMode !== undefined &&
        value.cacheMode !== "ttl" &&
        value.cacheMode !== "changes") ||
      (value.revision !== undefined &&
        (typeof value.revision !== "string" ||
          !/^[a-f0-9-]{36}$/.test(value.revision))))
  )
    throw new Error("Metadata cache jadwal tidak valid.");
  const seen = new Set<string>();
  const mentors = value.mentors.map((item): MentorSync => {
    if (
      !isRecord(item) ||
      typeof item.mentorId !== "string" ||
      (!ids.has(item.mentorId) &&
        !(appsScript && isCalendarMentorId(item.mentorId))) ||
      (appsScript && !validMentorLabel(item.mentorDisplayName)) ||
      seen.has(item.mentorId) ||
      !["success", "error", "stale", "unconfigured"].includes(
        String(item.syncStatus),
      ) ||
      (item.updatedAt !== null && !isTimestamp(item.updatedAt)) ||
      (item.syncStatus === "success" && !item.updatedAt)
    )
      throw new Error("Status sumber jadwal tidak valid.");
    seen.add(item.mentorId);
    return {
      mentorId: item.mentorId,
      syncStatus: item.syncStatus as MentorSync["syncStatus"],
      updatedAt: item.updatedAt as string | null,
      ...(appsScript && value.validUntil !== undefined
        ? { validUntil: value.validUntil as string | null }
        : {}),
      ...(appsScript
        ? { mentorDisplayName: (item.mentorDisplayName as string).trim() }
        : {}),
    };
  });
  const events = value.events.map((item): PublicEvent => {
    if (
      !isRecord(item) ||
      typeof item.mentorId !== "string" ||
      (!ids.has(item.mentorId) &&
        !(appsScript && isCalendarMentorId(item.mentorId))) ||
      !seen.has(item.mentorId) ||
      !isTimestamp(item.start) ||
      !isTimestamp(item.end) ||
      Date.parse(item.start) >= Date.parse(item.end) ||
      !["Sesi", "Sedang tidak tersedia"].includes(String(item.publicLabel)) ||
      item.availabilityStatus !== "busy" ||
      (item.allDay !== undefined && typeof item.allDay !== "boolean")
    )
      throw new Error("Sesi jadwal tidak valid.");
    return {
      mentorId: item.mentorId,
      mentorDisplayName: appsScript
        ? mentors.find((mentor) => mentor.mentorId === item.mentorId)!
            .mentorDisplayName!
        : activeMentors.find((m) => m.id === item.mentorId)!.name,
      start: item.start,
      end: item.end,
      publicLabel: item.publicLabel as PublicEvent["publicLabel"],
      availabilityStatus: "busy",
      ...(typeof item.allDay === "boolean" ? { allDay: item.allDay } : {}),
      ...(item.course === "Kalkulus 1" || item.course === "Kalkulus 2"
        ? { course: item.course }
        : {}),
      ...(item.mode === "Online" || item.mode === "Offline"
        ? { mode: item.mode }
        : {}),
    };
  });
  return {
    weekStart,
    timeZone: "Asia/Jakarta",
    demo: false,
    events,
    mentors,
    ...(appsScript
      ? {
          source: "apps-script" as const,
          updatedAt: value.updatedAt as string | null,
          syncStatus: value.syncStatus as MentorSync["syncStatus"],
          partial: value.partial as boolean,
          ...(value.revision !== undefined
            ? { revision: value.revision as string }
            : {}),
          ...(value.cacheMode !== undefined
            ? { cacheMode: value.cacheMode as "ttl" | "changes" }
            : {}),
          ...(value.validUntil !== undefined
            ? { validUntil: value.validUntil as string | null }
            : {}),
        }
      : {}),
  };
}

async function requestSchedule(
  weekStart: string,
  options: { signal?: AbortSignal; scenario?: DemoScenario } = {},
): Promise<PublicSchedule> {
  if (brand.demo) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        options.signal?.removeEventListener("abort", abort);
        resolve();
      }, 250);
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (options.signal?.aborted) abort();
      else options.signal?.addEventListener("abort", abort, { once: true });
    });
    return createDemoSchedule(weekStart, options.scenario);
  }
  const response = await fetch(
    `/api/public-schedule?weekStart=${encodeURIComponent(weekStart)}&mentorId=all`,
    {
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok)
    throw new Error(
      "Data belum dapat diperbarui. Status ketersediaan belum diketahui.",
    );
  return validateSchedule(await response.json(), weekStart);
}

const CACHE_PREFIX = "vga-schedule-v2:";
const scheduleCache = new Map<
  string,
  { data: PublicSchedule; savedAt: number }
>();
const scheduleRequests = new Map<string, Promise<PublicSchedule>>();
const changeListeners = new Set<() => void>();
let cacheEpoch = 0;
let currentRevision = "";
let updates: EventSource | undefined;
let updatesHealthy = false;
let changeMode = false;
let changeTimer: ReturnType<typeof setTimeout> | undefined;

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

export function clearScheduleCache() {
  cacheEpoch++;
  scheduleCache.clear();
  scheduleRequests.clear();
  const store = storage();
  try {
    if (store)
      for (let index = store.length - 1; index >= 0; index--) {
        const key = store.key(index);
        if (key?.startsWith(CACHE_PREFIX)) store.removeItem(key);
      }
  } catch {
    /* Storage may be unavailable; memory cache still works. */
  }
}

function revisionFromStorage(): string {
  try {
    return storage()?.getItem("vga-schedule-revision") ?? "";
  } catch {
    return "";
  }
}

function rememberRevision(revision: string) {
  currentRevision = revision;
  try {
    storage()?.setItem("vga-schedule-revision", revision);
  } catch {
    /* optional storage */
  }
}

function baseCacheExpiry(data: PublicSchedule): number {
  if (data.demo) return Date.now() + 240_000;
  const fallback =
    data.updatedAt ??
    data.mentors.find((mentor) => mentor.updatedAt)?.updatedAt;
  return data.validUntil
    ? Date.parse(data.validUntil)
    : fallback
      ? Date.parse(fallback) + 300_000
      : Date.now() + 60_000;
}

export function scheduleCacheExpiresAt(data: PublicSchedule): number {
  const failed =
    data.source === "apps-script"
      ? data.syncStatus !== "success"
      : data.mentors.some((mentor) => mentor.syncStatus !== "success");
  // A failed refresh must retry soon, even if the retained snapshot had a long lease.
  if (!data.demo && failed) return Date.now() + 60_000;
  let expires = baseCacheExpiry(data);
  if (data.cacheMode === "changes" && !updatesHealthy) {
    expires = Math.min(
      expires,
      (scheduleCache.get(data.weekStart)?.savedAt ?? Date.now()) + 60_000,
    );
  }
  return expires;
}

function connectUpdates() {
  if (
    !changeMode ||
    updates ||
    !changeListeners.size ||
    typeof EventSource === "undefined"
  )
    return;
  updates = new EventSource("/api/schedule-updates");
  let disconnected = false;
  updates.addEventListener("revision", (event) => {
    try {
      const value = JSON.parse((event as MessageEvent).data);
      if (
        typeof value.revision !== "string" ||
        !/^[a-f0-9-]{36}$/.test(value.revision)
      )
        return;
      updatesHealthy = true;
      disconnected = false;
      const previous = currentRevision || revisionFromStorage();
      if (previous && previous !== value.revision) {
        clearScheduleCache();
        rememberRevision(value.revision);
        clearTimeout(changeTimer);
        changeTimer = setTimeout(() => {
          for (const listener of changeListeners) listener();
        }, 200);
      } else rememberRevision(value.revision);
    } catch {
      /* Ignore malformed change notices. */
    }
  });
  updates.onerror = () => {
    updatesHealthy = false;
    if (!disconnected) {
      disconnected = true;
      clearScheduleCache();
      for (const listener of changeListeners) listener();
    }
  };
}

export function subscribeScheduleChanges(listener: () => void): () => void {
  changeListeners.add(listener);
  connectUpdates();
  return () => {
    changeListeners.delete(listener);
    if (!changeListeners.size) {
      updates?.close();
      updates = undefined;
      updatesHealthy = false;
    }
  };
}

function rememberSchedule(data: PublicSchedule) {
  if (data.revision) {
    const previous = currentRevision || revisionFromStorage();
    if (previous && previous !== data.revision) clearScheduleCache();
    rememberRevision(data.revision);
  }
  changeMode = data.cacheMode === "changes";
  if (!changeMode) {
    updates?.close();
    updates = undefined;
    updatesHealthy = false;
  }
  if (scheduleCache.size >= 32)
    scheduleCache.delete(scheduleCache.keys().next().value!);
  const entry = { data, savedAt: Date.now() };
  scheduleCache.set(data.weekStart, entry);
  try {
    storage()?.setItem(CACHE_PREFIX + data.weekStart, JSON.stringify(entry));
  } catch {
    /* optional storage */
  }
  connectUpdates();
}

function cachedSchedule(week: string): PublicSchedule | undefined {
  let entry = scheduleCache.get(week);
  if (!entry) {
    try {
      const raw = storage()?.getItem(CACHE_PREFIX + week);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.savedAt === "number") {
          entry = {
            data: validateSchedule(parsed.data, week),
            savedAt: parsed.savedAt,
          };
          scheduleCache.set(week, entry);
        }
      }
    } catch {
      /* A corrupted entry is a cache miss. */
    }
  }
  if (!entry) return;
  if (entry.data.revision && !currentRevision && !revisionFromStorage())
    rememberRevision(entry.data.revision);
  changeMode = entry.data.cacheMode === "changes";
  connectUpdates();
  if (
    Date.now() < baseCacheExpiry(entry.data) &&
    (entry.data.syncStatus === "success" ||
      entry.data.mentors.some((mentor) => mentor.syncStatus === "success"))
  )
    return entry.data;
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

export function fetchPublicSchedule(
  weekStart: string,
  options: {
    signal?: AbortSignal;
    scenario?: DemoScenario;
    refresh?: boolean;
  } = {},
): Promise<PublicSchedule> {
  if (brand.demo) return requestSchedule(weekStart, options);
  if (options.signal?.aborted)
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  const cached = !options.refresh ? cachedSchedule(weekStart) : undefined;
  if (cached) return Promise.resolve(cached);
  let request = scheduleRequests.get(weekStart);
  if (!request) {
    const epoch = cacheEpoch;
    request = requestSchedule(weekStart).then((data) => {
      if (epoch === cacheEpoch) rememberSchedule(data);
      return data;
    });
    const ownedRequest = request;
    scheduleRequests.set(weekStart, request);
    void request
      .finally(() => {
        if (scheduleRequests.get(weekStart) === ownedRequest)
          scheduleRequests.delete(weekStart);
      })
      .catch(() => {});
  }
  return abortable(request, options.signal);
}
