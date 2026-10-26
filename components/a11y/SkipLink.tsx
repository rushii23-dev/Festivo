/** First focusable element on every page; jumps keyboard users past the header. */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  return (
    <a href={`#${targetId}`} className="skip-link">
      Skip to content
    </a>
  );
}
