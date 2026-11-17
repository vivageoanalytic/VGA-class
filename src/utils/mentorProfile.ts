import type { Mentor } from "../content/mentors";
import { safeHttpsUrl } from "./urls";

export function getPublicCvUrl(mentor: Mentor): string | null {
  if (
    !mentor.publicationApproved ||
    !mentor.cvPublicationApproved ||
    mentor.demo ||
    !mentor.cvUrl
  )
    return null;
  if (/^\/cv\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(mentor.cvUrl))
    return mentor.cvUrl;
  return safeHttpsUrl(mentor.cvUrl);
}
