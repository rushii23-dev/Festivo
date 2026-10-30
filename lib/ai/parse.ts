/**
 * Turns streamed model text into validated data: extract JSON, validate with
 * Zod, and on failure ask the model once to repair its own answer.
 */
import "server-only";
import type { z } from "zod";
import { buildRepairPrompt } from "./prompts";
import { AiOutputError, type AiProvider, type StructuredTask } from "./provider";

/** Pulls the JSON object out of a reply, tolerating code fences or stray prose. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end <= start) throw new SyntaxError("No JSON object in reply");
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

/** Human- and model-readable list of validation problems, capped in length. */
export function formatIssues(error: z.ZodError, max = 12): string {
  const lines = error.issues
    .slice(0, max)
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  if (error.issues.length > max) lines.push(`- …and ${error.issues.length - max} more`);
  return lines.join("\n");
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; issues: string };

export function parseStructured<T>(text: string, schema: z.ZodType<T>): ParseResult<T> {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return { ok: false, issues: "- (root): reply was not valid JSON" };
  }
  const result = schema.safeParse(json);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, issues: formatIssues(result.error) };
}

export interface GenerateOptions<T> {
  provider: AiProvider;
  task: StructuredTask;
  schema: z.ZodType<T>;
  signal?: AbortSignal | undefined;
  /** Called with the text received so far, for progress reporting. */
  onText?: (soFar: string) => void;
  /** Called once if the first reply was invalid and a repair is being attempted. */
  onRepair?: (issues: string) => void;
}

/**
 * Runs a structured task with one repair retry.
 * @throws AiOutputError if both attempts are invalid; AiProviderError on transport failure.
 */
export async function generateStructured<T>({
  provider,
  task,
  schema,
  signal,
  onText,
  onRepair,
}: GenerateOptions<T>): Promise<T> {
  const run = async (current: StructuredTask) => {
    let text = "";
    for await (const chunk of provider.stream(current, signal)) {
      text += chunk;
      onText?.(text);
    }
    return text;
  };

  const first = await run(task);
  const firstResult = parseStructured(first, schema);
  if (firstResult.ok) return firstResult.data;

  onRepair?.(firstResult.issues);
  const repairTask: StructuredTask = {
    ...task,
    prompt: buildRepairPrompt(first, firstResult.issues),
    context: { kind: "repair", original: task.context, issues: firstResult.issues },
  };
  const second = await run(repairTask);
  const secondResult = parseStructured(second, schema);
  if (secondResult.ok) return secondResult.data;

  throw new AiOutputError(
    "The AI reply did not match the plan format",
    secondResult.issues,
  );
}
