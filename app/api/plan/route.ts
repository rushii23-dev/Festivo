/**
 * POST /api/plan: generates a plan and streams progress as NDJSON (one JSON
 * event per line): progress events, then a final `plan` or `error` event.
 * The event contract lives in `lib/plan/events.ts`.
 */
import { getProvider } from "@/lib/ai/getProvider";
import { errorResponse, guard, readJsonBody, validationError } from "@/lib/http/api";
import { BODY_LIMITS, PlanRequestSchema } from "@/lib/http/requests";
import { toNdjson } from "@/lib/plan/ndjson";
import { streamPlan } from "@/lib/plan/service";
import { reportInjection } from "@/lib/security/promptGuard";
import { cleanDeep } from "@/lib/security/sanitize";
import { todayIso } from "@/lib/timeline/dates";
import { eventDateProblem } from "@/lib/timeline/resolveDate";

export const maxDuration = 60;

/** A plan costs two rate-limit tokens: it is the largest AI call. */
const PLAN_COST = 2;

/**
 * Every string is cleaned and capped before validation. The cap sits above the
 * longest field's limit, so the schema still names a field that is too long.
 */
const STRING_CAP = 600;

export async function POST(request: Request): Promise<Response> {
  const blocked = guard(request, PLAN_COST);
  if (blocked) return blocked;

  const body = await readJsonBody(request, BODY_LIMITS.plan);
  if (!body.ok) return body.response;

  const parsed = PlanRequestSchema.safeParse(cleanDeep(body.value, STRING_CAP));
  if (!parsed.success) return validationError(parsed.error);
  const { input, timeZone } = parsed.data;

  const today = todayIso(new Date(), timeZone);
  const dateProblem = eventDateProblem(input.date, today);
  if (dateProblem) {
    return errorResponse(400, "invalid-request", dateProblem, {
      fields: [{ path: "input.date", message: dateProblem }],
    });
  }

  const { name, location, constraints } = input;
  reportInjection(
    "plan input",
    [name, location, constraints.mustHaves, constraints.mustAvoid].join("\n"),
  );

  const events = streamPlan(input, {
    provider: getProvider(),
    today,
    signal: request.signal,
  });
  return new Response(toNdjson(events), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
