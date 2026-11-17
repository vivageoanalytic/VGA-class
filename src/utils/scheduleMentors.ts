import { activeMentors } from "../content/mentors.js";

export const isCalendarMentorId = (id: string): boolean =>
  /^calendar-[a-f0-9]{16}$/.test(id);
export const isScheduleMentorId = (id: string): boolean =>
  activeMentors.some((mentor) => mentor.id === id) || isCalendarMentorId(id);

export function scheduleMentorMarker(id: string): string {
  return (
    activeMentors.find((mentor) => mentor.id === id)?.marker ??
    (isCalendarMentorId(id)
      ? `mentor-${(parseInt(id.slice(-2), 16) % 5) + 1}`
      : "mentor-1")
  );
}

export function validMentorLabel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 120 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
