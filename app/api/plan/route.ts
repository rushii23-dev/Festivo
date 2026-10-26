/**
 * POST /api/plan: generates a plan and streams progress as NDJSON (one JSON
 * event per line): progress events, then a final `plan` or `error` event.
 */
import { getProvider } from "@/lib/ai/getProvider";
import { errorResponse, guard, readJsonBody, validationError } from "@/lib/http/api";
import { BODY_LIMITS, PlanRequestSchema } from "@/lib/http/requests";
import { streamPlan } from "@/lib/plan/service";
import { detectInjection } from "@/lib/security/promptGuard";
import { cleanDeep } from "@/lib/security/sanitize";
import { todayIso } from "@/lib/timeline/dates";
import { eventDateProblem } from "@/lib/timeline/resolveDate";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const blocked = guard(request, 2);
  if (blocked) return blocked;

  const body = await readJsonBody(request, BODY_LIMITS.plan);
  if (!body.ok) return body.response;

  const parsed = PlanRequestSchema.safeParse(cleanDeep(body.value, 600));
  if (!parsed.success) return validationError(parsed.error);
  const { input, timeZone } = parsed.data;

  const today = todayIso(new Date(), timeZone);
  const dateProblem = eventDateProblem(input.date, today);
  if (dateProblem) {
    return errorResponse(400, "invalid-request", dateProblem, {
      fields: [{ path: "input.date", message: dateProblem }],
    });
  }

  const flags = detectInjection(
    [
      input.name,
      input.location,
      input.constraints.mustHaves,
      input.constraints.mustAvoid,
    ].join("\n"),
  );
  if (flags.length > 0)
    console.warn("[security] possible prompt injection in plan input", { flags });

  const encoder = new TextEncoder();
  const events = streamPlan(input, {
    provider: getProvider(),
    today,
    signal: request.signal,
  });
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    async cancel() {
      await events.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
