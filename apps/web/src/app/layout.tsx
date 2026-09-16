import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AssistantWidget } from "@/components/AssistantWidget";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ScholarTrack — Find competitions you're actually eligible for",
    template: "%s | ScholarTrack",
  },
  description:
    "Discover student competitions and olympiads — from Cameroon and around the world — with clear eligibility, verified sources and deadlines. Free for students.",
  keywords: [
    "student competitions",
    "olympiads",
    "Cameroon students",
    "mathematics competition",
    "science olympiad",
    "scholarships competitions",
    "university contests",
  ],
  openGraph: {
    type: "website",
    siteName: "ScholarTrack",
    title: "ScholarTrack — Find competitions you're actually eligible for",
    description:
      "Verified student competitions and olympiads with clear eligibility and deadlines. Built for students in Cameroon, designed for the world.",
    url: siteUrl,
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarTrack — Find competitions you're actually eligible for",
    description:
      "Verified student competitions and olympiads with clear eligibility and deadlines.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-blue-700 focus:text-white focus:px-4 focus:py-2 focus:rounded"
          >
            Skip to content
          </a>
          <Nav />
          <main id="main-content" className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            {children}
          </main>
          <Footer />
          <AssistantWidget />
        </ErrorBoundary>
      </body>
    </html>
  );
}
