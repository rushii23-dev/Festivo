/**
 * POST /api/refine: turns a natural-language request ("cut budget by 20%")
 * into a validated patch plus a preview of the patched plan and a change list.
 * Nothing is saved here; the client applies the preview only if the user accepts.
 */
import { getProvider } from "@/lib/ai/getProvider";
import {
  errorResponse,
  guard,
  json,
  readJsonBody,
  validationError,
} from "@/lib/http/api";
import { BODY_LIMITS, RefineRequestSchema } from "@/lib/http/requests";
import { refinePlan, toErrorEvent } from "@/lib/plan/service";
import { detectInjection } from "@/lib/security/promptGuard";
import { cleanText } from "@/lib/security/sanitize";
import { todayIso } from "@/lib/timeline/dates";

export const maxDuration = 60;

const STATUS: Record<string, number> = {
  provider: 502,
  "invalid-output": 502,
  "invalid-request": 422,
  internal: 500,
};

export async function POST(request: Request): Promise<Response> {
  const blocked = guard(request);
  if (blocked) return blocked;

  const body = await readJsonBody(request, BODY_LIMITS.refine);
  if (!body.ok) return body.response;

  const parsed = RefineRequestSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  const { plan, timeZone } = parsed.data;
  const instruction = cleanText(parsed.data.instruction, 300);

  const flags = detectInjection(instruction);
  if (flags.length > 0)
    console.warn("[security] possible prompt injection in refine", { flags });

  try {
    const result = await refinePlan(plan, instruction, {
      provider: getProvider(),
      today: todayIso(new Date(), timeZone),
      signal: request.signal,
    });
    return json(result);
  } catch (error) {
    const event = toErrorEvent(error);
    return errorResponse(STATUS[event.code] ?? 500, event.code, event.message);
  }
}
