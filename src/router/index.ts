import { createRouter, createWebHistory } from "vue-router";
import { nextTick } from "vue";
import { brand } from "../content/brand";
import { pageMeta } from "./meta";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("../views/HomePage.vue") },
    { path: "/programs", component: () => import("../views/ProgramsPage.vue") },
    { path: "/mentors", component: () => import("../views/MentorsPage.vue") },
    { path: "/schedule", component: () => import("../views/SchedulePage.vue") },
    { path: "/gallery", component: () => import("../views/GalleryPage.vue") },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("../views/NotFoundPage.vue"),
    },
  ],
  async scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    if (to.hash) {
      await nextTick();
      return { el: to.hash, top: 110 };
    }
    return { top: 0 };
  },
});

router.afterEach(async (to, from) => {
  const meta = pageMeta[to.path] ?? {
    title: "Halaman tidak ditemukan — VGA Class",
    description:
      "Halaman yang kamu cari tidak ditemukan. Kembali ke beranda VGA Class.",
  };
  document.title = meta.title;
  document
    .querySelector('meta[name="robots"]')
    ?.setAttribute(
      "content",
      brand.indexable && pageMeta[to.path]
        ? "index, follow"
        : "noindex, nofollow",
    );
  for (const [name, content] of [
    ["description", meta.description],
    ["og:title", meta.title],
    ["og:description", meta.description],
  ]) {
    const selector = name.startsWith("og:") ? "property" : "name";
    const tag = document.querySelector(`meta[${selector}="${name}"]`);
    tag?.setAttribute("content", content);
  }
  if (brand.siteUrl) {
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = brand.siteUrl + to.path;
    let ogUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.append(ogUrl);
    }
    ogUrl.content = brand.siteUrl + to.path;
    document
      .querySelector('meta[property="og:image"]')
      ?.setAttribute("content", `${brand.siteUrl}/og.png`);
  }
  await nextTick();
  if (from.matched.length && to.path !== from.path)
    document
      .querySelector<HTMLElement>("#main")
      ?.focus({ preventScroll: true });
});
