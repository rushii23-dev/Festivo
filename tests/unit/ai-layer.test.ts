import { describe, expect, it, vi } from "vitest";
import { readAiConfig } from "@/lib/ai/config";
import { chunkJson, createMockProvider, mockRefine, planToDraft } from "@/lib/ai/mock";
import { extractJson, generateStructured, parseStructured } from "@/lib/ai/parse";
import { buildPlanPrompt, buildRefinePrompt, planSnapshot } from "@/lib/ai/prompts";
import { AiOutputError, collect, type AiProvider } from "@/lib/ai/provider";
import { PlanDraftSchema, PlanPatchSchema, toProviderSchema } from "@/lib/ai/schemas";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { EventInputSchema } from "@/lib/schemas/eventInput";

const TODAY = "2026-10-26";
const input = EventInputSchema.parse({
  eventType: "wedding",
  name: "Priya & Arjun",
  date: { kind: "fixed", date: "2027-02-14" },
  location: "Jaipur",
  guestCount: 200,
  budget: { total: 2_000_000, currency: "INR" },
  vibes: ["traditional"],
});
const plan = buildMockPlan(input, {
  id: "p1",
  today: TODAY,
  now: new Date("2026-10-26T00:00:00Z"),
});

/** A provider that replays fixed replies, one per call. */
function scripted(replies: string[]): AiProvider & { prompts: string[] } {
  const prompts: string[] = [];
  let call = 0;
  return {
    name: "scripted",
    model: "test",
    prompts,
    async *stream(task) {
      prompts.push(task.prompt);
      yield replies[Math.min(call++, replies.length - 1)] ?? "";
    },
  };
}

describe("readAiConfig", () => {
  it("defaults to demo mode without a key", () => {
    expect(readAiConfig({})).toMatchObject({
      provider: "mock",
      geminiModel: "gemini-flash-latest",
    });
    expect(readAiConfig({ AI_PROVIDER: "gemini" }).provider).toBe("mock");
    expect(readAiConfig({ GEMINI_API_KEY: "your-gemini-api-key" }).provider).toBe("mock");
  });

  it("uses Gemini when a real key is set, unless mock is forced", () => {
    expect(readAiConfig({ GEMINI_API_KEY: "k" }).provider).toBe("gemini");
    expect(readAiConfig({ GEMINI_API_KEY: "k", AI_PROVIDER: "gemini" }).provider).toBe(
      "gemini",
    );
    expect(readAiConfig({ GEMINI_API_KEY: "k", AI_PROVIDER: "mock" }).provider).toBe(
      "mock",
    );
    expect(
      readAiConfig({ GEMINI_MODEL: "gemini-x", MOCK_STREAM_DELAY_MS: "5" }),
    ).toMatchObject({
      geminiModel: "gemini-x",
      mockDelayMs: 5,
    });
  });
});

describe("parsing", () => {
  it("extracts JSON from fences and surrounding prose", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":2} hope it helps')).toEqual({ a: 2 });
    expect(() => extractJson("no json")).toThrow(SyntaxError);
  });

  it("reports schema issues by path", () => {
    const result = parseStructured('{"explanation": 5}', PlanPatchSchema);
    expect(result).toEqual({
      ok: false,
      issues: expect.stringContaining("- explanation:"),
    });
    expect(parseStructured("{", PlanPatchSchema)).toEqual({
      ok: false,
      issues: "- (root): reply was not valid JSON",
    });
  });

  it("caps long issue lists", () => {
    const result = parseStructured(
      JSON.stringify({ budget: Array(10).fill({}) }),
      PlanDraftSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toMatch(/…and \d+ more/);
  });

  it("retries once with a repair prompt, then gives up", async () => {
    const good = JSON.stringify({ explanation: "ok" });
    const repaired = scripted(["nope", good]);
    const onRepair = vi.fn();
    const task = {
      system: "s",
      prompt: "p",
      schema: {},
      context: { kind: "refine", plan, instruction: "x", today: TODAY } as const,
    };
    await expect(
      generateStructured({ provider: repaired, task, schema: PlanPatchSchema, onRepair }),
    ).resolves.toEqual({ explanation: "ok" });
    expect(onRepair).toHaveBeenCalledOnce();
    expect(repaired.prompts[1]).toContain("<previous>nope</previous>");

    const broken = scripted(["nope", "still nope"]);
    await expect(
      generateStructured({ provider: broken, task, schema: PlanPatchSchema }),
    ).rejects.toBeInstanceOf(AiOutputError);
  });
});

describe("provider schema", () => {
  it("drops keys that structured-output modes reject", () => {
    const schema = JSON.stringify(toProviderSchema(PlanDraftSchema));
    expect(schema).not.toContain("additionalProperties");
    expect(schema).not.toContain("$schema");
    expect(schema).toContain('"daysBefore"');
  });
});

describe("prompts", () => {
  it("lists categories and wraps every free-text field", () => {
    const prompt = buildPlanPrompt({
      input,
      today: TODAY,
      eventDate: input.date.kind === "fixed" ? input.date.date : TODAY,
      daysAvailable: 111,
      flexible: false,
    });
    expect(prompt).toContain("Vendor categories to cover: venue, caterer");
    expect(prompt).toContain(
      '<user_data name="event_name">Priya &amp; Arjun</user_data>',
    );
    expect(prompt).toContain("Days available: 111");
    expect(prompt).not.toContain("Ceremonies:");
  });

  it("sends only the fields a refine may change", () => {
    const snapshot = JSON.parse(planSnapshot(plan)) as Record<string, unknown>;
    expect(Object.keys(snapshot)).toEqual([
      "occasion",
      "format",
      "date",
      "guestCount",
      "currency",
      "totalBudget",
      "budget",
      "tasks",
      "ideas",
    ]);
    expect(buildRefinePrompt(plan, "cheaper", TODAY)).toContain(
      '<user_data name="request">cheaper</user_data>',
    );
  });
});

describe("mock provider", () => {
  it("streams a valid draft in top-level chunks", async () => {
    const provider = createMockProvider();
    const text = await collect(
      provider.stream({
        system: "",
        prompt: "",
        schema: {},
        context: { kind: "plan", input, today: TODAY },
      }),
    );
    expect(PlanDraftSchema.safeParse(JSON.parse(text)).success).toBe(true);
    expect(chunkJson({ a: 1, b: [2] })).toEqual(['{"a":1', ',"b":[2]}']);
    expect(chunkJson([1])).toEqual(["[1]"]);
  });

  it("answers repair tasks with the original task's data", async () => {
    const text = await collect(
      createMockProvider().stream({
        system: "",
        prompt: "",
        schema: {},
        context: {
          kind: "repair",
          issues: "",
          original: { kind: "refine", plan, instruction: "cut 10%", today: TODAY },
        },
      }),
    );
    expect(JSON.parse(text)).toMatchObject({ totalBudget: 1_800_000 });
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const stream = createMockProvider({ delayMs: 10_000 }).stream(
      {
        system: "",
        prompt: "",
        schema: {},
        context: { kind: "plan", input, today: TODAY },
      },
      controller.signal,
    );
    const next = stream[Symbol.asyncIterator]().next();
    controller.abort(new Error("stop"));
    await expect(next).rejects.toThrow("stop");
  });

  it("round-trips a plan to a draft", () => {
    const draft = planToDraft(plan);
    expect(draft.budget).toHaveLength(plan.budget.length);
    expect(draft.timeline.find((t) => t.time)?.daysBefore).toBe(0);
  });
});

describe("mockRefine", () => {
  it("understands budget increases and decreases", () => {
    expect(mockRefine(plan, "Increase the budget by 10%", TODAY).totalBudget).toBe(
      2_200_000,
    );
    expect(mockRefine(plan, "Please trim 25%", TODAY).totalBudget).toBe(1_500_000);
  });

  it("moves the date to the next suitable mid-month", () => {
    expect(mockRefine(plan, "Move the date to March", TODAY).date).toBe("2027-03-15");
    expect(mockRefine(plan, "Change the date to November", TODAY).date).toBe(
      "2026-11-15",
    );
    expect(mockRefine(plan, "Move the date to October", TODAY).date).toBe("2027-10-15");
    expect(mockRefine(plan, "Move the date to February", TODAY).date).toBe("2027-02-15");
  });

  it("adds eco-friendly ideas without repeating existing ones", () => {
    const patch = mockRefine(plan, "Make it eco-friendly", TODAY);
    const titles = new Set(plan.ideas.map((i) => i.title));
    expect(patch.addIdeas?.length).toBeGreaterThan(0);
    expect(patch.addIdeas?.every((i) => !titles.has(i.title))).toBe(true);
    expect(patch.explanation).toMatch(/eco-friendly ideas/);
  });

  it("makes plans cheaper by swapping out unsaved splurges", () => {
    const splurge = plan.ideas.find((i) => i.costTier === 3);
    const withSaved = {
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === splurge?.id ? { ...i, saved: true } : i)),
    };
    const patch = mockRefine(withSaved, "Make it cheaper", TODAY);
    expect(patch.removeIdeaIds ?? []).not.toContain(splurge?.id);
    expect(patch.addIdeas?.every((i) => i.costTier === 1)).toBe(true);
    expect(PlanPatchSchema.safeParse(patch).success).toBe(true);
  });

  it("explains its limits for anything else", () => {
    expect(mockRefine(plan, "sing a song", TODAY)).toEqual({
      explanation: expect.stringContaining("Demo mode"),
    });
  });
});

describe("rateLimitPerMinute", () => {
  it("reads a sane value from env, defaulting to 8", async () => {
    const { rateLimitPerMinute } = await import("@/lib/http/api");
    expect(rateLimitPerMinute({})).toBe(8);
    expect(rateLimitPerMinute({ API_RATE_LIMIT_PER_MINUTE: "30" })).toBe(30);
    expect(rateLimitPerMinute({ API_RATE_LIMIT_PER_MINUTE: "0" })).toBe(8);
    expect(rateLimitPerMinute({ API_RATE_LIMIT_PER_MINUTE: "lots" })).toBe(8);
  });
});
