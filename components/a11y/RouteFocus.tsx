"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Moves focus to <main> after client-side navigation so keyboard and screen
 * reader users start at the new page's content (Next.js already announces the
 * new title). The first render is skipped so page load keeps the browser default.
 */
export function RouteFocus({ targetId = "main" }: { targetId?: string }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const target = document.getElementById(targetId);
    target?.focus({ preventScroll: false });
  }, [pathname, targetId]);

  return null;
}
