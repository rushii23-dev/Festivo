/**
 * Provider-agnostic AI adapter. A provider only has to stream JSON text for a
 * structured task; parsing, repair, validation and caching live above it, so
 * Gemini can be swapped for another provider by adding one file.
 */
import "server-only";
import type { EventInput } from "@/lib/schemas/eventInput";
import type { IdeaCategory, Plan } from "@/lib/schemas/plan";

export type TaskKind = "plan" | "refine" | "ideas" | "repair";

/** Typed context alongside the prompt, so the mock provider can answer without parsing prose. */
export type TaskContext =
  | { kind: "plan"; input: EventInput; today: string }
  | { kind: "refine"; plan: Plan; instruction: string; today: string }
  | { kind: "ideas"; plan: Plan; category: IdeaCategory; excludeTitles: string[] }
  | { kind: "repair"; original: TaskContext; issues: string };

export interface StructuredTask {
  system: string;
  prompt: string;
  /** JSON Schema the response must follow. */
  schema: Record<string, unknown>;
  context: TaskContext;
  /** Rough output budget; providers may ignore it. */
  maxOutputTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  /** Identifies the model in cache keys, so switching models never serves stale output. */
  readonly model: string;
  /** Streams the raw JSON text in chunks. */
  stream(task: StructuredTask, signal?: AbortSignal): AsyncIterable<string>;
}

/** The provider failed (network, quota, auth). Safe to show "try again". */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AiProviderError";
  }
}

/** The model answered, but not with valid data, even after the repair retry. */
export class AiOutputError extends Error {
  constructor(
    message: string,
    readonly issues: string,
  ) {
    super(message);
    this.name = "AiOutputError";
  }
}

export async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}
