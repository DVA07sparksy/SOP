import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-3 text-sm">
        <div>
          <p className="font-semibold">ScholarTrack</p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Helping students find competitions they are actually eligible for.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="font-semibold">Platform</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="underline hover:text-blue-700" href="/competitions">Browse competitions</Link></li>
            <li><Link className="underline hover:text-blue-700" href="/for-you">For you</Link></li>
            <li><Link className="underline hover:text-blue-700" href="/faq">FAQ</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="font-semibold">Legal &amp; support</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="underline hover:text-blue-700" href="/privacy">Privacy Policy</Link></li>
            <li><Link className="underline hover:text-blue-700" href="/terms">Terms &amp; Conditions</Link></li>
            <li>
              <a className="underline hover:text-blue-700" href="mailto:support@scholartrack.example">
                support@scholartrack.example
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-gray-500">
          © {year} ScholarTrack. Competition information is collected from public sources and may
          change — always verify with the official organizer before applying.
        </p>
      </div>
    </footer>
  );
}
