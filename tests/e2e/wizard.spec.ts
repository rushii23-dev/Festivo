import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  choose,
  chooseOccasion,
  completeWizard,
  expectNoAxeViolations,
  inDays,
  next,
  openWizard,
  scenarios,
  type Scenario,
} from "./helpers";

test.describe("wizard flow", () => {
  for (const scenario of scenarios) {
    test(`generates a ${scenario.type.toLowerCase()} plan in demo mode`, async ({
      page,
    }) => {
      await completeWizard(page, scenario);
      await page.getByRole("button", { name: "Generate my plan" }).click();
      await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(scenario.name);
      await expect(
        page.getByRole("tab", { name: "Overview", selected: true }),
      ).toBeVisible();
    });
  }

  test("adapts to an online, ticketed meetup", async ({ page }) => {
    await openWizard(page);
    await chooseOccasion(page, "Meetups", "Book club");
    await next(page);
    await page.getByRole("textbox", { name: /Event name/ }).fill("Sunday Readers");
    await page.getByLabel(/Event date/).fill(inDays(40));
    await choose(page, "radio", "Online");
    await page.getByRole("textbox", { name: /City or time zone/ }).fill("Pune");
    await page.getByRole("textbox", { name: /Expected attendees/ }).fill("25");
    await next(page);
    await page.getByRole("textbox", { name: /Total budget/ }).fill("8000");
    await choose(page, "radio", "Paid tickets");
    await page.getByRole("textbox", { name: /Price per ticket/ }).fill("199");
    await expect(page.getByRole("slider", { name: "Venue" })).toHaveCount(0);
    await expect(
      page.getByRole("slider", { name: "Online platform & streaming" }),
    ).toBeVisible();
    await next(page);
    await next(page);
    // Online: no food or indoor/outdoor questions.
    await expect(page.getByRole("group", { name: /Dietary needs/ })).toHaveCount(0);
    await expect(page.getByRole("group", { name: /Indoors or outdoors/ })).toHaveCount(0);
    await next(page);
    await expect(page.getByRole("region", { name: "Budget" })).toContainText("₹199");
    await page.getByRole("button", { name: "Generate my plan" }).click();
    await page.waitForURL(/\/plan\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Book club in Pune")).toBeVisible();
    await page.getByRole("tab", { name: "Budget" }).click();
    await expect(
      page.getByRole("textbox", { name: "Planned for Online platform & streaming" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Planned for Venue" })).toHaveCount(0);
  });

  test("keeps answers after a reload", async ({ page }) => {
    await openWizard(page);
    await chooseOccasion(page, "Life moments", "Birthday");
    await next(page);
    await page.getByRole("textbox", { name: /Event name/ }).fill("Saved across reloads");
    await page.waitForTimeout(500); // debounced write
    await page.reload();
    await expect(page.getByRole("textbox", { name: /Event name/ })).toHaveValue(
      "Saved across reloads",
    );
    await expect(page.getByText("Step 2 of 6")).toBeVisible();
  });

  test("asks for an account once, then remembers it", async ({ page }) => {
    await page.goto("/plan/new");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page.getByRole("textbox", { name: /Your name/ })).toBeFocused();
    await expect(
      page.getByRole("textbox", { name: /Your name/ }),
    ).toHaveAccessibleDescription(/Tell us your name/);
    await page.getByRole("textbox", { name: /Your name/ }).fill("Meera Iyer");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Lovely to meet you, Meera.",
    );
    await page.getByRole("button", { name: "Begin planning" }).click();
    await expect(
      page.getByRole("heading", { name: "What are you celebrating, Meera?" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "What are you celebrating, Meera?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /your account/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Create your account",
    );
  });
});

test.describe("wizard accessibility", () => {
  test("every step, including error states, has no axe violations", async ({ page }) => {
    await page.goto("/plan/new");
    await expectNoAxeViolations(page, "account");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expectNoAxeViolations(page, "account with errors");
    await page.getByRole("textbox", { name: /Your name/ }).fill("Priya Sharma");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expectNoAxeViolations(page, "welcome");
    await page.getByRole("button", { name: "Begin planning" }).click();
    await expectNoAxeViolations(page, "type step");
    await next(page);
    await expectNoAxeViolations(page, "type step with error");
    await chooseOccasion(page, "Life moments", "Wedding");
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
    await tabTo(page, page.getByRole("textbox", { name: /Your name/ }));
    await page.keyboard.type("Kiran Rao");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: "Begin planning" }));
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "What are you celebrating, Kiran?" }),
    ).toBeFocused();
    await tabTo(page, page.getByRole("radio", { name: /^Life moments/ }));
    await page.keyboard.press("Space");
    await tabTo(page, page.getByRole("radio", { name: /^Wedding/ }));
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /^Engagement/ })).toBeChecked();
    await page.keyboard.press("ArrowRight");
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
