import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/competitions", "/competitions/*", "/search", "/faq", "/contact", "/privacy", "/terms"],
        disallow: [
          "/admin",
          "/admin/*",
          "/for-you",
          "/saved",
          "/applications",
          "/achievements",
          "/profile",
          "/student/*",
          "/institution/*",
          "/notifications",
          "/login",
          "/assistant",
          "/api/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
