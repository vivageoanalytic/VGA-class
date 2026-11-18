import { handlePagesCalendar } from "../../api/cloudflarePages";

interface Env {
  CALENDAR_COORDINATOR?: DurableObjectNamespace;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) =>
  handlePagesCalendar(request, env.CALENDAR_COORDINATOR);
