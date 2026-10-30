import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

describe("proxy (per-request CSP)", () => {
  it("gives every page response a fresh nonce and hands the same one to the render", () => {
    const first = proxy(new NextRequest("http://localhost:3000/"));
    const second = proxy(new NextRequest("http://localhost:3000/plan/new"));
    const csp = first.headers.get("content-security-policy");
    const nonce = nonceOf(csp);

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonceOf(second.headers.get("content-security-policy"))).not.toBe(nonce);
    // Next.js forwards overridden request headers to the render with this prefix.
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("upgrades insecure requests when the site is served over HTTPS", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://festivo.example");
    const csp = proxy(new NextRequest("http://localhost:3000/")).headers.get(
      "content-security-policy",
    );
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("skips API routes, static files and prefetches", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher?.source ?? ""}$`);
    expect(pattern.test("/plan/new")).toBe(true);
    for (const path of ["/api/plan", "/_next/static/chunk.js", "/prefs-init.js"]) {
      expect(pattern.test(path), path).toBe(false);
    }
    expect(matcher?.missing.map((m) => m.key)).toEqual([
      "next-router-prefetch",
      "purpose",
    ]);
  });
});
