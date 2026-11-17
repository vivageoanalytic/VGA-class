export type SyncStatus = "success" | "stale" | "error" | "unconfigured";
export interface PublicEvent {
  mentorId: string;
  mentorDisplayName: string;
  start: string;
  end: string;
  publicLabel: "Sesi" | "Sedang tidak tersedia";
  course?: "Kalkulus 1" | "Kalkulus 2";
  mode?: "Online" | "Offline";
  availabilityStatus: "busy";
  allDay?: boolean;
}
export interface MentorSync {
  mentorId: string;
  syncStatus: SyncStatus;
  updatedAt: string | null;
  mentorDisplayName?: string;
  validUntil?: string | null;
}
export interface PublicSchedule {
  weekStart: string;
  timeZone: "Asia/Jakarta";
  demo: boolean;
  events: PublicEvent[];
  mentors: MentorSync[];
  source?: "apps-script";
  syncStatus?: SyncStatus;
  updatedAt?: string | null;
  partial?: boolean;
  revision?: string;
  cacheMode?: "ttl" | "changes";
  validUntil?: string | null;
}
