import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Jakarta",
    locale: "id-ID",
    trace: "retain-on-failure",
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : undefined,
  },
  webServer: [
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      env: {
        VITE_SCHEDULE_DEMO: "true",
        GOOGLE_APPS_SCRIPT_URL: "",
        API_SECRET: "",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        GOOGLE_REFRESH_TOKEN: "",
        GOOGLE_MENTOR_CALENDARS: "",
      },
    },
    {
      command: "node dist-server/api/server.js",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: false,
      env: {
        PORT: "3001",
        GOOGLE_APPS_SCRIPT_URL: "",
        API_SECRET: "",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        GOOGLE_REFRESH_TOKEN: "",
        GOOGLE_MENTOR_CALENDARS: "",
      },
    },
  ],
});
