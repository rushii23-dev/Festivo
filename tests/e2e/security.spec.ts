import { expect, test } from "@playwright/test";

test.describe("security headers", () => {
  test("pages send a strict CSP and hardening headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
    );
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the app runs under the CSP without violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy|Refused to/i.test(msg.text()))
        violations.push(msg.text());
    });
    await page.goto("/");
    // Smooth scrolling starts from a client component, which proves the app
    // hydrated and loaded its scripts under the policy.
    await expect(page.locator("html.lenis")).toHaveCount(1);
    expect(violations).toEqual([]);
  });
});
