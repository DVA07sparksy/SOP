"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CompetitionCard } from "@/components/CompetitionCard";

const EDUCATION_LEVELS = ["SECONDARY", "UNIVERSITY", "GRADUATE", "OTHER"] as const;
const FORMATS = ["ONLINE", "OFFLINE", "HYBRID"] as const;
const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "COMPETITIVE", "ADVANCED", "HIGHLY_COMPETITIVE"] as const;

export default function CompetitionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    educationLevel: [] as string[],
    format: [] as string[],
    difficulty: [] as string[],
    country: "",
    cost: "",
    category: "",
    hasCertificate: false,
    hasPrize: false,
    hasTravel: false
  });

  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    loadCompetitions();
  }, [q, filters, page]);

  async function loadCompetitions() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      
      if (q) params.q = q;
      if (filters.educationLevel.length > 0) params.educationLevel = filters.educationLevel.join(",");
      if (filters.format.length > 0) params.format = filters.format.join(",");
      if (filters.difficulty.length > 0) params.difficulty = filters.difficulty.join(",");
      if (filters.country) params.country = filters.country;
      if (filters.cost) params.cost = filters.cost;
      if (filters.category) params.category = filters.category;
      if (filters.hasCertificate) params.hasCertificate = "true";
      if (filters.hasPrize) params.hasPrize = "true";
      if (filters.hasTravel) params.hasTravel = "true";

      const res = await api.feed(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleFilter(filterType: keyof typeof filters, value: string) {
    const current = filters[filterType] as string[];
    const updated = current.includes(value) 
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [filterType]: updated });
    setPage(1);
  }

  function toggleBooleanFilter(filterType: keyof typeof filters) {
    setFilters({ ...filters, [filterType]: !filters[filterType] });
    setPage(1);
  }

  function clearFilters() {
    setFilters({
      educationLevel: [],
      format: [],
      difficulty: [],
      country: "",
      cost: "",
      category: "",
      hasCertificate: false,
      hasPrize: false,
      hasTravel: false
    });
    setQ("");
    setPage(1);
  }

  const activeFilterCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v !== "" && v !== false
  ).length + (q ? 1 : 0);

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Browse competitions</h1>
            <p className="mt-1 text-neutral-500 text-sm">
              Every listing has passed discovery → extraction → verification → review.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-md border px-4 py-2 hover:bg-neutral-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="rounded-md border px-4 py-2 hover:bg-neutral-50 text-sm"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 w-full sm:w-72">
          <label htmlFor="comp-search" className="block text-sm font-medium mb-1">Search</label>
          <input
            id="comp-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. mathematics, olympiad, AI…"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="font-semibold mb-4">Filter competitions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Education Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Education level</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleFilter("educationLevel", level)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      filters.educationLevel.includes(level)
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {level.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Format</label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFilter("format", format)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      filters.format.includes(format)
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {format.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_LEVELS.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => toggleFilter("difficulty", diff)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      filters.difficulty.includes(diff)
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {diff.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Country</label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                placeholder="e.g. Cameroon"
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Cost</label>
              <select
                value={filters.cost}
                onChange={(e) => setFilters({ ...filters, cost: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">Any</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Category</label>
              <input
                type="text"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                placeholder="e.g. mathematics, AI"
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
            </div>

            {/* Benefits toggles */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-2 block text-sm font-medium text-neutral-700">Benefits</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hasCertificate}
                    onChange={() => toggleBooleanFilter("hasCertificate")}
                    className="rounded"
                  />
                  <span className="text-sm">Certificate</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hasPrize}
                    onChange={() => toggleBooleanFilter("hasPrize")}
                    className="rounded"
                  />
                  <span className="text-sm">Prize/Money</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hasTravel}
                    onChange={() => toggleBooleanFilter("hasTravel")}
                    className="rounded"
                  />
                  <span className="text-sm">Travel opportunity</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-4 text-sm text-neutral-600">
        {loading ? "Loading..." : `Showing ${items.length} of ${total} competitions`}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ))}
          <span className="sr-only">Loading competitions…</span>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load competitions ({error}).{" "}
          <button className="underline" onClick={() => location.reload()}>Retry</button>
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-medium">No competitions found matching your criteria.</p>
          <p className="mt-1 text-sm text-neutral-500">Try adjusting your filters or search terms.</p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <CompetitionCard key={c.id} competition={c} />
        ))}
      </div>

      {/* Pagination */}
      {!loading && !error && total > pageSize && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page >= Math.ceil(total / pageSize)}
            className="rounded-md border px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}