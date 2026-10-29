/**
 * Demo-mode plan generator. Builds a complete, realistic plan from the user's
 * input without calling any AI, using the same deterministic budget, timeline
 * and vendor logic the real provider's output is checked against.
 */
import { allocateBudget } from "@/lib/budget/allocate";
import { formatMoney } from "@/lib/budget/format";
import { fitsBudget } from "@/lib/ideas/fit";
import { profileOf, occasionOf, type PlanKind } from "@/lib/events/kind";
import type { FixtureKey } from "@/lib/events/profiles";
import type { EventType, Occasion, Vibe } from "@/lib/schemas/common";
import type { EventInput } from "@/lib/schemas/eventInput";
import { PlanSchema, type Idea, type IdeaCategory, type Plan } from "@/lib/schemas/plan";
import { formatLongDate } from "@/lib/timeline/dates";
import { generateTimeline } from "@/lib/timeline/generate";
import { resolveEventDate } from "@/lib/timeline/resolveDate";
import { planKindFields } from "@/lib/plan/fromDraft";
import { defaultVendors } from "@/lib/vendors/catalog";
import { activeFixture } from "./active";
import { birthdayFixture } from "./birthday";
import { communityFixture } from "./community";
import { gatheringFixture } from "./gathering";
import { meetupFixture } from "./meetup";
import type { FixtureContent, IdeaSeed } from "./types";
import { weddingFixture } from "./wedding";
import { workFixture } from "./work";

export const FIXTURES: Record<FixtureKey, FixtureContent> = {
  wedding: weddingFixture,
  birthday: birthdayFixture,
  community: communityFixture,
  gathering: gatheringFixture,
  meetup: meetupFixture,
  active: activeFixture,
  work: workFixture,
};

/** The demo rationales and ideas for a kind of event. */
export function fixtureFor(kind: PlanKind): FixtureContent {
  return FIXTURES[profileOf(kind).fixture];
}

export const IDEAS_PER_CATEGORY = 3;

interface BudgetContext {
  eventType: EventType;
  currency: EventInput["budget"]["currency"];
  totalBudget: number;
  guestCount: number;
  /** Ideas written for this occasion rank above the rest. */
  occasion?: Occasion | undefined;
}

/**
 * Ranks idea seeds for a category: ideas written for the occasion first, then
 * more matching vibes, then ideas that fit the budget, then the fixture's own
 * order. Skips `excludeKeys`.
 */
export function selectIdeas(
  seeds: readonly IdeaSeed[],
  category: IdeaCategory,
  vibes: readonly Vibe[],
  budget: BudgetContext,
  count = IDEAS_PER_CATEGORY,
  excludeKeys: ReadonlySet<string> = new Set(),
): IdeaSeed[] {
  return seeds
    .map((seed, index) => ({ seed, index }))
    .filter(({ seed }) => seed.category === category && !excludeKeys.has(seed.key))
    .map(({ seed, index }) => ({
      seed,
      index,
      score:
        (budget.occasion && seed.occasions?.includes(budget.occasion) ? 10 : 0) +
        seed.vibes.filter((v) => vibes.includes(v)).length * 2 +
        (fitsBudget(seed.costTier, budget) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ seed }) => seed);
}

export function ideaFromSeed(seed: IdeaSeed): Idea {
  return {
    id: `idea-${seed.key}`,
    category: seed.category,
    title: seed.title,
    description: seed.description,
    costTier: seed.costTier,
  };
}

function describeVibes(vibes: readonly Vibe[]): string {
  if (vibes.length === 0) return "relaxed and welcoming";
  if (vibes.length === 1) return vibes[0] ?? "";
  return `${vibes.slice(0, -1).join(", ")} and ${vibes.at(-1)}`;
}

function needsSentence(input: EventInput): string {
  const parts: string[] = [];
  if (input.constraints.dietary.length > 0) {
    parts.push(`menus cover ${input.constraints.dietary.join(", ")} needs`);
  }
  if (input.constraints.accessibility.length > 0) {
    parts.push(`vendors are asked about ${input.constraints.accessibility.join(", ")}`);
  }
  if (parts.length === 0) return "";
  const sentence = parts.join(", and ");
  return ` ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

export interface BuildPlanOptions {
  id: string;
  today: string;
  now: Date;
}

export function buildMockPlan(
  input: EventInput,
  { id, today, now }: BuildPlanOptions,
): Plan {
  const fixture = fixtureFor(input);
  const { date, flexible } = resolveEventDate(input.date, today);
  const total = Math.round(input.budget.total);
  const budgetContext: BudgetContext = {
    eventType: input.eventType,
    currency: input.budget.currency,
    totalBudget: total,
    guestCount: input.guestCount,
    occasion: occasionOf(input).id,
  };

  const budget = allocateBudget(input, total, input.budget.priorities).map(
    ({ key, amount }) => ({
      category: key,
      allocated: amount,
      rationale: fixture.rationales[key] ?? "Planned share of the total.",
    }),
  );

  const ideaCategories: IdeaCategory[] = [
    "theme",
    "decor",
    "food",
    "activities",
    "favors",
  ];
  const ideas = ideaCategories.flatMap((category) =>
    selectIdeas(fixture.ideas, category, input.vibes, budgetContext).map(ideaFromSeed),
  );

  const summary =
    fixture.summary({
      title: input.name,
      location: input.location,
      guestCount: input.guestCount,
      budgetText: formatMoney(total, input.budget.currency),
      dateText: flexible ? `around ${formatLongDate(date)}` : formatLongDate(date),
      vibes: describeVibes(input.vibes),
    }) + needsSentence(input);

  return PlanSchema.parse({
    id,
    ...planKindFields(input),
    title: input.name,
    date,
    dateFlexible: flexible,
    location: input.location,
    guestCount: input.guestCount,
    vibes: input.vibes,
    currency: input.budget.currency,
    totalBudget: total,
    budget,
    timeline: generateTimeline(input, date, today).tasks,
    vendors: defaultVendors(input),
    ideas,
    summary: summary.slice(0, 800),
    createdAt: now.toISOString(),
  });
}
