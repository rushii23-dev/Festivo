import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/Wizard";

export const metadata: Metadata = {
  title: "Plan a new event",
  description:
    "Answer six quick questions and Festivo builds your budget, timeline, vendors and ideas.",
};

export default function NewPlanPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="grid gap-2">
        <h1 className="text-title font-extrabold">Plan a new event</h1>
        <p className="max-w-[60ch] text-muted-foreground">
          Six quick questions. Your answers are saved in this browser as you go.
        </p>
      </div>
      <Wizard />
    </div>
  );
}
