import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  completeWizard,
  expectNoAxeViolations,
  scenarios,
  type Scenario,
} from "./helpers";

const TABS = ["Overview", "Budget", "Timeline", "Vendors", "Ideas"] as const;

async function generatePlan(page: Page, scenario: Scenario) {
  await completeWizard(page, scenario);
  await page.getByRole("button", { name: "Generate my plan" }).click();
  await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(scenario.name);
}

const activePanel = (page: Page) => page.getByRole("tabpanel");

test.describe("dashboard flow", () => {
  for (const scenario of scenarios) {
    test(`${scenario.type}: edit budget, tick a task, export .ics`, async ({ page }) => {
      await generatePlan(page, scenario);

      // Edit the budget: totals follow the typed amount.
      await page.getByRole("tab", { name: "Budget" }).click();
      await expect(page).toHaveURL(/#budget$/);
      const venue = page.getByRole("textbox", { name: "Planned for Venue" });
      await venue.fill("1000");
      const planned = activePanel(page).locator("dt", { hasText: /^Planned$/ });
      await expect(planned.locator("+ dd")).not.toHaveText(
        `₹${Number(scenario.budget).toLocaleString("en-IN")}`,
      );
      await page.getByRole("button", { name: "Rebalance unlocked lines" }).click();
      await expect(planned.locator("+ dd")).toHaveText(
        `₹${Number(scenario.budget).toLocaleString("en-IN")}`,
      );

      // Tick the first task; the edit survives a reload.
      await page.getByRole("tab", { name: "Timeline" }).click();
      const first = activePanel(page).getByRole("checkbox").first();
      await first.check();
      await expect(page.getByRole("status")).toContainText("Done:");
      await page.waitForTimeout(500); // debounced storage write
      await page.reload();
      await expect(
        page.getByRole("tab", { name: "Timeline", selected: true }),
      ).toBeVisible();
      await expect(activePanel(page).getByRole("checkbox").first()).toBeChecked();

      // Export the calendar.
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download calendar (.ics)" }).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(/\.ics$/);
      const ics = await readFile(await file.path(), "utf8");
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain(`SUMMARY:${scenario.name.replace(/[,;]/g, "\\$&")}`);
    });
  }

  test("refine with AI previews and applies a change", async ({ page }) => {
    await generatePlan(page, scenarios[1] as Scenario);
    await page.getByRole("button", { name: "Refine with AI" }).click();
    const dialog = page.getByRole("dialog", { name: "Refine with AI" });
    await expect(
      dialog.getByRole("textbox", { name: "What should change?" }),
    ).toBeFocused();
    await dialog
      .getByRole("textbox", { name: "What should change?" })
      .fill("Cut the budget by 20%");
    await dialog.getByRole("button", { name: "Suggest changes" }).click();
    await expect(dialog.getByText("Total budget: ₹40,000 to ₹32,000")).toBeVisible();
    await dialog.getByRole("button", { name: "Apply changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("₹32,000").first()).toBeVisible();
  });
});

test.describe("dashboard accessibility", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`every tab has no axe violations in ${scheme} theme`, async ({ page }) => {
      test.slow(); // seven full-page axe scans
      await page.emulateMedia({ colorScheme: scheme });
      await generatePlan(page, scenarios[0] as Scenario);
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      for (const tab of TABS) {
        await page.getByRole("tab", { name: tab }).click();
        await expect(page.getByRole("tab", { name: tab, selected: true })).toBeVisible();
        await expectNoAxeViolations(page, `${tab} (${scheme})`);
      }
      await page.getByRole("tab", { name: "Timeline" }).click();
      await page.getByRole("radio", { name: "Day-of run sheet" }).check({ force: true });
      await expectNoAxeViolations(page, `run sheet (${scheme})`);
      await page.getByRole("button", { name: "Refine with AI" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoAxeViolations(page, `refine panel (${scheme})`);
    });
  }

  test("does not scroll sideways at 320px", async ({ page }) => {
    await generatePlan(page, scenarios[0] as Scenario);
    await page.setViewportSize({ width: 320, height: 700 });
    for (const tab of TABS) {
      await page.getByRole("tab", { name: tab }).click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, tab).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("dashboard keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard flow is checked on desktop");

  test("arrow keys move between tabs and Tab enters the panel", async ({ page }) => {
    await generatePlan(page, scenarios[1] as Scenario);
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Budget" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Budget", selected: true })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Ideas", selected: true })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("tab", { name: "Timeline", selected: true }),
    ).toBeFocused();

    // Tab leaves the tab list and lands on the Timeline panel itself.
    await page.keyboard.press("Tab");
    await expect(activePanel(page)).toBeFocused();

    // Tick a task with the keyboard.
    const box = activePanel(page).getByRole("checkbox").first();
    await box.focus();
    await page.keyboard.press("Space");
    await expect(box).toBeChecked();
  });
});
