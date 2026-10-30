import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { resetProvider } from "@/lib/ai/getProvider";
import { apiLimiter } from "@/lib/http/api";
import { clearPlanCaches } from "@/lib/plan/service";

/** Intercepts all outbound HTTP; any unexpected request fails the test. */
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "mock");
  vi.stubEnv("MOCK_STREAM_DELAY_MS", "0");
  vi.stubEnv("GEMINI_API_KEY", "");
  // Upstream failures fail fast; the retry test turns retries back on.
  vi.stubEnv("GEMINI_RETRIES", "0");
  resetProvider();
  apiLimiter.reset();
  clearPlanCaches();
  // Server-side logging is expected in error paths; keep test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
