/** Shared steps for the end-to-end specs. */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const inDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Waits for finite animations (fades, rises) to finish, so contrast is measured
 * on settled text rather than mid-fade. Endless loops, such as the marquee, are skipped.
 */
export async function settleAnimations(page: Page) {
  // Screens that load saved data show a busy skeleton first; their entrance starts after it.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  // Deferred parts of a screen (hidden tabs, the Refine sheet) show stand-ins until loaded.
  await expect(page.locator("[data-deferred]")).toHaveCount(0);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

export async function expectNoAxeViolations(page: Page, label: string) {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, label).toEqual([]);
}

/** Clicks the visible chip or card that wraps a (visually hidden) native input. */
export async function choose(
  page: Page,
  role: "radio" | "checkbox",
  name: string | RegExp,
) {
  const input = page.getByRole(role, { name });
  await page.locator("label").filter({ has: input }).click();
  await expect(input).toBeChecked();
}

/** Picks the kind of event, then the occasion inside it. */
export async function chooseOccasion(page: Page, group: string, occasion: string) {
  await choose(page, "radio", new RegExp(`^${group}`));
  await choose(page, "radio", new RegExp(`^${occasion}`));
}

export const next = (page: Page) =>
  page.getByRole("button", { name: /^(Next|Review answers)$/ }).click();

export interface Scenario {
  /** The planning family, as the dashboard names it. */
  type: "Wedding" | "Birthday" | "Community event";
  /** The kind of event and the occasion chosen on the wizard's first step. */
  group: string;
  occasion: string;
  name: string;
  location: string;
  guests: string;
  budget: string;
  vibe: string;
}

export const scenarios: Scenario[] = [
  {
    type: "Wedding",
    group: "Life moments",
    occasion: "Wedding",
    name: "Priya & Arjun",
    location: "Jaipur",
    guests: "250",
    budget: "2500000",
    vibe: "Traditional",
  },
  {
    type: "Birthday",
    group: "Life moments",
    occasion: "Birthday",
    name: "Maya turns 7",
    location: "Pune",
    guests: "25",
    budget: "40000",
    vibe: "Kid-friendly",
  },
  {
    type: "Community event",
    group: "Festivals",
    occasion: "Community festival",
    name: "Green Street Fair",
    location: "Bengaluru",
    guests: "400",
    budget: "150000",
    vibe: "Eco-friendly",
  },
];

/** Signs up on the account screen and passes the welcome, landing on step one. */
export async function createAccount(page: Page, name = "Priya Sharma") {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your account");
  await page.getByRole("textbox", { name: /Your name/ }).fill(name);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Lovely to meet you, ${name.split(" ")[0]}.`,
  );
  await page.getByRole("button", { name: "Begin planning" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan a new event");
}

/** A first-time visitor opening the wizard: account first, then step one. */
export async function openWizard(page: Page) {
  await page.goto("/plan/new");
  await createAccount(page);
}

export async function completeWizard(page: Page, s: Scenario) {
  await openWizard(page);
  await chooseOccasion(page, s.group, s.occasion);
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

/** Runs the wizard for a scenario and waits for its dashboard. */
export async function generatePlan(page: Page, s: Scenario) {
  await completeWizard(page, s);
  await page.getByRole("button", { name: "Generate my plan" }).click();
  await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(s.name);
}
