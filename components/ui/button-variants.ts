import { cva } from "class-variance-authority";

/**
 * Editorial buttons: 3px corners, small capitals, no shadows. The primary
 * button is filled ink with a thin outer frame, like a printed menu card;
 * the others are outlined or text-only. All sizes keep a 44px hit area.
 *
 * Kept apart from the Button component so screens that only need the classes
 * (the error boundary, which ships with every page) skip the class merger.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-pill border text-[0.75rem] font-medium tracking-[0.16em] whitespace-nowrap uppercase select-none disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 motion-ok:transition-[background-color,color,border-color,outline-color] motion-ok:duration-300 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground outline-1 outline-offset-[3px] outline-primary outline-solid hover:bg-transparent hover:text-primary",
        secondary:
          "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        outline: "border-input bg-transparent text-foreground hover:border-foreground",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-transparent hover:text-destructive",
        link: "border-transparent px-0 text-foreground underline-offset-4 hover:underline",
        /** For use over dark photography: parchment fill with a parchment frame. */
        photo:
          "border-[#e2d6c3] bg-[#e2d6c3] text-[#292622] outline-1 outline-offset-[3px] outline-[#e2d6c3] outline-solid hover:bg-transparent hover:text-[#e2d6c3]",
        /** Outlined, for secondary actions over dark photography. */
        photoOutline:
          "border-[#e2d6c3] bg-transparent text-[#e2d6c3] hover:bg-[#e2d6c3] hover:text-[#292622]",
      },
      size: {
        sm: "min-h-11 px-4",
        md: "min-h-11 px-6",
        lg: "min-h-14 px-8 text-sm",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);
