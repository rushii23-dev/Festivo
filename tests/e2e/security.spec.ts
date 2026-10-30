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

test.describe("API hardening (production server)", () => {
  const plan = "/api/plan";

  test("API responses are locked down and never cached", async ({ request }) => {
    const response = await request.post(plan, { data: { input: {} } });
    expect(response.status()).toBe(400);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toMatch(/^default-src 'none'/);
    expect(headers["cache-control"]).toBe("no-store");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-permitted-cross-domain-policies"]).toBe("none");
    expect(headers["origin-agent-cluster"]).toBe("?1");
    const body = await response.text();
    expect(body).not.toMatch(/at \w+ \(|node_modules|stack/i);
  });

  test("refuses cross-site requests, wrong content types and oversized bodies", async ({
    request,
  }) => {
    const crossSite = await request.post(plan, {
      data: { input: {} },
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(crossSite.status()).toBe(403);

    const foreignOrigin = await request.post(plan, {
      data: { input: {} },
      headers: { origin: "https://evil.example" },
    });
    expect(foreignOrigin.status()).toBe(403);

    const text = await request.post(plan, {
      data: "{}",
      headers: { "content-type": "text/plain" },
    });
    expect(text.status()).toBe(415);

    const huge = await request.post(plan, {
      data: { input: { name: "x".repeat(40_000) } },
    });
    expect(huge.status()).toBe(413);
  });

  test("the browser never receives server-only configuration", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/_next/static/") && response.url().endsWith(".js")) {
        scripts.push(await response.text());
      }
    });
    await page.goto("/plan/new");
    await page.waitForLoadState("networkidle");
    expect(scripts.length).toBeGreaterThan(0);
    for (const source of scripts) {
      expect(source).not.toMatch(
        /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{30,}|generativelanguage/,
      );
    }
  });
});
