import { FestivoSeal } from "@/components/brand/FestivoSeal";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-hairline print:hidden">
      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-center gap-4">
          <FestivoSeal className="h-14" />
          <p className="wordmark text-5xl">Festivo</p>
        </div>
        <div className="grid gap-1 text-muted-foreground md:text-right">
          <p className="caps">Life moments, festivals, meetups and work events</p>
          <p className="caps">Your plans are saved in this browser only</p>
          <p className="caps">Photography from Unsplash</p>
        </div>
      </div>
    </footer>
  );
}
