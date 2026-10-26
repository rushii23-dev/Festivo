// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { readNdjson } from "@/lib/plan/ndjson";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { createDebouncedStorage } from "@/lib/store/debouncedStorage";
import {
  STORE_KEY,
  sanitizePersisted,
  storage,
  usePlanStore,
} from "@/lib/store/planStore";
import { DEFAULT_DRAFT } from "@/lib/wizard/draft";

const plan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "birthday",
    name: "Maya turns 7",
    date: { kind: "fixed", date: "2027-01-15" },
    location: "Pune",
    guestCount: 25,
    budget: { total: 40000, currency: "INR" },
  }),
  { id: "plan-1", today: "2026-10-26", now: new Date("2026-10-26T00:00:00Z") },
);

describe("createDebouncedStorage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("batches rapid writes into one", () => {
    const backing = { setItem: vi.fn(), getItem: vi.fn(() => null), removeItem: vi.fn() };
    const debounced = createDebouncedStorage(() => backing as unknown as Storage, 300);
    debounced.setItem("k", "1");
    debounced.setItem("k", "2");
    debounced.setItem("k", "3");
    expect(backing.setItem).not.toHaveBeenCalled();
    expect(debounced.getItem("k")).toBe("3"); // reads see the pending value
    vi.advanceTimersByTime(300);
    expect(backing.setItem).toHaveBeenCalledExactlyOnceWith("k", "3");
  });

  it("flushes when the page is hidden", () => {
    const backing = { setItem: vi.fn(), getItem: vi.fn(() => null), removeItem: vi.fn() };
    const debounced = createDebouncedStorage(() => backing as unknown as Storage, 10_000);
    debounced.setItem("k", "v");
    window.dispatchEvent(new Event("pagehide"));
    expect(backing.setItem).toHaveBeenCalledWith("k", "v");
  });

  it("survives blocked storage", () => {
    const blocked = {
      setItem: () => {
        throw new Error("quota");
      },
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const debounced = createDebouncedStorage(() => blocked, 0);
    expect(debounced.getItem("k")).toBeNull();
    debounced.setItem("k", "v");
    expect(() => debounced.flush()).not.toThrow();
    expect(() => debounced.removeItem("k")).not.toThrow();
  });
});

describe("sanitizePersisted", () => {
  it("keeps valid data", () => {
    const result = sanitizePersisted({
      draft: DEFAULT_DRAFT,
      step: 3,
      plans: { [plan.id]: plan },
    });
    expect(result.step).toBe(3);
    expect(result.plans[plan.id]?.title).toBe("Maya turns 7");
  });

  it("drops corrupted plans, mismatched ids and bad drafts", () => {
    const result = sanitizePersisted({
      draft: { eventType: "rave" },
      step: 99,
      plans: {
        [plan.id]: { ...plan, totalBudget: "lots" },
        other: plan,
      },
    });
    expect(result.draft).toEqual(DEFAULT_DRAFT);
    expect(result.step).toBe(5);
    expect(result.plans).toEqual({});
    expect(sanitizePersisted(null)).toMatchObject({ step: 0, plans: {} });
    expect(sanitizePersisted({ step: 1.5 }).step).toBe(0);
  });
});

describe("usePlanStore", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanStore.setState({ draft: { ...DEFAULT_DRAFT }, step: 0, plans: {} });
  });

  it("updates the draft and step, clamping the step", () => {
    const s = usePlanStore.getState();
    s.setDraft({ name: "Party" });
    s.setStep(10);
    expect(usePlanStore.getState()).toMatchObject({ draft: { name: "Party" }, step: 5 });
    s.setStep(-2);
    expect(usePlanStore.getState().step).toBe(0);
    s.replaceDraft({ ...DEFAULT_DRAFT, location: "Goa" });
    expect(usePlanStore.getState().draft.location).toBe("Goa");
    s.resetDraft();
    expect(usePlanStore.getState().draft).toEqual(DEFAULT_DRAFT);
  });

  it("saves, updates and deletes plans", () => {
    const s = usePlanStore.getState();
    s.savePlan(plan);
    s.updatePlan(plan.id, (p) => ({ ...p, title: "Renamed" }));
    s.updatePlan("missing", (p) => p);
    expect(usePlanStore.getState().plans[plan.id]?.title).toBe("Renamed");
    s.deletePlan(plan.id);
    expect(usePlanStore.getState().plans).toEqual({});
  });

  it("persists to localStorage (debounced) and rehydrates", async () => {
    usePlanStore.getState().savePlan(plan);
    storage.flush();
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as {
      state: { plans: object };
    };
    expect(Object.keys(saved.state.plans)).toEqual([plan.id]);

    // Simulate a fresh page load: in-memory state is empty, storage has the saved plan.
    const raw = localStorage.getItem(STORE_KEY) ?? "";
    usePlanStore.setState({ plans: {} });
    storage.flush();
    localStorage.setItem(STORE_KEY, raw);
    await usePlanStore.persist.rehydrate();
    expect(usePlanStore.getState().plans[plan.id]?.title).toBe("Maya turns 7");
  });
});

describe("readNdjson", () => {
  function streamOf(chunks: string[]) {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
  }

  it("yields one value per line, across chunk boundaries", async () => {
    const values: unknown[] = [];
    for await (const v of readNdjson(
      streamOf(['{"a":', "1}\n\n", '{"b":2}\n{"c"', ":3}"]),
    )) {
      values.push(v);
    }
    expect(values).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("handles multi-byte characters split between chunks", async () => {
    const bytes = new TextEncoder().encode('{"t":"₹"}\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });
    const values: unknown[] = [];
    for await (const v of readNdjson(stream)) values.push(v);
    expect(values).toEqual([{ t: "₹" }]);
  });
});
