import { BudgetSection } from "@/components/landing/BudgetSection";
import { FinaleSection } from "@/components/landing/FinaleSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { IdeasSection } from "@/components/landing/IdeasSection";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { OccasionsSection } from "@/components/landing/OccasionsSection";
import { StorySection } from "@/components/landing/StorySection";
import { TimelineSection } from "@/components/landing/TimelineSection";
import { VendorsSection } from "@/components/landing/VendorsSection";
import {
  budgetMenu,
  ideaTitles,
  planGlimpse,
  samplePlan,
  timelineChapters,
  vendorShowcase,
} from "@/lib/landing/showcase";
import { todayIso } from "@/lib/timeline/dates";

/**
 * The landing page tells the planner's story with a real sample plan: its budget,
 * timeline, vendors and ideas appear as text, so the page reads fully without motion.
 */
export default function HomePage() {
  const today = todayIso();
  const plan = samplePlan(today);

  return (
    <>
      <HeroSection />
      <StorySection />
      <BudgetSection
        plan={plan}
        menu={budgetMenu(plan)}
        total={planGlimpse(plan, today).budget}
      />
      <TimelineSection chapters={timelineChapters(plan)} />
      <VendorsSection vendors={vendorShowcase()} />
      <IdeasSection ideas={ideaTitles()} />
      <OccasionsSection />
      <FinaleSection />
      <LandingMotion />
    </>
  );
}
