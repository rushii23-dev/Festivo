import type { VendorShowcase } from "@/lib/landing/showcase";
import type { VendorCategory } from "@/lib/schemas/plan";
import { Photo } from "./Photo";
import { PHOTOS, type SitePhoto } from "./photos";
import { SplitHeading } from "./SplitHeading";

const VENDOR_PHOTOS: Partial<Record<VendorCategory, SitePhoto>> = {
  decorator: PHOTOS.marigoldsPetals,
  caterer: PHOTOS.thali,
  "dj-or-band": PHOTOS.festivalDrummers,
};

/** Landing section 5: who to call, what to ask, and where each vendor stands. */
export function VendorsSection({ vendors }: { vendors: VendorShowcase[] }) {
  return (
    <section id="vendors" aria-labelledby="vendors-title">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-20 sm:px-8 lg:py-32">
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <SplitHeading
            id="vendors-title"
            reveal="scroll"
            lines={["Who to call,", "what to ask"]}
            className="text-headline"
          />
          <p className="max-w-[46ch] leading-relaxed lg:justify-self-end">
            Each vendor moves from To research to Paid, and every quote flows into the
            budget. Festivo hands you the questions worth asking before you sign.
          </p>
        </div>
        <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-20">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.category} vendor={vendor} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function VendorCard({ vendor }: { vendor: VendorShowcase }) {
  const photo = VENDOR_PHOTOS[vendor.category] ?? PHOTOS.banquetTable;
  return (
    <li data-reveal className="grid content-start gap-5">
      <Photo
        src={photo.src}
        alt={photo.alt}
        sizes="(min-width: 768px) 30vw, 100vw"
        parallax={6}
        className="aspect-[3/4]"
      />
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <h3 className="font-display text-title">{vendor.label}</h3>
        <p className="caps inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rotate-45 bg-secondary" />
          {vendor.status}
        </p>
      </div>
      <p className="caps text-muted-foreground">Ask them</p>
      <p className="-mt-3 font-display text-[1.45rem] leading-snug">
        “{vendor.question}”
      </p>
    </li>
  );
}
