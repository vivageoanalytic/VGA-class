import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "./styles/global.css";
import { installLicensedFonts } from "./utils/loadFonts";

void installLicensedFonts().finally(() =>
  createApp(App).use(router).mount("#app"),
);
