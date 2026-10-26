/** Original, decorative line icons for the three event types. */
import type { EventType } from "@/lib/schemas/common";

const common = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Rings({ className }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <circle cx="18" cy="28" r="11" />
      <circle cx="30" cy="28" r="11" />
      <path d="M21 9l3-4 3 4-3 4z" fill="currentColor" />
    </svg>
  );
}

function Cake({ className }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <rect x="8" y="24" width="32" height="16" rx="4" />
      <path d="M8 31c4 3 8-3 12 0s8 3 12 0 6-2 8 0" />
      <path d="M18 24v-6M30 24v-6M24 24v-8" />
      <path d="M24 9c2 2 2 4 0 5-2-1-2-3 0-5z" fill="currentColor" />
    </svg>
  );
}

function Crowd({ className }: { className?: string }) {
  return (
    <svg {...common} className={className}>
      <circle cx="14" cy="18" r="5" />
      <circle cx="34" cy="18" r="5" />
      <circle cx="24" cy="14" r="6" />
      <path d="M6 38c0-7 4-11 8-11M42 38c0-7-4-11-8-11M14 40c0-8 4-13 10-13s10 5 10 13" />
    </svg>
  );
}

export function EventIcon({ type, className }: { type: EventType; className?: string }) {
  if (type === "wedding") return <Rings className={className} />;
  if (type === "birthday") return <Cake className={className} />;
  return <Crowd className={className} />;
}
