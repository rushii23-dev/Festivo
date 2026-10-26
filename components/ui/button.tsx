import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Chunky pill buttons with a sticker shadow. All sizes keep a hit area of at
 * least 44px (WCAG 2.5.8 asks for 24px; 44px is the comfortable target).
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border-2 font-bold whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-ok:transition-[transform,box-shadow] motion-ok:duration-150 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary:
          "border-border bg-primary text-primary-foreground shadow-sticker hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-sticker-sm",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-sticker hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-sticker-sm",
        outline: "border-border bg-card text-card-foreground hover:bg-muted",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
        destructive:
          "border-border bg-destructive text-destructive-foreground shadow-sticker-sm hover:-translate-y-0.5",
        link: "border-transparent px-0 text-primary underline underline-offset-4 hover:decoration-2",
      },
      size: {
        sm: "min-h-11 px-4 text-sm",
        md: "min-h-11 px-5 text-base",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styling. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
