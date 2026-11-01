/**
 * POST /api/ideas: "More like this". Regenerates one idea category only, so
 * the rest of the plan is never re-sent to the model.
 */
import { getProvider } from "@/lib/ai/getProvider";
import {
  failureResponse,
  guard,
  json,
  readJsonBody,
  validationError,
} from "@/lib/http/api";
import { BODY_LIMITS, IdeasRequestSchema } from "@/lib/http/requests";
import { moreIdeas, toErrorEvent } from "@/lib/plan/service";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const blocked = guard(request);
  if (blocked) return blocked;

  const body = await readJsonBody(request, BODY_LIMITS.ideas);
  if (!body.ok) return body.response;

  const parsed = IdeasRequestSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  const { plan, category } = parsed.data;

  try {
    const ideas = await moreIdeas(plan, category, {
      provider: getProvider(),
      signal: request.signal,
    });
    return json({ ideas });
  } catch (error) {
    return failureResponse(toErrorEvent(error));
  }
}
