import { createCalendarService, readCalendarConfig } from "./googleCalendar.js";
import {
  createAppsScriptCalendarService,
  readAppsScriptConfig,
  type AppsScriptDependencies,
} from "./appsScriptCalendar.js";

export function createScheduleService(
  env: Record<string, string | undefined>,
  dependencies: AppsScriptDependencies = {},
) {
  // A configured Apps Script endpoint takes precedence; failures never fall back to another source or demo.
  return env.GOOGLE_APPS_SCRIPT_URL?.trim()
    ? createAppsScriptCalendarService(readAppsScriptConfig(env), dependencies)
    : createCalendarService(readCalendarConfig(env), dependencies);
}
