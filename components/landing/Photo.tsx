import Image, { type StaticImageData } from "next/image";
import { cn } from "cn";

interface PhotoProps {
  src: StaticImageData;
  /** Describe what the photo shows; pass "" only when it is purely decorative. */
  alt: string;
  sizes: string;
  /** Preload above-the-fold photos (Next 16 replaced `priority` with `preload`). */
  preload?: boolean | undefined;
  /** Drift distance in percent while scrolling (LandingMotion). 0 = still. */
  parallax?: number;
  className?: string;
  /** CSS object-position, e.g. "50% 30%". */
  position?: string | undefined;
}

/**
 * A photograph cropped to its frame. Built from spans so it can sit inside a
 * label (the wizard's photo cards). With `parallax`, the image is drawn a
 * little taller than the frame so it can drift without showing an edge.
 */
export function Photo({
  src,
  alt,
  sizes,
  preload,
  parallax = 0,
  className,
  position,
}: PhotoProps) {
  return (
    <span className={cn("relative block overflow-hidden bg-muted", className)}>
      <span
        data-parallax={parallax || undefined}
        className={
          parallax ? "absolute inset-x-0 -top-[10%] h-[120%]" : "absolute inset-0"
        }
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload ?? false}
          placeholder="blur"
          className="object-cover"
          {...(position ? { style: { objectPosition: position } } : {})}
        />
      </span>
    </span>
  );
}
