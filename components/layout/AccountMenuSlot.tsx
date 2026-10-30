"use client";

import dynamic from "next/dynamic";

/**
 * The account menu, loaded in its own chunk after hydration. It renders nothing
 * on the server anyway (the profile lives in this browser), so deferring it keeps
 * its popover and the profile validation out of every page's first-load JavaScript.
 */
export const AccountMenuSlot = dynamic(
  () => import("./AccountMenu").then((module) => module.AccountMenu),
  { ssr: false },
);
