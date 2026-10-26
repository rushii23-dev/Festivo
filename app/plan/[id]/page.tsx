import type { Metadata } from "next";
import { PlanPreview } from "@/components/plan/PlanPreview";

export const metadata: Metadata = { title: "Your plan" };

export default async function PlanPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <PlanPreview id={decodeURIComponent(id)} />
    </div>
  );
}
