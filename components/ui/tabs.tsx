"use client";

import * as React from "react";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

/** Radix Tabs: arrow keys move between tabs, Tab moves into the panel. */
function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex w-max min-w-full items-stretch gap-2 border-b border-hairline sm:gap-6",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Small-capital tabs like a menu's section names. The selected tab is
 * underlined in saffron and set in full ink, so it never relies on hue alone.
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "caps -mb-px inline-flex min-h-12 items-center border-b-2 border-transparent px-2 whitespace-nowrap text-muted-foreground hover:text-foreground data-[state=active]:border-secondary data-[state=active]:text-foreground sm:px-1 motion-ok:transition-colors",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Panels stay mounted (forceMount) so drafts in inputs survive a tab switch and
 * the print stylesheet can show every section; inactive ones are hidden on screen.
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      forceMount
      className={cn(
        "data-[state=inactive]:hidden print:data-[state=inactive]:block",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
