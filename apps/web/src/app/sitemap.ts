import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic"; // never cache at build time; public competitions only

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/competitions`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const { items } = await api.feed({ limit: "500" });
    return [
      ...staticEntries,
      ...items
        .filter((c) => c.status === "PUBLISHED")
        .map((c) => ({
          url: `${siteUrl}/competitions/${c.id}`,
          lastModified: c.lastVerifiedAt ? new Date(c.lastVerifiedAt) : undefined,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
    ];
  } catch {
    // API unreachable at build/sitemap time — serve static pages rather than failing.
    return staticEntries;
  }
}
