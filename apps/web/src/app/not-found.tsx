import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-6xl font-bold text-blue-700" aria-hidden="true">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        The page you are looking for doesn&apos;t exist or may have been moved.
        Try browsing verified competitions instead.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="rounded-md bg-blue-700 px-5 py-2.5 text-white font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go home
        </Link>
        <Link
          href="/competitions"
          className="rounded-md border px-5 py-2.5 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Browse competitions
        </Link>
      </div>
    </div>
  );
}
