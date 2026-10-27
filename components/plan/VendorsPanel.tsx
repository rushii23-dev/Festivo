"use client";

import { ChevronDown } from "lucide-react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { controlClass } from "@/components/ui/field";
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { updateVendor } from "@/lib/plan/edit";
import {
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  VendorStatusSchema,
  type Vendor,
} from "@/lib/schemas/plan";
import { VENDOR_LABELS, bookingProgress, budgetCategoryFor } from "@/lib/vendors/catalog";
import type { PanelProps } from "./PlanDashboard";
import { Garland, MoneyInput, PanelHeader } from "./parts";

/** Five beads on a thread, filled up to the current status. Decorative. */
function StatusBeads({ status }: { status: Vendor["status"] }) {
  const reached = VENDOR_STATUSES.indexOf(status);
  return (
    <svg aria-hidden="true" viewBox="0 0 132 20" className="h-5 w-32">
      <path d="M10 10h112" stroke="var(--gold)" strokeWidth="1.5" />
      {VENDOR_STATUSES.map((s, i) => (
        <circle
          key={s}
          cx={10 + i * 28}
          cy="10"
          r={i === reached ? 8 : 6}
          fill={i <= reached ? "var(--secondary)" : "var(--card)"}
          stroke="var(--border)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function VendorCard({
  vendor,
  plan,
  update,
}: { vendor: Vendor } & Omit<PanelProps, "today">) {
  const announce = useAnnounce();
  const name = VENDOR_LABELS[vendor.category];
  const line = BUDGET_CATEGORY_LABELS[budgetCategoryFor(vendor.category, plan.eventType)];
  const id = (field: string) => `${vendor.id}-${field}`;

  return (
    <li className="grid content-start gap-5 border border-hairline bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-[2rem] leading-[0.95]">{name}</h3>
        <StatusBeads status={vendor.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor={id("status")} className="text-sm font-bold">
            Status
          </label>
          <select
            id={id("status")}
            value={vendor.status}
            onChange={(event) => {
              const status = VendorStatusSchema.parse(event.target.value);
              update((p) => updateVendor(p, vendor.id, { status }));
              announce(`${name}: ${VENDOR_STATUS_LABELS[status]}.`);
            }}
            className={`${controlClass} min-h-11 font-bold`}
          >
            {VENDOR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VENDOR_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <MoneyInput
          id={id("quote")}
          label="Quote"
          optional
          value={vendor.quote}
          currency={plan.currency}
          onCommit={(quote) => update((p) => updateVendor(p, vendor.id, { quote }))}
        />
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Counts as spend on {line} once the status is Quoted, Booked or Paid.
      </p>

      <div className="grid gap-1.5">
        <label htmlFor={id("notes")} className="text-sm font-bold">
          Notes
        </label>
        <textarea
          id={id("notes")}
          rows={2}
          maxLength={500}
          defaultValue={vendor.notes ?? ""}
          placeholder="Name, phone, what they said"
          onChange={(event) =>
            update((p) => updateVendor(p, vendor.id, { notes: event.target.value }))
          }
          className={controlClass}
        />
      </div>

      {vendor.questionsToAsk.length > 0 ? (
        <details className="group border-t border-hairline open:pb-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
            Questions to ask ({vendor.questionsToAsk.length})
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 group-open:rotate-180 motion-ok:transition-transform"
            />
          </summary>
          <ul className="grid list-disc gap-2 pl-5 marker:text-gold">
            {vendor.questionsToAsk.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

export function VendorsPanel({ plan, update }: PanelProps) {
  const booking = bookingProgress(plan.vendors);
  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="Vendors"
        intro="Move each vendor along as you hear back. Quotes flow into your budget automatically."
      >
        <div className="flex items-center gap-3 border-b border-hairline py-1.5">
          <Garland
            filled={booking.booked}
            total={booking.total}
            className="hidden h-7 sm:block"
          />
          <p className="font-bold whitespace-nowrap">
            {booking.booked} of {booking.total} booked
          </p>
        </div>
      </PanelHeader>
      {plan.vendors.length === 0 ? (
        <p className="text-muted-foreground">
          No vendors on this plan. Ask Refine with AI to suggest some.
        </p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {plan.vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} plan={plan} update={update} />
          ))}
        </ul>
      )}
    </div>
  );
}
