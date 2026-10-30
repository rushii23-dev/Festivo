import { describe, expect, it } from "vitest";
import {
  API_CONTENT_SECURITY_POLICY,
  contentSecurityPolicy,
  createNonce,
  securityHeaders,
} from "@/lib/security/headers";

describe("security headers", () => {
  it("builds a nonce-based strict CSP", () => {
    const csp = contentSecurityPolicy("abc", { isDev: false, isHttps: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy("abc", { isDev: true, isHttps: false })).toContain(
      "'unsafe-eval'",
    );
  });

  it("never allows inline or remote scripts in production", () => {
    const csp = contentSecurityPolicy("abc", { isDev: false, isHttps: false });
    const scripts = /script-src ([^;]+)/.exec(csp)?.[1] ?? "";
    expect(scripts).not.toMatch(/unsafe-inline|https?:|\*/);
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("creates unique base64 nonces", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });

  it("adds HSTS only over HTTPS", () => {
    const keys = (isHttps: boolean) =>
      securityHeaders({ isDev: false, isHttps }).map((h) => h.key);
    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
  });

  it("isolates the origin and denies framing, sniffing and plugin policies", () => {
    const headers = Object.fromEntries(
      securityHeaders({ isDev: false, isHttps: false }).map((h) => [h.key, h.value]),
    );
    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Origin-Agent-Cluster": "?1",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
    expect(headers["Permissions-Policy"]).toMatch(/camera=\(\).*microphone=\(\)/);
  });

  it("locks API responses down completely", () => {
    expect(API_CONTENT_SECURITY_POLICY).toMatch(/^default-src 'none'/);
    expect(API_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });
});
