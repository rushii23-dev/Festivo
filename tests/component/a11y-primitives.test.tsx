import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnnouncerProvider, useAnnounce } from "@/components/a11y/LiveRegion";
import { SkipLink } from "@/components/a11y/SkipLink";

function AnnounceButton({
  message,
  assertive,
}: {
  message: string;
  assertive?: boolean;
}) {
  const announce = useAnnounce();
  return (
    <button
      type="button"
      onClick={() => announce(message, assertive ? "assertive" : "polite")}
    >
      Announce
    </button>
  );
}

describe("SkipLink", () => {
  it("points at the main landmark", () => {
    render(<SkipLink />);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main",
    );
  });
});

describe("AnnouncerProvider", () => {
  it("announces polite and assertive messages in separate regions", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AnnouncerProvider>
        <AnnounceButton message="Plan saved" />
      </AnnouncerProvider>,
    );
    act(() => screen.getByRole("button").click());
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Plan saved");

    rerender(
      <AnnouncerProvider>
        <AnnounceButton message="Could not save" assertive />
      </AnnouncerProvider>,
    );
    act(() => screen.getByRole("button").click());
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    vi.useRealTimers();
  });

  it("throws a helpful error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AnnounceButton message="x" />)).toThrow(/AnnouncerProvider/);
    spy.mockRestore();
  });
});
