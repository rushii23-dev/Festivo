/**
 * Photographs used across the site (Unsplash License; credits in
 * docs/design/photo-credits.md). Static imports give Next.js the size and a
 * blurred placeholder for each one.
 */
import type { StaticImageData } from "next/image";
import ballroomMandap from "@/public/images/ballroom-mandap.jpg";
import banquetTable from "@/public/images/banquet-table.jpg";
import birthdayCake from "@/public/images/birthday-cake.jpg";
import birthdayCandles from "@/public/images/birthday-candles.jpg";
import bride from "@/public/images/bride.jpg";
import diyas from "@/public/images/diyas.jpg";
import festivalDrummers from "@/public/images/festival-drummers.jpg";
import henna from "@/public/images/henna.jpg";
import heroNewlyweds from "@/public/images/hero-newlyweds.jpg";
import holi from "@/public/images/holi.jpg";
import lightsUnderTrees from "@/public/images/lights-under-trees.jpg";
import mandapNight from "@/public/images/mandap-night.jpg";
import marigoldGarlands from "@/public/images/marigold-garlands.jpg";
import marigoldsPetals from "@/public/images/marigolds-petals.jpg";
import thali from "@/public/images/thali.jpg";

export interface SitePhoto {
  src: StaticImageData;
  alt: string;
}

export const PHOTOS = {
  ballroomMandap: {
    src: ballroomMandap,
    alt: "A couple seated under a flower-covered mandap in a ballroom lit by chandeliers",
  },
  banquetTable: {
    src: banquetTable,
    alt: "A long dinner table set with candles, glassware and golden chairs",
  },
  birthdayCake: {
    src: birthdayCake,
    alt: "A chocolate birthday cake with lit candles glowing in the dark",
  },
  birthdayCandles: {
    src: birthdayCandles,
    alt: "Happy Birthday candles burning on a cake",
  },
  bride: {
    src: bride,
    alt: "A smiling bride in a red lehenga with gold jewellery and henna",
  },
  diyas: {
    src: diyas,
    alt: "Clay diyas lit on a brass tray scattered with rose petals",
  },
  festivalDrummers: {
    src: festivalDrummers,
    alt: "Drummers in white dhotis playing at an evening festival",
  },
  henna: {
    src: henna,
    alt: "Two hands with intricate henna, one wearing red bridal bangles",
  },
  heroNewlyweds: {
    src: heroNewlyweds,
    alt: "Newlyweds sitting together beneath a chandelier and a wall of flowers",
  },
  holi: {
    src: holi,
    alt: "A street crowd celebrating Holi in clouds of pink and red colour",
  },
  lightsUnderTrees: {
    src: lightsUnderTrees,
    alt: "Guests at long tables under trees strung with warm lights at night",
  },
  mandapNight: {
    src: mandapNight,
    alt: "A lounge and mandap lit with warm lamps, ready for guests",
  },
  marigoldGarlands: {
    src: marigoldGarlands,
    alt: "Strings of marigold and jasmine garlands hanging in a row",
  },
  marigoldsPetals: {
    src: marigoldsPetals,
    alt: "A heap of yellow marigolds and deep red rose petals",
  },
  thali: {
    src: thali,
    alt: "A steel thali with curries, dal and vegetables on a banana leaf",
  },
} satisfies Record<string, SitePhoto>;
