"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-24 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        An unexpected error occurred. Please try again — if the problem persists,
        contact support@scholartrack.example.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-md bg-blue-700 px-5 py-2.5 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
