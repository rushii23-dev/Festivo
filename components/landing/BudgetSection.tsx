import Link from "next/link";
import { FestivoSeal } from "@/components/brand/FestivoSeal";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/budget/format";
import type { MenuLine } from "@/lib/landing/showcase";
import type { Plan } from "@/lib/schemas/plan";
import { Photo } from "./Photo";
import { mandapNight } from "./photos";
import { SplitHeading } from "./SplitHeading";

interface BudgetSectionProps {
  plan: Plan;
  menu: MenuLine[];
  /** The plan's total, already formatted. */
  total: string;
}

/** Landing section 3: the sample plan's budget, set like a menu, beside what it means. */
export function BudgetSection({ plan, menu, total }: BudgetSectionProps) {
  return (
    <section id="budget" aria-labelledby="budget-title" className="grid lg:grid-cols-2">
      <div className="bg-[#2c2a27] p-3 sm:p-6 lg:p-8">
        <BudgetMenu plan={plan} menu={menu} total={total} />
      </div>

      <div className="grid content-start gap-10 px-4 py-16 sm:px-8 lg:px-14 lg:py-24">
        <SplitHeading
          id="budget-title"
          reveal="scroll"
          lines={["Every rupee,", "accounted for."]}
          className="text-headline"
        />
        <p className="max-w-[48ch] leading-relaxed">
          Festivo splits your total across the lines your event needs, keeps a buffer for
          surprises, and rebalances the rest when a vendor sends a quote. Lock what you
          are sure of; the numbers always add up.
        </p>
        <BudgetFigures plan={plan} />
        <Photo
          src={mandapNight.src}
          alt={mandapNight.alt}
          sizes="(min-width: 1024px) 45vw, 100vw"
          parallax={10}
          className="aspect-[4/5] w-full"
        />
      </div>
    </section>
  );
}

function BudgetMenu({ plan, menu, total }: BudgetSectionProps) {
  return (
    <article
      aria-labelledby="menu-title"
      className="bg-secondary text-[#2c2a27] lg:sticky lg:top-8"
    >
      <div className="flex items-start justify-between gap-6 p-6 sm:p-8">
        <div>
          <h3 id="menu-title" className="font-display text-headline">
            The budget
          </h3>
          <p className="caps mt-3">
            {plan.title}, {plan.location}, {plan.guestCount} guests
          </p>
        </div>
        <FestivoSeal className="h-14" flame="currentColor" />
      </div>
      <ul>
        {menu.map((line) => (
          <li
            key={line.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 border-t border-[#2c2a27]/40 px-6 py-4 sm:px-8"
          >
            <p className="font-semibold">{line.label}</p>
            <p className="font-semibold tabular-nums">{line.amount}</p>
            <p className="max-w-[52ch] text-[0.8125rem] leading-snug">{line.note}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 border-t border-[#2c2a27]/40 p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-6">
          <p className="caps">Total, to the rupee</p>
          <p className="figure text-4xl">{total}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/plan/new">Plan your budget</Link>
        </Button>
      </div>
    </article>
  );
}

/** Three headline numbers: how many lines, the buffer kept back, and what is left. */
function BudgetFigures({ plan }: { plan: Plan }) {
  const buffer = plan.budget.find((item) => item.category === "misc");
  const allocated = plan.budget.reduce((sum, item) => sum + item.allocated, 0);
  return (
    <dl data-reveal className="grid grid-cols-3 border-t border-hairline pt-5">
      <div>
        <dt className="caps text-muted-foreground">Budget lines</dt>
        <dd className="figure mt-2 text-4xl">{plan.budget.length}</dd>
      </div>
      <div>
        <dt className="caps text-muted-foreground">Buffer</dt>
        <dd className="figure mt-2 text-4xl">
          {buffer ? formatMoney(buffer.allocated, plan.currency) : "None"}
        </dd>
      </div>
      <div>
        <dt className="caps text-muted-foreground">Left over</dt>
        <dd className="figure mt-2 text-4xl">
          {formatMoney(plan.totalBudget - allocated, plan.currency)}
        </dd>
      </div>
    </dl>
  );
}
