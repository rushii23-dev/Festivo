import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const inDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, label).toEqual([]);
}

/** Clicks the visible chip or card that wraps a (visually hidden) native input. */
async function choose(page: Page, role: "radio" | "checkbox", name: string | RegExp) {
  const input = page.getByRole(role, { name });
  await page.locator("label").filter({ has: input }).click();
  await expect(input).toBeChecked();
}

const next = (page: Page) =>
  page.getByRole("button", { name: /^(Next|Review answers)$/ }).click();

interface Scenario {
  type: "Wedding" | "Birthday" | "Community event";
  name: string;
  location: string;
  guests: string;
  budget: string;
  vibe: string;
}

const scenarios: Scenario[] = [
  {
    type: "Wedding",
    name: "Priya & Arjun",
    location: "Jaipur",
    guests: "250",
    budget: "2500000",
    vibe: "Traditional",
  },
  {
    type: "Birthday",
    name: "Maya turns 7",
    location: "Pune",
    guests: "25",
    budget: "40000",
    vibe: "Kid-friendly",
  },
  {
    type: "Community event",
    name: "Green Street Fair",
    location: "Bengaluru",
    guests: "400",
    budget: "150000",
    vibe: "Eco-friendly",
  },
];

async function completeWizard(page: Page, s: Scenario) {
  await page.goto("/plan/new");
  await choose(page, "radio", new RegExp(`^${s.type}`));
  await next(page);
  await page.getByRole("textbox", { name: /Event name/ }).fill(s.name);
  await page.getByLabel(/Event date/).fill(inDays(90));
  await page.getByRole("textbox", { name: /City or place/ }).fill(s.location);
  await page.getByRole("textbox", { name: /Number of guests/ }).fill(s.guests);
  await next(page);
  await page.getByRole("textbox", { name: /Total budget/ }).fill(s.budget);
  await next(page);
  await choose(page, "checkbox", s.vibe);
  await next(page);
  await choose(page, "checkbox", "Vegetarian");
  await next(page);
  await expect(page.getByRole("heading", { name: "Review and generate" })).toBeVisible();
}

test.describe("wizard flow", () => {
  for (const scenario of scenarios) {
    test(`generates a ${scenario.type.toLowerCase()} plan in demo mode`, async ({
      page,
    }) => {
      await completeWizard(page, scenario);
      await page.getByRole("button", { name: "Generate my plan" }).click();
      await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(scenario.name);
      await expect(page.getByText(/tasks, \d+ vendors and \d+ ideas/)).toBeVisible();
    });
  }

  test("keeps answers after a reload", async ({ page }) => {
    await page.goto("/plan/new");
    await choose(page, "radio", /^Birthday/);
    await next(page);
    await page.getByRole("textbox", { name: /Event name/ }).fill("Saved across reloads");
    await page.waitForTimeout(500); // debounced write
    await page.reload();
    await expect(page.getByRole("textbox", { name: /Event name/ })).toHaveValue(
      "Saved across reloads",
    );
    await expect(page.getByText("Step 2 of 6")).toBeVisible();
  });
});

test.describe("wizard accessibility", () => {
  test("every step, including error states, has no axe violations", async ({ page }) => {
    await page.goto("/plan/new");
    await expectNoAxeViolations(page, "type step");
    await next(page);
    await expectNoAxeViolations(page, "type step with error");
    await choose(page, "radio", /^Wedding/);
    await next(page);
    await next(page);
    await expect(page.getByRole("textbox", { name: /Event name/ })).toBeFocused();
    await expectNoAxeViolations(page, "basics with errors");
    await page.getByRole("textbox", { name: /Event name/ }).fill("Priya & Arjun");
    await page.getByLabel(/Event date/).fill(inDays(90));
    await page.getByRole("textbox", { name: /City or place/ }).fill("Jaipur");
    await page.getByRole("textbox", { name: /Number of guests/ }).fill("250");
    await next(page);
    await page.getByRole("textbox", { name: /Total budget/ }).fill("2500000");
    await expectNoAxeViolations(page, "budget");
    await next(page);
    await expectNoAxeViolations(page, "vibe");
    await next(page);
    await expectNoAxeViolations(page, "constraints");
    await next(page);
    await expectNoAxeViolations(page, "review");
  });

  test("reflows at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await completeWizard(page, scenarios[0] as Scenario);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("keyboard only", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard flow is checked on desktop");

  /** Presses Tab until `target` has focus (fails after 40 presses). */
  async function tabTo(page: Page, target: Locator) {
    for (let i = 0; i < 40; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error("Could not reach element with Tab");
  }

  test("completes the wizard and generates a plan without a mouse", async ({ page }) => {
    await page.goto("/plan/new");
    await tabTo(page, page.getByRole("radio", { name: /^Wedding/ }));
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /^Birthday/ })).toBeChecked();
    await tabTo(page, page.getByRole("button", { name: "Next" }));
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "The basics" })).toBeFocused();
    await tabTo(page, page.getByRole("textbox", { name: /Event name/ }));
    await page.keyboard.type("Keyboard party");
    await tabTo(page, page.getByRole("radio", { name: "On a set date" }));
    await page.keyboard.press("ArrowRight");
    await tabTo(page, page.getByRole("textbox", { name: /City or place/ }));
    await page.keyboard.type("Mumbai");
    await page.keyboard.press("Tab");
    await page.keyboard.type("30");
    await page.keyboard.press("Enter"); // implicit form submission from a text field

    await expect(page.getByRole("heading", { name: "Your budget" })).toBeFocused();
    await tabTo(page, page.getByRole("textbox", { name: /Total budget/ }));
    await page.keyboard.type("50000");
    await tabTo(page, page.getByRole("slider", { name: "Cake & desserts" }));
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("slider", { name: "Cake & desserts" })).toHaveAttribute(
      "aria-valuetext",
      /^A bit more/,
    );
    await tabTo(page, page.getByRole("button", { name: "Next" }));
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Vibe and style" })).toBeFocused();
    await tabTo(page, page.getByRole("checkbox", { name: "Playful" }));
    await page.keyboard.press("Space");
    await tabTo(page, page.getByRole("button", { name: "Next" }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Needs and limits" })).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: "Review answers" }));
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { name: "Review and generate" }),
    ).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: "Generate my plan" }));
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keyboard party");
  });
});
