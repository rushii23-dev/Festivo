/** Shared steps for the end-to-end specs. */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const inDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export async function expectNoAxeViolations(page: Page, label: string) {
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

export const next = (page: Page) =>
  page.getByRole("button", { name: /^(Next|Review answers)$/ }).click();

export interface Scenario {
  type: "Wedding" | "Birthday" | "Community event";
  name: string;
  location: string;
  guests: string;
  budget: string;
  vibe: string;
}

export const scenarios: Scenario[] = [
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

export async function completeWizard(page: Page, s: Scenario) {
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
