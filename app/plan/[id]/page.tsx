import type { Metadata } from "next";
import { PlanDashboard } from "@/components/plan/PlanDashboard";

export const metadata: Metadata = { title: "Your plan" };

export default async function PlanPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  return <PlanDashboard id={decodeURIComponent(id)} />;
}
