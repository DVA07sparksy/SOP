"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CompetitionCard } from "@/components/CompetitionCard";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, []);

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.feed({ q: searchQuery });
      setResults(res.items);
    } catch (e: any) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-neutral-500">Find competitions by title, organizer, category, or keywords.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search competitions..."
            className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-md bg-brand-600 px-6 py-3 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </form>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      )}

      {!loading && searched && (
        <div>
          <p className="mb-4 text-sm text-neutral-600">
            {results.length} result{results.length !== 1 ? "s" : ""} found for "{query}"
          </p>

          {results.length === 0 ? (
            <div className="rounded-md border p-8 text-center">
              <p className="font-medium">No competitions found matching your search.</p>
              <p className="mt-1 text-sm text-neutral-500">
                Try different keywords, check your spelling, or browse all competitions.
              </p>
              <button
                onClick={() => router.push("/competitions")}
                className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
              >
                Browse all competitions
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Search for competitions</h2>
          <p className="text-neutral-600 mb-4">
            Enter keywords to find specific competitions, organizers, or categories.
          </p>
          <div className="text-sm text-neutral-500">
            <p className="font-medium mb-2">Popular searches:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["mathematics olympiad", "AI competition", "programming contest", "science fair"].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    performSearch(term);
                  }}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}