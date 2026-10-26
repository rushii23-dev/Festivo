"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type Politeness = "polite" | "assertive";
type Announce = (message: string, politeness?: Politeness) => void;

const AnnouncerContext = createContext<Announce | null>(null);

/**
 * App-wide live regions. Both regions are always mounted (screen readers ignore
 * regions inserted at the same time as their content). Messages are cleared
 * first so repeating the same text is still announced.
 */
export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback<Announce>((message, politeness = "polite") => {
    const set = politeness === "assertive" ? setAssertive : setPolite;
    set("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set(message), 50);
  }, []);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnouncerContext);
  if (!announce) throw new Error("useAnnounce must be used inside <AnnouncerProvider>");
  return announce;
}
