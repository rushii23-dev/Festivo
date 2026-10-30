/**
 * What kind of event a plan is: its family, occasion and format. Event input
 * and saved plans both satisfy `PlanKind`, so every budget, vendor and timeline
 * rule can be asked "for this kind" without caring where the data came from.
 * Plans saved before occasions existed fall back to their family's default.
 */
import type { BudgetCategory, EventType, Format, Occasion } from "@/lib/schemas/common";
import type { VendorCategory } from "@/lib/schemas/plan";
import { TASK_TEMPLATES, type TaskTemplate } from "@/lib/timeline/templates";
import { DEFAULT_OCCASION, OCCASION_INFO, type OccasionInfo } from "./occasions";
import {
  IN_PERSON_ONLY_CATEGORIES,
  IN_PERSON_ONLY_TASKS,
  IN_PERSON_ONLY_VENDORS,
  KIDS_TASK,
  MULTI_DAY_TASK,
  ONLINE_TASKS,
  PROFILES,
  TICKET_TASKS,
  type PlanningProfile,
} from "./profiles";

export interface PlanKind {
  eventType: EventType;
  occasion?: Occasion | undefined;
  format?: Format | undefined;
  /** Present when the event sells or hands out tickets. */
  tickets?: object | undefined;
  details?: { kids?: boolean | undefined; days?: number | undefined } | undefined;
}

/** Share of the budget set aside for the online platform and streaming. */
const PLATFORM_SHARE: Record<Format, number> = {
  "in-person": 0,
  hybrid: 0.1,
  online: 0.2,
};

export function occasionOf(kind: PlanKind): OccasionInfo {
  const info = kind.occasion ? OCCASION_INFO[kind.occasion] : undefined;
  return info && info.eventType === kind.eventType
    ? info
    : OCCASION_INFO[DEFAULT_OCCASION[kind.eventType]];
}

export function formatOf(kind: PlanKind): Format {
  const allowed = occasionOf(kind).formats;
  return kind.format && allowed.includes(kind.format) ? kind.format : allowed[0]!;
}

export function profileOf(kind: PlanKind): PlanningProfile {
  return PROFILES[occasionOf(kind).profile];
}

/** Baseline budget shares for this kind, summing to 1. */
export function budgetShares(kind: PlanKind): Partial<Record<BudgetCategory, number>> {
  const format = formatOf(kind);
  const entries = Object.entries(profileOf(kind).shares) as [BudgetCategory, number][];
  const kept =
    format === "online"
      ? entries.filter(([category]) => !IN_PERSON_ONLY_CATEGORIES.has(category))
      : entries;
  const platform = PLATFORM_SHARE[format];
  const keptSum = kept.reduce((sum, [, share]) => sum + share, 0);
  const scale = keptSum > 0 ? (1 - platform) / keptSum : 0;
  const shares: Partial<Record<BudgetCategory, number>> = {};
  for (const [category, share] of kept) shares[category] = share * scale;
  if (platform > 0) shares.platform = platform;
  return shares;
}

/** Budget categories in display order: the buffer always comes last. */
export function categoriesFor(kind: PlanKind): BudgetCategory[] {
  const categories = Object.keys(budgetShares(kind)) as BudgetCategory[];
  return [
    ...categories.filter((c) => c !== "misc"),
    ...categories.filter((c) => c === "misc"),
  ];
}

export function vendorsFor(kind: PlanKind): VendorCategory[] {
  const format = formatOf(kind);
  const vendors = profileOf(kind).vendors.filter(
    (v) => format !== "online" || !IN_PERSON_ONLY_VENDORS.has(v),
  );
  if (format !== "in-person") vendors.push("streaming");
  if (kind.tickets && !vendors.includes("ticketing")) vendors.push("ticketing");
  return vendors;
}

/** Merges templates by key: later ones replace earlier ones with the same key. */
function mergeTasks(...lists: readonly (readonly TaskTemplate[])[]): TaskTemplate[] {
  const byKey = new Map<string, TaskTemplate>();
  for (const list of lists) for (const task of list) byKey.set(task.key, task);
  return [...byKey.values()];
}

/** Tasks this occasion and format leave out, such as venue tasks for online events. */
function droppedTasks(kind: PlanKind): Set<string> {
  const drop = new Set(profileOf(kind).dropTasks ?? []);
  if (formatOf(kind) === "online") for (const key of IN_PERSON_ONLY_TASKS) drop.add(key);
  return drop;
}

/** Tasks added by the answers: streaming, ticketing, children and extra days. */
function extraTasks(kind: PlanKind): TaskTemplate[] {
  const occasion = occasionOf(kind);
  const days = kind.details?.days ?? 1;
  return [
    ...(formatOf(kind) === "in-person" ? [] : ONLINE_TASKS),
    ...(kind.tickets && occasion.tickets ? TICKET_TASKS : []),
    ...(kind.details?.kids && occasion.kids ? [KIDS_TASK] : []),
    ...(days > 1 && occasion.multiDay ? [MULTI_DAY_TASK] : []),
  ];
}

/** The task templates for this kind: the family's, adjusted for the occasion. */
export function taskTemplatesFor(kind: PlanKind): TaskTemplate[] {
  const drop = droppedTasks(kind);
  const online = formatOf(kind) === "online";
  return mergeTasks(
    TASK_TEMPLATES[kind.eventType],
    profileOf(kind).tasks ?? [],
    extraTasks(kind),
  )
    .filter((task) => !drop.has(task.key))
    .map((task) =>
      online && task.key === "open"
        ? { ...task, title: "Go live", description: "Open the room a few minutes early." }
        : task,
    );
}
