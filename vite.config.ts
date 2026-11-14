import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: { "/api": "http://127.0.0.1:3001" },
    // Generated license copies/cache can be briefly locked by Windows during writes.
    watch: { ignored: ["**/.npm-cache/**", "**/public/licenses/**", "**/dist-server/**"] },
  },
  build: { target: "es2022" },
});
