"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CompetitionCard } from "@/components/CompetitionCard";

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .feed()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero: one primary CTA — what it is, who for, what to do next */}
      <section className="py-12 sm:py-16 text-center max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Find competitions you&apos;re actually eligible for
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Verified competitions and olympiads for secondary and university students — starting
          in Cameroon, open to the world. Tell us your level and interests; we&apos;ll show you
          what you can enter, with deadlines and official links.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/for-you"
            className="rounded-md bg-blue-700 px-6 py-3 text-white font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Find my competitions
          </Link>
          <Link
            href="/competitions"
            className="rounded-md border px-6 py-3 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Browse all competitions
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Free for students · Sources verified and reviewed by humans · AI-powered matching
        </p>
      </section>

      {/* Feature highlights */}
      <section className="py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🎯"
            title="Smart Matching"
            description="AI-powered recommendations based on your profile, interests, and eligibility"
          />
          <FeatureCard
            icon="✓"
            title="Verified Sources"
            description="Every competition is reviewed by humans before publication"
          />
          <FeatureCard
            icon="🌍"
            title="Global Opportunities"
            description="From local contests to international olympiads"
          />
        </div>
      </section>

      <section className="py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Latest verified competitions</h2>
          <Link href="/competitions" className="text-sm text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
            ))}
            <span className="sr-only">Loading competitions…</span>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            Couldn&apos;t load competitions ({error}). Check your connection and{" "}
            <button className="underline" onClick={() => location.reload()}>retry</button>.
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-neutral-500">No competitions published yet — check back soon.</p>
        )}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((c) => (
            <CompetitionCard key={c.id} competition={c} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 text-center bg-neutral-50 dark:bg-neutral-900 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">Ready to find your next opportunity?</h2>
        <p className="text-neutral-600 mb-6">
          Join thousands of students discovering competitions that match their skills and interests.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-blue-700 px-6 py-3 text-white font-semibold hover:bg-blue-800"
          >
            Get Started Free
          </Link>
          <Link
            href="/faq"
            className="rounded-md border px-6 py-3 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Learn More
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </div>
  );
}
