import { Share2, WandSparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type TriggerProps = Omit<ComponentProps<typeof Button>, "variant" | "children">;

/**
 * The hero's two actions. Shared by the real controls and the stand-ins shown
 * for the moment their code is loading, so both always look the same.
 */
export function RefineButton(props: TriggerProps) {
  return (
    <Button variant="photo" {...props}>
      <WandSparkles aria-hidden="true" />
      Refine with AI
    </Button>
  );
}

export function ShareButton(props: TriggerProps) {
  return (
    <Button variant="photoOutline" {...props}>
      <Share2 aria-hidden="true" />
      Export and share
    </Button>
  );
}
