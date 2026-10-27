"use client";

import * as React from "react";
import { cn } from "cn";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer relative flex size-6 shrink-0 items-center justify-center rounded-full border border-input bg-card after:absolute after:-inset-2.5 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-3 rounded-full bg-primary"
      />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
