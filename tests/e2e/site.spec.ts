import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/programs",
  "/mentors",
  "/schedule",
  "/gallery",
  "/halaman-tidak-ada",
];
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
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
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
  await k2.getByRole("tab", { name: /Paket Rutin/ }).click();
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
  await expect(page.locator(".unknown-status")).toHaveCount(5);
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
  await expect(page.locator(".unknown-status")).toHaveCount(5);
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
