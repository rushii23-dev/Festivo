import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { settleAnimations } from "./helpers";

const PAGES = ["/", "/plan/new", "/missing-page"];

async function expectNoAxeViolations(page: Page) {
  // Let the entrance finish first: mid-fade text is half transparent.
  await settleAnimations(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    targets: v.nodes.map((n) => `${n.target.join(" ")} :: ${n.failureSummary ?? ""}`),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

test.describe("accessibility scan", () => {
  for (const path of PAGES) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoAxeViolations(page);
    });
  }

  test("stays light when the device prefers dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe("rgb(216, 203, 184)");
    await expect(page.getByRole("radiogroup", { name: "Theme" })).toHaveCount(0);
  });
});

test.describe("page structure", () => {
  test("has landmarks, one h1 and a language", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    // The headline's letters are split for the fade-in; its accessible name stays whole.
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Planned to the last petal.",
    );
  });

  test("hero renders without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start planning" }).first(),
    ).toBeVisible();
    await context.close();
  });
});

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard flow is checked on desktop");

  test("skip link is the first stop and jumps to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await page.keyboard.press("Tab");
    // The hero's call to action is the first stop inside main (the finale repeats it).
    await expect(
      page.getByRole("main").getByRole("link", { name: "Start planning" }).first(),
    ).toBeFocused();
  });

  test("focus moves to main after client-side navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Start planning" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Create your account",
    );
    await expect(page.locator("#main")).toBeFocused();
  });
});

test.describe("motion", () => {
  test("animates by default, with no switch to turn it off", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await expect(page.getByRole("switch", { name: "Reduce motion" })).toHaveCount(0);
  });

  test("a choice saved by the old switch no longer stops motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.evaluate(() =>
      localStorage.setItem("festivo:prefs", JSON.stringify({ reduceMotion: true })),
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });

  test("the device's reduced-motion setting is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  });
});

test("layout reflows at 320px without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
