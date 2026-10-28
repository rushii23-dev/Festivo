import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { headers } from "next/headers";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { RouteFocus } from "@/components/a11y/RouteFocus";
import { SkipLink } from "@/components/a11y/SkipLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

// Display face: Cormorant Garamond, a Garamond cut for display sizes: fine,
// high-contrast and graceful, with an italic that sets the wordmark.
// UI face: Jost, a geometric sans in the Futura tradition.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const body = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Festivo | Planned to the last petal",
    template: "%s | Festivo",
  },
  description:
    "An AI planning assistant for weddings, birthdays and community events: budgets, timelines, vendor checklists and ideas made for you.",
  applicationName: "Festivo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#d8cbb8",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Per-request CSP nonce from proxy.ts; Next.js applies it to its own scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // prefs-init.js sets data-motion before hydration, so React must not warn
    // about that attribute differing from the server HTML.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        {/* Must run synchronously before first paint so motion is settled early.
            It is a 500-byte same-origin file, allowed by this response's CSP nonce. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/prefs-init.js" nonce={nonce} />
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
