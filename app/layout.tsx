import type { Metadata, Viewport } from "next";
import { Mukta, Shrikhand } from "next/font/google";
import { headers } from "next/headers";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { RouteFocus } from "@/components/a11y/RouteFocus";
import { SkipLink } from "@/components/a11y/SkipLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

// Display face: Shrikhand (one weight, headlines only). UI face: Mukta.
const display = Shrikhand({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const body = Mukta({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Festivo | Plan the party, not the panic",
    template: "%s | Festivo",
  },
  description:
    "An AI planning assistant for weddings, birthdays and community events: budgets, timelines, vendor checklists and ideas made for you.",
  applicationName: "Festivo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff4dc" },
    { media: "(prefers-color-scheme: dark)", color: "#160f33" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Per-request CSP nonce from proxy.ts; Next.js applies it to its own scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // theme-init.js sets data-theme/data-motion before hydration, so React must
    // not warn about those attributes differing from the server HTML.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        {/* Must run synchronously before first paint to prevent a theme flash.
            It is a 600-byte same-origin file, allowed by this response's CSP nonce. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" nonce={nonce} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <AnnouncerProvider>
          <SkipLink />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
          <RouteFocus />
        </AnnouncerProvider>
      </body>
    </html>
  );
}
