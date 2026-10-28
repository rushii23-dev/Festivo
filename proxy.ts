/**
 * Runs before every page request: creates a per-request nonce and sets the
 * strict Content-Security-Policy. Next.js reads the nonce from the request's
 * CSP header and applies it to its own scripts; the root layout applies it
 * to prefs-init.js.
 */
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, createNonce } from "@/lib/security/headers";

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce, {
    isDev: process.env.NODE_ENV === "development",
    isHttps: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, static files and prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|prefs-init.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
