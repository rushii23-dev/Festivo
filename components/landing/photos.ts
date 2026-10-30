/**
 * Photographs used across the site (Unsplash License; credits in
 * docs/design/photo-credits.md). Static imports give Next.js the size and a
 * blurred placeholder for each one.
 */
import type { StaticImageData } from "next/image";
import ballroomMandapJpg from "@/public/images/ballroom-mandap.jpg";
import banquetTableJpg from "@/public/images/banquet-table.jpg";
import birthdayCandlesJpg from "@/public/images/birthday-candles.jpg";
import brideJpg from "@/public/images/bride.jpg";
import diyasJpg from "@/public/images/diyas.jpg";
import festivalDrummersJpg from "@/public/images/festival-drummers.jpg";
import hennaJpg from "@/public/images/henna.jpg";
import heroNewlywedsJpg from "@/public/images/hero-newlyweds.jpg";
import holiJpg from "@/public/images/holi.jpg";
import lightsUnderTreesJpg from "@/public/images/lights-under-trees.jpg";
import mandapNightJpg from "@/public/images/mandap-night.jpg";
import marigoldGarlandsJpg from "@/public/images/marigold-garlands.jpg";
import marigoldsPetalsJpg from "@/public/images/marigolds-petals.jpg";
import thaliJpg from "@/public/images/thali.jpg";

export interface SitePhoto {
  src: StaticImageData;
  alt: string;
}

export const ballroomMandap: SitePhoto = {
  src: ballroomMandapJpg,
  alt: "A couple seated under a flower-covered mandap in a ballroom lit by chandeliers",
};

export const banquetTable: SitePhoto = {
  src: banquetTableJpg,
  alt: "A long dinner table set with candles, glassware and golden chairs",
};

export const birthdayCandles: SitePhoto = {
  src: birthdayCandlesJpg,
  alt: "Happy Birthday candles burning on a cake",
};

export const bride: SitePhoto = {
  src: brideJpg,
  alt: "A smiling bride in a red lehenga with gold jewellery and henna",
};

export const diyas: SitePhoto = {
  src: diyasJpg,
  alt: "Clay diyas lit on a brass tray scattered with rose petals",
};

export const festivalDrummers: SitePhoto = {
  src: festivalDrummersJpg,
  alt: "Drummers in white dhotis playing at an evening festival",
};

export const henna: SitePhoto = {
  src: hennaJpg,
  alt: "Two hands with intricate henna, one wearing red bridal bangles",
};

export const heroNewlyweds: SitePhoto = {
  src: heroNewlywedsJpg,
  alt: "Newlyweds sitting together beneath a chandelier and a wall of flowers",
};

export const holi: SitePhoto = {
  src: holiJpg,
  alt: "A street crowd celebrating Holi in clouds of pink and red colour",
};

export const lightsUnderTrees: SitePhoto = {
  src: lightsUnderTreesJpg,
  alt: "Guests at long tables under trees strung with warm lights at night",
};

export const mandapNight: SitePhoto = {
  src: mandapNightJpg,
  alt: "A lounge and mandap lit with warm lamps, ready for guests",
};

export const marigoldGarlands: SitePhoto = {
  src: marigoldGarlandsJpg,
  alt: "Strings of marigold and jasmine garlands hanging in a row",
};

export const marigoldsPetals: SitePhoto = {
  src: marigoldsPetalsJpg,
  alt: "A heap of yellow marigolds and deep red rose petals",
};

export const thali: SitePhoto = {
  src: thaliJpg,
  alt: "A steel thali with curries, dal and vegetables on a banana leaf",
};

/**
 * Every photograph by name, for server components. Client components import
 * single photos instead, so their bundles carry only the placeholders they show.
 */
export const PHOTOS = {
  ballroomMandap,
  banquetTable,
  birthdayCandles,
  bride,
  diyas,
  festivalDrummers,
  henna,
  heroNewlyweds,
  holi,
  lightsUnderTrees,
  mandapNight,
  marigoldGarlands,
  marigoldsPetals,
  thali,
} satisfies Record<string, SitePhoto>;
