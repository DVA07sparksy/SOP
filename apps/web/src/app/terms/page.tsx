import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The rules for using ScholarTrack: acceptable use, competition information disclaimers, AI limitations and liability.",
  robots: { index: true, follow: true },
};

const UPDATED = "September 15, 2026";

export default function TermsPage() {
  return (
    <article className="prose-sm max-w-3xl mx-auto space-y-8 text-sm leading-relaxed">
      <header>
        <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
        <p className="text-gray-500 mt-1">Last updated: {UPDATED}</p>
        <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950 p-3 text-sm rounded">
          This document is a working draft for the platform&apos;s launch and is marked for legal
          review before public deployment in any jurisdiction.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">1. Important — verify before you apply</h2>
        <p>
          Competition information on ScholarTrack is collected from public sources and may be
          incomplete, outdated or occasionally wrong. <strong>Always verify deadlines,
          eligibility and fees with the official organizer before you apply.</strong> ScholarTrack
          is an information and discovery service, not an organizer.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Accounts</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must provide accurate registration information and keep your password confidential.</li>
          <li>One person, one account. Do not share accounts or impersonate others.</li>
          <li>You are responsible for activity under your account. Report unauthorized use immediately.</li>
          <li>We may suspend accounts that violate these terms, abuse the service, or endanger other users.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>submit fake competitions, misleading links or fraudulent listings;</li>
          <li>scrape, overload or interfere with the platform or its infrastructure;</li>
          <li>attempt to access other users&apos; data or restricted administrative functions;</li>
          <li>use the assistant or API in automated ways that circumvent rate limits;</li>
          <li>upload unlawful, harmful or infringing content.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. AI features and limitations</h2>
        <p>
          Recommendations and assistant answers are generated with the help of AI systems and may
          contain errors. Eligibility indicators are computed from structured rules extracted from
          sources — they are decision support, not guarantees. Never rely on them in place of the
          official competition rules.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Applications are external</h2>
        <p>
          Unless explicitly stated, ScholarTrack does not submit applications on your behalf.
          &quot;Apply&quot; links take you to the official organizer&apos;s website, and any
          application you submit is a contract between you and that organizer. We are not a party
          to it and receive no responsibility for its outcome.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Content and intellectual property</h2>
        <p>
          Competition descriptions are summarized from official public sources with attribution
          and links to the original. Rights holders may request corrections or removal at{" "}
          <a className="underline" href="mailto:legal@scholartrack.example">legal@scholartrack.example</a>.
          Content you submit (reports, corrections) may be used to improve the catalog.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Availability and changes</h2>
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;. We may add,
          change or discontinue features, and we aim to announce significant changes in advance.
          We do not guarantee uninterrupted availability.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Liability</h2>
        <p>
          To the maximum extent permitted by law, ScholarTrack is not liable for indirect or
          consequential damages, including missed deadlines, travel costs, or losses arising from
          reliance on information displayed on the platform. Nothing in these terms limits
          liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a className="underline" href="mailto:support@scholartrack.example">support@scholartrack.example</a>.
        </p>
      </section>
    </article>
  );
}
