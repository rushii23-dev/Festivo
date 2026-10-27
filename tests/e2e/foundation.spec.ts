import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/plan/new", "/missing-page"];

async function expectNoAxeViolations(page: Page) {
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
  for (const scheme of ["light", "dark"] as const) {
    for (const path of PAGES) {
      test(`${path} has no axe violations in ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("display settings popover has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Display settings" }).click();
    await expect(page.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
    await expectNoAxeViolations(page);
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a new event");
    await expect(page.locator("#main")).toBeFocused();
  });
});

test.describe("display preferences", () => {
  test("theme choice is saved across reloads", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Display settings" }).click();
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("reduce motion toggle is saved and applied", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    await page.getByRole("button", { name: "Display settings" }).click();
    await page.getByRole("switch", { name: "Reduce motion" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  });

  test("device reduced-motion setting is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await page.getByRole("button", { name: "Display settings" }).click();
    const toggle = page.getByRole("switch", { name: "Reduce motion" });
    await expect(toggle).toBeChecked();
    await expect(toggle).toBeDisabled();
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
