import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAppsScriptCalendarService } from "../../api/appsScriptCalendar";
import { addDays, atWIB, startOfWeek } from "../../src/utils/dateTime";
import { localDate } from "../../src/utils/dateTime";
import { randomUUID } from "node:crypto";
import { createServer as createViteServer } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { createViteScheduleMiddleware } from "../../api/viteSchedule";

const routes = [
  "/",
  "/programs",
  "/mentors",
  "/schedule",
  "/gallery",
  "/halaman-tidak-ada",
];
test("Vite menyediakan API JSON di origin yang sama", async ({ request }) => {
  const response = await request.get(
    `/api/public-schedule?weekStart=${startOfWeek()}&mentorId=all`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = await response.json();
  expect(body.demo).toBe(false);
  expect(body.events).toEqual([]);
  expect((await request.get("/api/unknown")).status()).toBe(404);
  expect((await request.post("/api/public-schedule")).status()).toBe(405);
});
test("Cache tidak mengambil ulang sumber saat navigasi; perubahan kalender memperbarui halaman", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const callbackSecret = "TEST_ONLY_WEBHOOK_SECRET_0123456789";
  const day = localDate();
  let schedules = [
    {
      mentor: "Mentor dari cache API",
      title: "Sesi belajar",
      start: atWIB(day, 540),
      end: atWIB(day, 600),
      allDay: false,
    },
  ];
  let sourceCalls = 0;
  const middleware = createViteScheduleMiddleware(
    {
      GOOGLE_APPS_SCRIPT_URL:
        "https://script.google.com/macros/s/CACHE_TEST/exec",
      API_SECRET: "TEST_ONLY_SECRET",
      CALENDAR_CACHE_MODE: "changes",
      CALENDAR_WEBHOOK_SECRET: callbackSecret,
    },
    {
      fetcher: async () => {
        sourceCalls++;
        return new Response(
          JSON.stringify({
            success: true,
            timezone: "Asia/Jakarta",
            count: schedules.length,
            schedules,
            warnings: [],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );
  const app = await createViteServer({
    configFile: false,
    envDir: false,
    cacheDir: ".npm-cache/vite-notification-test",
    define: { "import.meta.env.VITE_SCHEDULE_DEMO": JSON.stringify("false") },
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: "cache-test-api",
        configureServer(server) {
          server.middlewares.use(middleware);
        },
      },
    ],
    server: { host: "127.0.0.1", port: 4185, strictPort: false },
  });
  await app.listen();
  const address = app.httpServer!.address();
  if (!address || typeof address === "string")
    throw new Error("Test server unavailable");
  const origin = `http://127.0.0.1:${address.port}`;
  const notify = (changeId = randomUUID()) =>
    request.post(origin + "/api/calendar-changed", {
      headers: { Authorization: "Bearer " + callbackSecret },
      data: { changeId },
    });
  try {
    await page.goto(origin + "/schedule");
    await expect(page.locator(".calendar-event")).toHaveCount(1);
    await page.goto(origin + "/");
    await expect(page.locator(".preview-session")).toHaveCount(1);
    await page.goto(origin + "/schedule");
    await expect(page.locator(".calendar-event")).toHaveCount(1);
    expect(sourceCalls).toBe(1);
    await page.getByRole("button", { name: "Perbarui jadwal" }).click();
    await expect(page.locator(".calendar-event")).toHaveCount(1);
    expect(sourceCalls).toBe(1);
    schedules = [];
    const deletion = randomUUID();
    expect((await notify(deletion)).status()).toBe(202);
    await expect(page.locator(".calendar-event")).toHaveCount(0);
    await expect(page.locator(".free-intervals")).toContainText("07.00–21.00");
    expect(sourceCalls).toBe(2);
    expect((await notify(deletion)).status()).toBe(202);
    expect(sourceCalls).toBe(2);
    schedules = [
      {
        mentor: "Mentor dari cache API",
        title: "Sesi belajar",
        start: atWIB(day, 540),
        end: atWIB(day, 600),
        allDay: false,
      },
    ];
    await notify();
    await expect(page.locator(".calendar-event")).toHaveCount(1);
    expect(sourceCalls).toBe(3);
    schedules[0] = {
      ...schedules[0]!,
      start: atWIB(day, 660),
      end: atWIB(day, 720),
    };
    await notify();
    await expect(page.locator(".event-time")).toContainText("11.00");
    expect(sourceCalls).toBe(4);
  } finally {
    await page.close();
    await app.close();
  }
});
test("JSON Apps Script asli tampil dengan nama kalender, filter, all-day, partial dan kosong", async ({
  page,
}) => {
  let mode: "full" | "partial" | "empty" = "full";
  let requests = 0;
  await page.route("**/api/public-schedule*", async (route) => {
    requests++;
    const week =
      new URL(route.request().url()).searchParams.get("weekStart") ??
      startOfWeek();
    const schedules =
      mode === "empty"
        ? []
        : [
            {
              mentor: "VGA Tutor",
              title: "Sesi belajar",
              start: atWIB(week),
              end: atWIB(addDays(week, 1)),
              allDay: true,
            },
            {
              mentor: "VGA Tutor Zaky",
              title: "Sesi belajar",
              start: atWIB(addDays(week, 1), 600),
              end: atWIB(addDays(week, 1), 720),
              allDay: false,
            },
            {
              mentor: "Kalender kosong minggu ini",
              title: "Sesi belajar",
              start: atWIB(addDays(week, -5), 600),
              end: atWIB(addDays(week, -5), 720),
              allDay: false,
            },
          ];
    const originalJson = {
      success: true,
      timezone: "Asia/Jakarta",
      count: schedules.length,
      schedules,
      warnings:
        mode === "partial" ? ["One calendar could not be processed"] : [],
    };
    const data = await createAppsScriptCalendarService(
      {
        url: "https://script.google.com/macros/s/TEST/exec",
        secret: "TEST_ONLY_SECRET",
      },
      {
        fetcher: async () =>
          new Response(JSON.stringify(originalJson), {
            headers: { "Content-Type": "application/json" },
          }),
      },
    ).getSchedule(week);
    await route.fulfill({ json: data });
  });
  await page.goto("http://127.0.0.1:3001/schedule");
  await expect(page.locator(".calendar-event")).toHaveCount(2);
  await expect(
    page.locator(".event-time").filter({ hasText: "Seharian" }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".mentor-filter")
      .getByRole("button", { name: "VGA Tutor", exact: true }),
  ).toBeVisible();
  const emptyMentor = page
    .locator(".availability-row")
    .filter({ hasText: "Kalender kosong minggu ini" });
  await expect(emptyMentor).toContainText("07.00–21.00");
  await expect(emptyMentor).toContainText("Tersedia untuk diajukan");
  await page
    .locator(".mentor-filter")
    .getByRole("button", { name: "VGA Tutor Zaky", exact: true })
    .click();
  await expect(page.locator(".calendar-event")).toHaveCount(1);
  await expect(page.locator(".calendar-event")).toContainText("VGA Tutor Zaky");
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.locator(".preview-session")).toHaveCount(2);
  expect(requests).toBe(1);
  mode = "partial";
  await page.goto("http://127.0.0.1:3001/schedule");
  await page.getByRole("button", { name: "Perbarui jadwal" }).click();
  await expect(page.locator(".calendar-event")).toHaveCount(2);
  await expect(page.locator(".error-notice")).toContainText(
    "Sebagian jadwal belum lengkap",
  );
  await expect(page.locator(".unknown-status")).toHaveCount(3);
  await expect(page.locator(".free-intervals")).toHaveCount(0);
  mode = "empty";
  await page.reload();
  await page.getByRole("button", { name: "Perbarui jadwal" }).click();
  await expect(page.locator(".calendar-event")).toHaveCount(0);
  await expect(page.locator(".error-notice")).toHaveCount(0);
  await expect(page.locator(".availability-list")).toContainText(
    "Belum ada mentor dengan jadwal tercatat",
  );
});
test("Semua route, metadata dan aset bekerja tanpa error browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeAttached();
    await expect(page).toHaveTitle(/VGA Class/);
    const contacts = page.locator('a[href*="wa.me"]');
    expect(await contacts.count()).toBeGreaterThan(0);
    expect(
      await contacts.evaluateAll((links) =>
        links.every(
          (link) =>
            link
              .getAttribute("href")
              ?.startsWith("https://wa.me/6285142296149?") &&
            link.getAttribute("rel") === "noopener noreferrer",
        ),
      ),
    ).toBe(true);
    await expect(page.locator(".site-header .brand-logo")).toBeVisible();
    await page.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (image) => {
          if (image instanceof HTMLImageElement) {
            image.loading = "eager";
            await image.decode().catch(() => {});
          }
        }),
      );
    });
    const broken = await page
      .locator("img")
      .evaluateAll((images) =>
        images
          .filter(
            (img): img is HTMLImageElement =>
              img instanceof HTMLImageElement &&
              img.complete &&
              img.naturalWidth === 0,
          )
          .map((img) => img.src),
      );
    expect(broken).toEqual([]);
  }
  expect(errors).toEqual([]);
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`Layout ${width}px tidak meluap di luar area tabel/kalender`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes.slice(0, 5)) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      if (route === "/schedule")
        await expect(page.locator(".week-grid")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      expect(dimensions.scroll, `${route}, lebar ${width}`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
    }
  });
}

test("Menu mobile, FAQ dan navigasi banner", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tutup menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "Mentors" })
    .click();
  await expect(page).toHaveURL(/\/mentors$/);
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("button", { name: "Banner berikutnya" }).click();
  await expect(page.locator("h1")).toContainText("Ritmemu.");
  await page.locator("summary").first().click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});

test("Tabel paket mendukung klik dan keyboard; latihan khusus offline", async ({
  page,
}) => {
  await page.goto("/programs");
  const k2 = page.locator("#kalkulus-2");
  await expect(
    k2.getByRole("heading", { name: "Pilih paket belajar" }),
  ).toBeVisible();
  await expect(
    k2.getByRole("tab", { name: "Paket Rutin", exact: true }),
  ).toContainText("Lihat rincian");
  await k2.getByRole("tab", { name: /Paket Rutin/ }).click();
  await expect(
    k2.getByRole("tab", { name: "Paket Rutin", exact: true }),
  ).toContainText("Sedang ditampilkan");
  await expect(
    k2.getByRole("tab", { name: "Paket Satuan", exact: true }),
  ).toContainText("Lihat rincian");
  await expect(k2.locator("table")).toContainText("Rp865.000");
  await expect(k2.locator("tbody tr").nth(5).locator("td").first()).toHaveText(
    "—",
  );
  await k2.getByRole("tab", { name: /Paket Rutin/ }).press("ArrowRight");
  await expect(k2.getByRole("tab", { name: /Latihan Soal/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(k2.locator("tbody tr")).toHaveCount(5);
  await expect(k2.locator("table")).not.toContainText("90 menit");
});

test("Galeri: filter, lightbox, keyboard, dan pemulihan fokus", async ({
  page,
}) => {
  await page.goto("/gallery");
  await page
    .getByRole("button", { name: "Belajar online", exact: true })
    .click();
  await expect(page.locator(".gallery-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Semua", exact: true }).click();
  const image = page.locator(".gallery-item").first();
  await image.click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lightbox-title")).toContainText(
    "Konsep terhubung",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  await expect(image).toBeFocused();
});

test("Kalender: navigasi minggu, filter, overlap, partial/stale/error dan kosong sukses", async ({
  page,
}) => {
  await page.goto("/schedule");
  await expect(page.locator(".week-grid")).toBeVisible();
  await expect(page.locator(".calendar-event")).toHaveCount(12);
  const before = await page.locator(".week-navigation h2").textContent();
  await page.getByRole("button", { name: "Minggu berikutnya" }).click();
  await expect(page.locator(".week-navigation h2")).not.toHaveText(before!);
  await page.getByRole("button", { name: "Minggu ini", exact: true }).click();
  await expect(page.locator(".week-navigation h2")).toHaveText(before!);
  await page.getByRole("button", { name: "Mentor 01", exact: true }).click();
  await expect(page.locator(".calendar-event")).toHaveCount(3);
  await expect(page.locator(".availability-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Semua mentor", exact: true }).click();
  await page.getByLabel("Skenario data contoh").selectOption("partial");
  await expect(page.locator(".availability-row").last()).toContainText(
    "Status belum diketahui",
  );
  await expect(page.locator(".free-intervals")).toHaveCount(4);
  await page.getByLabel("Skenario data contoh").selectOption("stale");
  await expect(page.locator(".unknown-status")).toHaveCount(5);
  await expect(page.locator(".free-intervals")).toHaveCount(0);
  await page.getByLabel("Skenario data contoh").selectOption("error");
  await expect(page.locator(".unknown-status")).toHaveCount(5);
  await expect(page.locator(".calendar-event")).toHaveCount(0);
  await page.getByLabel("Skenario data contoh").selectOption("empty");
  await expect(page.locator(".free-intervals")).toHaveCount(5);
  await expect(page.locator(".free-intervals").first()).toContainText(
    "07.00–21.00",
  );
});

test("API produksi tanpa secrets: unknown, read-only, SEO dan 404", async ({
  request,
  page,
}) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const response = await request.get(
    `http://127.0.0.1:3001/api/public-schedule?weekStart=${today}`,
  );
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.demo).toBe(false);
  expect(
    body.mentors.every(
      (m: { syncStatus: string }) => m.syncStatus === "unconfigured",
    ),
  ).toBe(true);
  expect(body.events).toEqual([]);
  expect(
    (await request.post("http://127.0.0.1:3001/api/public-schedule")).status(),
  ).toBe(405);
  expect((await request.get("http://127.0.0.1:3001/tidak-ada")).status()).toBe(
    404,
  );
  expect(
    await (await request.get("http://127.0.0.1:3001/robots.txt")).text(),
  ).toContain("Disallow: /");
  const programs = await request.get("http://127.0.0.1:3001/programs");
  expect(await programs.text()).toContain(
    "<title>Program &amp; Harga Les Kalkulus — VGA Class</title>",
  );
  expect(programs.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await page.goto("http://127.0.0.1:3001/schedule");
  await expect(page.locator(".error-notice")).toBeVisible();
  await expect(page.locator(".mentor-filter")).not.toContainText("Mentor 01");
  await expect(page.locator(".free-intervals")).toHaveCount(0);
  await expect(page.locator(".demo-notice")).toHaveCount(0);
  await page.route("**/api/public-schedule*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Tidak tersedia"}',
    }),
  );
  await page.reload();
  await expect(page.locator(".error-notice")).toBeVisible();
  await expect(page.locator(".mentor-filter")).not.toContainText("Mentor 01");
  await expect(page.locator(".free-intervals")).toHaveCount(0);
  await expect(page.locator(".calendar-event")).toHaveCount(0);
});

test("Aksesibilitas dasar WCAG pada kelima halaman", async ({ page }) => {
  for (const route of routes.slice(0, 5)) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "/") await expect(page.locator("#faq")).toBeVisible();
    if (route === "/schedule")
      await expect(page.locator(".week-grid")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
  }
});

test("Reduced motion menonaktifkan autoplay, swipe tetap menavigasi banner", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Animasi otomatis dinonaktifkan sesuai preferensi perangkat",
    }),
  ).toBeDisabled();
  const hero = page.locator(".hero");
  await hero.evaluate((element) => {
    const start = new Touch({
      identifier: 1,
      target: element,
      clientX: 300,
      clientY: 200,
    });
    const end = new Touch({
      identifier: 1,
      target: element,
      clientX: 100,
      clientY: 200,
    });
    element.dispatchEvent(
      new TouchEvent("touchstart", { touches: [start], bubbles: true }),
    );
    element.dispatchEvent(
      new TouchEvent("touchend", { changedTouches: [end], bubbles: true }),
    );
  });
  await expect(page.locator("h1")).toContainText("Ritmemu.");
});

test("Tipografi lebih terbaca dan memakai webfont lokal yang baru", async ({
  page,
}) => {
  await page.goto("/programs");
  await page.locator("table").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontSize,
    nav: getComputedStyle(document.querySelector(".desktop-nav a")!).fontSize,
    table: getComputedStyle(document.querySelector("td")!).fontSize,
    lato: document.fonts.check('16px "Lato"'),
    display: document.fonts.check('80px "League Gothic Variable"'),
  }));
  expect(parseFloat(fonts.body)).toBeGreaterThanOrEqual(16);
  expect(parseFloat(fonts.nav)).toBeGreaterThanOrEqual(16);
  expect(parseFloat(fonts.table)).toBeGreaterThanOrEqual(16);
  expect(fonts.lato).toBe(true);
  expect(fonts.display).toBe(true);
});

test("Kartu mentor membuka profil lengkap, keyboard/fokus, CV placeholder dan jadwal terfilter", async ({
  page,
}) => {
  for (const route of ["/", "/mentors"]) {
    await page.goto(route);
    const trigger = page.getByRole("button", {
      name: "Lihat profil lengkap Mentor 01",
      exact: true,
    });
    await trigger.click();
    const profile = page.getByRole("dialog", {
      name: "Mentor 01",
      exact: true,
    });
    await expect(profile).toBeVisible();
    await expect(
      profile.getByRole("heading", { name: "Pendidikan" }),
    ).toBeVisible();
    await expect(
      profile.getByRole("heading", { name: "Pendekatan belajar" }),
    ).toHaveCount(0);
    await expect(
      profile.getByRole("heading", { name: "Bahasa pengantar" }),
    ).toHaveCount(0);
    await expect(
      profile.getByRole("button", { name: "CV belum tersedia" }),
    ).toBeDisabled();
    await expect(profile.locator('a[target="_blank"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(profile).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page
    .getByRole("button", {
      name: "Lihat profil lengkap Mentor 01",
      exact: true,
    })
    .click();
  const profile = page.getByRole("dialog", { name: "Mentor 01", exact: true });
  expect(
    await profile.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations.map((v) => v.id)).toEqual([]);
  await profile.getByRole("link", { name: "Lihat jadwal mentor" }).click();
  await expect(page).toHaveURL(/\/schedule\?mentor=mentor-1$/);
  await expect(
    page.getByRole("button", { name: "Mentor 01", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".availability-row")).toHaveCount(1);
});

test("Hardening produksi: headers, file internal, API 404, dan CSP tidak merusak UI", async ({
  page,
  request,
}) => {
  for (const path of [
    "/schedule",
    "/favicon.svg",
    "/favicon.ico",
    "/favicon-32x32.png",
    "/apple-touch-icon.png",
    "/api/unknown",
    "/.env",
    "/backup.zip",
    "/assets/app.js.map",
    "/credentials.json",
    "/%00",
  ]) {
    const response = await request.get(`http://127.0.0.1:3001${path}`);
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toContain(
      "object-src 'none'",
    );
    expect(response.headers()["content-security-policy"]).toContain(
      "style-src-elem 'self'",
    );
    if (path.startsWith("/api/")) {
      expect(response.status()).toBe(404);
      expect(response.headers()["content-type"]).toContain("application/json");
    } else if (
      ![
        "/schedule",
        "/favicon.svg",
        "/favicon.ico",
        "/favicon-32x32.png",
        "/apple-touch-icon.png",
      ].includes(path)
    )
      expect(response.status()).toBe(404);
    else {
      expect(response.status()).toBe(200);
      if (path === "/favicon.ico")
        expect(response.headers()["content-type"]).toContain("image/x-icon");
    }
  }
  const cspErrors: string[] = [];
  page.on("console", (msg) => {
    if (
      msg.type() === "error" &&
      /content.security.policy|violates.*directive/i.test(msg.text())
    )
      cspErrors.push(msg.text());
  });
  await page.goto("http://127.0.0.1:3001/mentors");
  await page
    .getByRole("button", {
      name: "Lihat profil lengkap Mentor 01",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Mentor 01", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("http://127.0.0.1:3001/schedule");
  await expect(page.locator(".week-grid")).toBeVisible();
  expect(cspErrors).toEqual([]);
});
