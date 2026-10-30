import { Marquee } from "./Marquee";
import { DARK_TONE } from "./tone";

/** Landing section 6: idea titles drifting past in two rows. */
export function IdeasSection({ ideas }: { ideas: string[] }) {
  return (
    <section
      id="ideas"
      aria-labelledby="ideas-title"
      className={`py-20 lg:py-28 ${DARK_TONE}`}
    >
      <h2 id="ideas-title" className="caps px-4 text-center">
        Ideas, picked for your style and your budget
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-4 overflow-hidden font-display text-[clamp(2.5rem,1rem+5vw,5.5rem)] leading-none">
        <Marquee items={ideas.slice(0, 9)} />
        <div aria-hidden="true">
          <Marquee items={ideas.slice(9)} reverse />
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-[52ch] px-4 text-center leading-relaxed">
        Every idea shows its cost and whether it fits your budget. Save the ones you love,
        dismiss the rest, and ask for more like them.
      </p>
    </section>
  );
}
