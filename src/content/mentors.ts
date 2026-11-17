export interface Mentor {
  id: string;
  name: string;
  photo: string;
  bio: string;
  competencies: string[];
  marker: string;
  active: boolean;
  demo: boolean;
  publicationApproved: boolean;
  experience?: string;
  /** Public information only; never put private pending biodata in a client-side config. */
  fullName?: string;
  introduction?: string;
  education?: { institution: string; program: string; degree?: string }[];
  cvUrl?: string | null;
  cvPublicationApproved?: boolean;
}

export const mentors: Mentor[] = Array.from({ length: 5 }, (_, i) => ({
  id: `mentor-${i + 1}`,
  name: `Mentor ${String(i + 1).padStart(2, "0")}`,
  photo: "/mentors/placeholder.svg",
  bio: "Profil, foto, dan kompetensi resmi akan ditampilkan setelah mendapat persetujuan publikasi.",
  competencies: [],
  marker: `mentor-${i + 1}`,
  active: true,
  demo: true,
  publicationApproved: false,
  fullName: undefined,
  introduction: undefined,
  education: [],
  cvUrl: null,
  cvPublicationApproved: false,
}));

export const activeMentors = mentors.filter(
  (m) => m.active && (m.demo || m.publicationApproved),
);
