import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { createViteScheduleMiddleware } from "./api/viteSchedule";

export default defineConfig(({ mode }) => {
  // Only the Node middleware consumes this environment. It is never exposed as client defines.
  const serverEnv = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: "vga-calendar-api",
        configureServer(server) {
          server.middlewares.use(createViteScheduleMiddleware(serverEnv));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createViteScheduleMiddleware(serverEnv));
        },
      },
    ],
    server: {
      // Generated license copies/cache can be briefly locked by Windows during writes.
      watch: {
        ignored: [
          "**/.npm-cache/**",
          "**/public/licenses/**",
          "**/dist-server/**",
        ],
      },
    },
    build: { target: "es2022" },
  };
});
