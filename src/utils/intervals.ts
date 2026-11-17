import { atWIB, OPEN_MINUTE, CLOSE_MINUTE, FRESH_MS } from "./dateTime.js";
import type {
  PublicEvent,
  MentorSync,
  PublicSchedule,
} from "../types/schedule.js";

export interface Interval {
  start: number;
  end: number;
}

export function hasFreshSchedule(
  schedule: PublicSchedule | null | undefined,
  now = Date.now(),
): boolean {
  return (
    !!schedule &&
    hasFreshSync(
      {
        mentorId: "all",
        syncStatus: schedule.syncStatus ?? "error",
        updatedAt: schedule.updatedAt ?? null,
        validUntil: schedule.validUntil,
      },
      now,
    )
  );
}
export interface PositionedEvent extends Interval {
  event: PublicEvent;
  column: number;
  columns: number;
}

export function hasFreshSync(
  sync: MentorSync | undefined,
  now = Date.now(),
): boolean {
  const updated = sync?.updatedAt ? Date.parse(sync.updatedAt) : NaN;
  const expires = sync?.validUntil
    ? Date.parse(sync.validUntil)
    : updated + FRESH_MS;
  return (
    sync?.syncStatus === "success" &&
    Number.isFinite(updated) &&
    now >= updated &&
    Number.isFinite(expires) &&
    now < expires
  );
}

export function dayInterval(event: PublicEvent, day: string): Interval | null {
  const origin = Date.parse(atWIB(day));
  const start = Math.max(
    OPEN_MINUTE,
    (Date.parse(event.start) - origin) / 60_000,
  );
  const end = Math.min(CLOSE_MINUTE, (Date.parse(event.end) - origin) / 60_000);
  return Number.isFinite(start) && Number.isFinite(end) && start < end
    ? { start, end }
    : null;
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals
    .filter((i) => i.start < i.end)
    .sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && interval.start <= last.end)
      last.end = Math.max(last.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}

export function getFreeIntervals(
  events: PublicEvent[],
  day: string,
  sync: MentorSync | undefined,
  now = Date.now(),
): Interval[] | null {
  if (!hasFreshSync(sync, now)) return null;
  const busy = mergeIntervals(
    events
      .filter((e) => e.mentorId === sync!.mentorId)
      .map((e) => dayInterval(e, day))
      .filter((v): v is Interval => v !== null),
  );
  const free: Interval[] = [];
  let cursor = OPEN_MINUTE;
  for (const interval of busy) {
    if (interval.start > cursor)
      free.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < CLOSE_MINUTE) free.push({ start: cursor, end: CLOSE_MINUTE });
  return free;
}

export function canProposeSession(
  free: Interval[] | null,
  start: number,
  duration: 90 | 120,
): boolean {
  if (
    !free ||
    ![90, 120].includes(duration) ||
    start < OPEN_MINUTE ||
    start + duration > CLOSE_MINUTE
  )
    return false;
  return free.some(
    (interval) => interval.start <= start && start + duration <= interval.end,
  );
}

/** Partition each connected overlap group into parallel columns; end is exclusive. */
export function layoutDayEvents(
  events: PublicEvent[],
  day: string,
): PositionedEvent[] {
  const sorted = events
    .map((event) => ({ event, interval: dayInterval(event, day) }))
    .filter(
      (v): v is { event: PublicEvent; interval: Interval } =>
        v.interval !== null,
    )
    .sort(
      (a, b) =>
        a.interval.start - b.interval.start || b.interval.end - a.interval.end,
    );
  const result: PositionedEvent[] = [];
  let group: PositionedEvent[] = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const flush = () => {
    group.forEach((e) => (e.columns = ends.length));
    result.push(...group);
    group = [];
    ends = [];
  };
  for (const { event, interval } of sorted) {
    if (interval.start >= groupEnd) flush();
    let column = ends.findIndex((end) => end <= interval.start);
    if (column < 0) column = ends.length;
    ends[column] = interval.end;
    group.push({ event, ...interval, column, columns: 1 });
    groupEnd = Math.max(groupEnd, interval.end);
  }
  flush();
  return result;
}
