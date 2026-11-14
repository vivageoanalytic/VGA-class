import { brand } from "../content/brand";
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
  const seen = new Set<string>();
  const mentors = value.mentors.map((item): MentorSync => {
    if (
      !isRecord(item) ||
      typeof item.mentorId !== "string" ||
      !ids.has(item.mentorId) ||
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
    };
  });
  const events = value.events.map((item): PublicEvent => {
    if (
      !isRecord(item) ||
      typeof item.mentorId !== "string" ||
      !ids.has(item.mentorId) ||
      !seen.has(item.mentorId) ||
      !isTimestamp(item.start) ||
      !isTimestamp(item.end) ||
      Date.parse(item.start) >= Date.parse(item.end) ||
      !["Sesi", "Sedang tidak tersedia"].includes(String(item.publicLabel)) ||
      item.availabilityStatus !== "busy"
    )
      throw new Error("Sesi jadwal tidak valid.");
    return {
      mentorId: item.mentorId,
      mentorDisplayName: activeMentors.find((m) => m.id === item.mentorId)!
        .name,
      start: item.start,
      end: item.end,
      publicLabel: item.publicLabel as PublicEvent["publicLabel"],
      availabilityStatus: "busy",
      ...(item.course === "Kalkulus 1" || item.course === "Kalkulus 2"
        ? { course: item.course }
        : {}),
      ...(item.mode === "Online" || item.mode === "Offline"
        ? { mode: item.mode }
        : {}),
    };
  });
  return { weekStart, timeZone: "Asia/Jakarta", demo: false, events, mentors };
}

export async function fetchPublicSchedule(
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
