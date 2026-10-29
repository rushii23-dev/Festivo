import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = {
  title: "Plan a new event",
  description:
    "Create your account, answer six quick questions, and Festivo builds your budget, timeline, vendors and ideas.",
};

export default function NewPlanPage() {
  return <Onboarding />;
}
