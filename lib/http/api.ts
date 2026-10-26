/**
 * Shared guards and responses for route handlers: origin check, per-IP rate
 * limiting, body size and content-type limits, and consistent error bodies
 * that never include stack traces, prompts or provider details.
 */
import "server-only";
import { z } from "zod";
import { clientKey, createRateLimiter } from "@/lib/security/rateLimit";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

/** AI requests allowed per client per minute (burst size), refilling continuously. */
export function rateLimitPerMinute(
  env: Record<string, string | undefined> = process.env,
): number {
  const value = Number(env.API_RATE_LIMIT_PER_MINUTE);
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 8;
}

const perMinute = rateLimitPerMinute();
export const apiLimiter = createRateLimiter({
  capacity: perMinute,
  refillPerSecond: perMinute / 60,
});

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: { path: string; message: string }[] };
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: { ...NO_STORE, ...(init.headers as Record<string, string> | undefined) },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Partial<ApiErrorBody["error"]> = {},
  headers: Record<string, string> = {},
): Response {
  return json({ error: { code, message, ...extra } } satisfies ApiErrorBody, {
    status,
    headers,
  });
}

export function validationError(
  error: z.ZodError,
  message = "Some details need another look.",
): Response {
  return errorResponse(400, "invalid-request", message, {
    fields: error.issues.slice(0, 20).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/**
 * Rejects cross-site browser requests (another site posting to our API with
 * a visitor's browser). Requests without an Origin header (curl, tests) pass.
 */
export function checkOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // Malformed Origin header: fall through to reject.
  }
  return errorResponse(403, "forbidden", "This request is not allowed.");
}

export function checkRateLimit(request: Request, cost = 1): Response | null {
  const decision = apiLimiter.take(clientKey(request.headers), cost);
  if (decision.allowed) return null;
  return errorResponse(
    429,
    "rate-limited",
    "You're going a little fast. Please wait a moment and try again.",
    {},
    { "Retry-After": String(decision.retryAfterSeconds) },
  );
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<BodyResult> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      response: errorResponse(415, "unsupported-media-type", "Send JSON."),
    };
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) {
    return {
      ok: false,
      response: errorResponse(413, "too-large", "That request is too large."),
    };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: errorResponse(413, "too-large", "That request is too large."),
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid-json", "The request body is not valid JSON."),
    };
  }
}

/** Runs the origin and rate-limit checks; returns a response to send if blocked. */
export function guard(request: Request, cost = 1): Response | null {
  return checkOrigin(request) ?? checkRateLimit(request, cost);
}

/** An IANA time zone the runtime understands, e.g. "Asia/Kolkata". */
export const TimeZoneSchema = z
  .string()
  .max(64)
  .refine(
    (zone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    },
    { error: "Unknown time zone." },
  );
