import {
  pricing,
  type CourseId,
  type StudyMode,
  type Duration,
} from "../content/pricing";

/** Exact rational rounding: denominator supports fractional rupiah without floats. */
export function roundTo5000HalfUp(numerator: number, denominator = 1): number {
  if (
    !Number.isSafeInteger(numerator) ||
    numerator < 0 ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  ) {
    throw new RangeError(
      "Harga harus berupa rasio integer non-negatif yang valid.",
    );
  }
  const n = BigInt(numerator);
  const d = BigInt(denominator) * 5_000n;
  return Number((2n * n + d) / (2n * d)) * 5_000;
}

function isValid(
  course: CourseId,
  mode: StudyMode,
  duration: Duration,
  count: number,
  max: number,
): boolean {
  return (
    Object.hasOwn(pricing.hourlyRates, course) &&
    ["offline", "online"].includes(mode) &&
    [90, 120].includes(duration) &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= max
  );
}

export function getSingleSessionPrice(
  course: CourseId,
  mode: StudyMode,
  duration: Duration,
  count: number,
): number | null {
  if (
    !isValid(
      course,
      mode,
      duration,
      count,
      pricing.capacities.single[mode] ?? 0,
    )
  )
    return null;
  const base = roundTo5000HalfUp(
    pricing.hourlyRates[course] *
      duration *
      (mode === "online" ? pricing.onlinePercent : 100),
    60 * 100,
  );
  return roundTo5000HalfUp(
    base * (100 - pricing.groupDiscounts[count - 1]!),
    100,
  );
}

export function getRoutinePrice(
  course: CourseId,
  mode: StudyMode,
  duration: Duration,
  count: number,
): number | null {
  if (
    !isValid(
      course,
      mode,
      duration,
      count,
      pricing.capacities.routine[mode] ?? 0,
    )
  )
    return null;
  const single = getSingleSessionPrice(course, mode, duration, count);
  return single === null
    ? null
    : roundTo5000HalfUp(
        single * pricing.routineSessions * pricing.routinePercent,
        100,
      );
}

export function getPracticePrice(
  course: CourseId,
  count: number,
): number | null {
  if (
    !isValid(course, "offline", 120, count, pricing.capacities.practice.offline)
  )
    return null;
  return roundTo5000HalfUp(
    pricing.hourlyRates[course] *
      pricing.practiceHours *
      (100 - pricing.groupDiscounts[count - 1]!),
    100,
  );
}

export function getNonITSPrice(itsPrice: number): number {
  return roundTo5000HalfUp(itsPrice * pricing.nonITSPercent, 100);
}

export function formatPrice(value: number | null): string {
  return value === null
    ? "—"
    : `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}
