/**
 * Security headers. The CSP is nonce-based and built per request in proxy.ts;
 * the remaining headers are static and applied in next.config.ts. Both live
 * here as pure functions so tests can assert the exact policy.
 */

export interface HeaderOptions {
  /** `next dev` needs eval for React's debugging features. */
  isDev: boolean;
  /** Only send HSTS and upgrade-insecure-requests when served over HTTPS. */
  isHttps: boolean;
}

/** A fresh, unguessable nonce for one response. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Strict CSP: scripts run only with this response's nonce, or when loaded by
 * a script that has it ('strict-dynamic'); no inline event handlers, no eval
 * in production, no plugins, no framing.
 */
export function contentSecurityPolicy(
  nonce: string,
  { isDev, isHttps }: HeaderOptions,
): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes are used by Radix positioning; styles cannot run code.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`,
  );
  if (isHttps) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** Static hardening headers for every response, including API routes. */
export function securityHeaders({
  isHttps,
}: HeaderOptions): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ...(isHttps
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}
