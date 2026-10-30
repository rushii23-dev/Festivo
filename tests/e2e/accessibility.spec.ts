/**
 * Accessibility beyond the axe scans in the other specs: forced colours (Windows
 * High Contrast), 200% text size, page titles, and the landing page as people
 * with reduced motion get it.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  chooseOccasion,
  expectNoAxeViolations,
  generatePlan,
  inDays,
  next,
  openWizard,
  scenarios,
  type Scenario,
} from "./helpers";

const style = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

async function noSidewaysScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, label).toBeLessThanOrEqual(0);
}

test.describe("forced colours (Windows High Contrast)", () => {
  test.use({ colorScheme: "dark" });
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
  });

  test("the chosen event card and the wizard's progress stay visible", async ({
    page,
  }) => {
    await openWizard(page);
    await chooseOccasion(page, "Life moments", "Birthday");

    const chosen = page
      .locator("[data-choice-card]")
      .filter({ has: page.getByRole("radio", { name: /^Birthday/ }) });
    const other = page
      .locator("[data-choice-card]")
      .filter({ has: page.getByRole("radio", { name: /^Wedding/ }) });
    // Forced colours repaint outlines in the text colour, so the choice is marked by
    // an outline the other cards do not have at all.
    expect(await style(chosen, "outline-style")).toBe("solid");
    expect(await style(other, "outline-style")).toBe("none");
    // The selection dot is painted, not dropped with the background.
    expect(await style(chosen.locator("[data-fill]"), "background-color")).not.toBe(
      "rgba(0, 0, 0, 0)",
    );

    await next(page);
    const done = page.locator('[data-step-bar="done"]').first();
    const current = page.locator('[data-step-bar="current"]');
    const todo = page.locator('[data-step-bar="todo"]').first();
    const fills = await Promise.all(
      [done, current, todo].map((bar) => style(bar, "background-color")),
    );
    expect(new Set(fills).size, fills.join(" / ")).toBe(3);
  });

  test("the active dashboard tab keeps a visible underline", async ({ page }) => {
    await generatePlan(page, scenarios[1] as Scenario);
    const active = page.getByRole("tab", { name: "Overview", selected: true });
    const inactive = page.getByRole("tab", { name: "Budget" });
    expect(await style(active, "border-bottom-color")).not.toBe(
      await style(inactive, "border-bottom-color"),
    );
  });
});

test.describe("200% text size", () => {
  // WCAG 1.4.4: text resized to 200% with no loss of content or sideways scrolling.
  // On phones, doubled text is closer to 400% zoom; the 320px reflow tests cover that.
  test.skip(({ isMobile }) => isMobile, "Text resizing is checked on desktop");
  const enlarge = (page: Page) =>
    page.addStyleTag({ content: "html { font-size: 200% !important; }" });

  test("the landing page and the wizard reflow", async ({ page }) => {
    for (const path of ["/", "/missing-page"]) {
      await page.goto(path);
      await enlarge(page);
      await noSidewaysScroll(page, path);
    }
    await openWizard(page);
    await enlarge(page);
    await noSidewaysScroll(page, "wizard");
    await expect(
      page.getByRole("button", { name: /^(Next|Review answers)$/ }),
    ).toBeVisible();
  });

  test("the dashboard reflows on every tab", async ({ page }) => {
    await generatePlan(page, scenarios[0] as Scenario);
    await enlarge(page);
    for (const tab of ["Overview", "Budget", "Timeline", "Vendors", "Ideas"]) {
      await page.getByRole("tab", { name: tab }).click();
      await noSidewaysScroll(page, tab);
    }
  });
});

test.describe("visible keyboard focus", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard focus is checked on desktop");

  test("cards and chips show a focus ring around their hidden input", async ({
    page,
  }) => {
    await openWizard(page);
    const firstCard = page.locator("[data-choice-card]").first();
    await page.getByRole("radio").first().focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    expect(await style(firstCard, "outline-width")).toBe("3px");
    expect(await style(firstCard, "outline-color")).not.toBe("rgba(0, 0, 0, 0)");

    await chooseOccasion(page, "Life moments", "Wedding");
    await next(page);
    await page.getByRole("textbox", { name: /Event name/ }).fill("Focus check");
    await page.getByLabel(/Event date/).fill(inDays(90));
    await page.getByRole("textbox", { name: /City or place/ }).fill("Pune");
    await page.getByRole("textbox", { name: /Number of guests/ }).fill("50");
    await next(page);
    await page.getByRole("textbox", { name: /Total budget/ }).fill("100000");
    await next(page);
    // The style step: its heading has focus; Tab reaches the first style chip.
    await expect(page.locator("#wizard-step-title")).toBeFocused();
    await page.keyboard.press("Tab");
    const chip = page.locator(".choice").filter({ has: page.locator(":focus") });
    await expect(chip).toHaveCount(1);
    expect(await style(chip, "outline-width")).toBe("3px");
  });
});

test.describe("page titles", () => {
  test("every page names itself and the site", async ({ page }) => {
    const titles: string[] = [];
    for (const path of ["/", "/plan/new", "/plan/not-a-real-plan", "/missing-page"]) {
      await page.goto(path);
      const title = await page.title();
      expect(title, path).toMatch(/Festivo/);
      titles.push(title);
    }
    expect(new Set(titles).size).toBe(titles.length);
  });
});

test.describe("reduced motion", () => {
  test("the landing page is complete, still and accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    // Smooth scrolling is never started, so native and keyboard scrolling stay as they are.
    await expect(page.locator("html.lenis")).toHaveCount(0);
    // Every section's heading is present and readable without the scroll animation.
    for (const name of [/Counted back/, /Your celebration/]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await expectNoAxeViolations(page, "landing, reduced motion");
  });

  test("a returning planner's wizard step is announced as the page's focus", async ({
    page,
  }) => {
    await openWizard(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a new event");
    await chooseOccasion(page, "Life moments", "Wedding");
    await next(page);
    await expect(page.locator("#wizard-step-title")).toBeFocused();
  });
});
