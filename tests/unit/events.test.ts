import { describe, expect, it } from "vitest";
import {
  budgetShares,
  categoriesFor,
  formatOf,
  occasionOf,
  taskTemplatesFor,
  vendorsFor,
  type PlanKind,
} from "@/lib/events/kind";
import { OCCASION_INFO, VIBES_BY_GROUP, occasionsIn } from "@/lib/events/occasions";
import { OCCASION_GROUPS, OCCASIONS, VIBES } from "@/lib/schemas/common";
import { EventInputSchema } from "@/lib/schemas/eventInput";

const sum = (shares: Partial<Record<string, number>>) =>
  Object.values(shares).reduce<number>((a, b) => a + (b ?? 0), 0);

describe("occasion catalog", () => {
  it("lists every occasion in exactly one group", () => {
    const listed = OCCASION_GROUPS.flatMap((g) => occasionsIn(g).map((o) => o.id));
    expect(listed.sort()).toEqual([...OCCASIONS].sort());
  });

  it("offers only known styles per group", () => {
    for (const group of OCCASION_GROUPS) {
      expect(VIBES_BY_GROUP[group].every((v) => VIBES.includes(v))).toBe(true);
    }
  });

  it.each(OCCASIONS)(
    "%s has shares summing to 1 in every format it offers",
    (occasion) => {
      const info = OCCASION_INFO[occasion];
      for (const format of info.formats) {
        const shares = budgetShares({ eventType: info.eventType, occasion, format });
        expect(sum(shares)).toBeCloseTo(1, 10);
        expect(Object.values(shares).every((s) => (s ?? 0) > 0)).toBe(true);
      }
    },
  );
});

describe("plan kinds", () => {
  it("falls back to the family's default occasion for older plans", () => {
    expect(occasionOf({ eventType: "community" }).id).toBe("community-festival");
    // An occasion from another family is ignored rather than trusted.
    expect(occasionOf({ eventType: "wedding", occasion: "hackathon" }).id).toBe(
      "wedding",
    );
    expect(
      formatOf({ eventType: "wedding", occasion: "engagement", format: "online" }),
    ).toBe("in-person");
  });

  it("drops venue costs online and adds a platform line", () => {
    const online: PlanKind = {
      eventType: "community",
      occasion: "tech-meetup",
      format: "online",
    };
    const categories = categoriesFor(online);
    expect(categories).not.toContain("venue");
    expect(categories).not.toContain("catering");
    expect(categories).toContain("platform");
    expect(categories.at(-1)).toBe("misc");
    expect(vendorsFor(online)).toEqual([
      "sound-and-av",
      "speaker",
      "photographer",
      "streaming",
    ]);
  });

  it("keeps the venue for hybrid events and adds streaming", () => {
    const hybrid: PlanKind = {
      eventType: "wedding",
      occasion: "wedding",
      format: "hybrid",
    };
    expect(categoriesFor(hybrid)).toEqual(expect.arrayContaining(["venue", "platform"]));
    expect(vendorsFor(hybrid)).toContain("streaming");
  });

  it("gives occasions their own budget lines", () => {
    expect(categoriesFor({ eventType: "community", occasion: "hackathon" })).toContain(
      "prizes",
    );
    const puja = categoriesFor({ eventType: "birthday", occasion: "puja" });
    expect(puja).toContain("rituals");
    expect(puja).not.toContain("cake");
  });

  it("shapes the timeline for the occasion, format and answers", () => {
    const keys = (kind: PlanKind) => taskTemplatesFor(kind).map((t) => t.key);

    const diwali = keys({
      eventType: "birthday",
      occasion: "diwali",
      details: { kids: true },
    });
    expect(diwali).not.toContain("cake");
    expect(diwali).toEqual(expect.arrayContaining(["rituals", "kids"]));

    expect(keys({ eventType: "community", occasion: "book-club" })).not.toContain(
      "permits",
    );

    const online = taskTemplatesFor({
      eventType: "community",
      occasion: "workshop",
      format: "online",
      tickets: { pricing: "free" },
    });
    const onlineKeys = online.map((t) => t.key);
    expect(onlineKeys).not.toContain("venue");
    expect(onlineKeys).toEqual(
      expect.arrayContaining(["platform", "rehearsal", "tickets"]),
    );
    expect(online.find((t) => t.key === "open")?.title).toBe("Go live");

    const conference = keys({
      eventType: "community",
      occasion: "conference",
      details: { days: 3 },
    });
    expect(conference).toContain("schedule");
    expect(new Set(conference).size).toBe(conference.length);
  });
});

describe("event input rules", () => {
  const base = {
    name: "Build for Pune",
    date: { kind: "fixed", date: "2027-03-14" },
    location: "Pune",
    guestCount: 120,
    budget: { total: 300000, currency: "INR" },
  } as const;

  const issues = (input: object) => {
    const parsed = EventInputSchema.safeParse({ ...base, ...input });
    return parsed.success ? [] : parsed.error.issues.map((i) => i.path.join("."));
  };

  it("accepts a ticketed online hackathon", () => {
    expect(
      issues({
        eventType: "community",
        occasion: "hackathon",
        format: "online",
        tickets: { pricing: "paid", price: 299, capacity: 150 },
        details: { days: 2 },
      }),
    ).toEqual([]);
  });

  it("rejects combinations the occasion does not offer", () => {
    expect(issues({ eventType: "wedding", occasion: "hackathon" })).toEqual(["occasion"]);
    expect(
      issues({ eventType: "wedding", occasion: "engagement", format: "online" }),
    ).toEqual(["format"]);
    expect(
      issues({ eventType: "wedding", occasion: "wedding", tickets: { pricing: "free" } }),
    ).toEqual(["tickets"]);
    expect(
      issues({
        eventType: "community",
        occasion: "workshop",
        tickets: { pricing: "paid" },
      }),
    ).toEqual(["tickets.price"]);
  });
});
