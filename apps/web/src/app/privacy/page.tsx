import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What information ScholarTrack collects, why, how it is used and protected, and your rights over your data.",
  robots: { index: true, follow: true },
};

const UPDATED = "September 15, 2026";

export default function PrivacyPage() {
  return (
    <article className="prose-sm max-w-3xl mx-auto space-y-8 text-sm leading-relaxed">
      <header>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-gray-500 mt-1">Last updated: {UPDATED}</p>
        <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950 p-3 text-sm rounded">
          This policy is a working document for the platform&apos;s launch and is marked for
          legal review before public deployment in any jurisdiction.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p>
          ScholarTrack (&quot;the platform&quot;) helps students discover competitions and
          olympiads — first in Cameroon, then internationally. For privacy questions contact{" "}
          <a className="underline" href="mailto:privacy@scholartrack.example">privacy@scholartrack.example</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> email address and password (stored only as a salted hash).</li>
          <li><strong>Profile data:</strong> name, education level, institution, fields of study, interests, skills, age, and location (country/region/city) — collected progressively as you complete your profile.</li>
          <li><strong>Activity data:</strong> saved competitions, application tracking records, achievements, and reports you file.</li>
          <li><strong>Usage events:</strong> pages viewed, searches performed, and recommendations clicked (see Analytics below).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Why we use it</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To tell you which competitions you are actually eligible for (eligibility and matching run on your profile).</li>
          <li>To let you save competitions and track applications.</li>
          <li>To send deadline reminders and notifications you opt into.</li>
          <li>To keep the platform safe and to improve the competition catalog.</li>
        </ul>
        <p className="mt-2">
          We only ask for information that is genuinely needed for eligibility — for example, age
          is requested only when a competition requires an age range.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. AI processing</h2>
        <p>
          The platform uses AI models (currently DeepSeek and xAI&apos;s Grok) to extract
          structured information from public competition web pages, and optionally to answer
          questions about competitions. When you chat with the assistant, your message and
          relevant public competition data are processed by these providers. We do not send
          your password, tokens, or private documents to AI providers, and we minimize profile
          data shared for recommendations.
        </p>
        <p className="mt-2">
          AI output is always validated and reviewed before it affects what you see; eligibility
          decisions are computed by deterministic code from structured rules, not by a language model.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Cookies &amp; local storage</h2>
        <p>
          The web app uses local storage in your browser to keep you signed in. We do not use
          advertising cookies or cross-site tracking. If non-essential analytics cookies are
          introduced, a consent preference will be shown first.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Third-party services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Database &amp; hosting:</strong> our infrastructure providers store the data described above.</li>
          <li><strong>AI providers:</strong> DeepSeek and xAI (Grok), as described in section 4.</li>
          <li><strong>Email:</strong> a transactional email provider may send you notifications you opted into.</li>
        </ul>
        <p className="mt-2">
          An up-to-date inventory of processors is maintained internally and available on request.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Retention &amp; your rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Export:</strong> you can download all personal data we hold via <em>Account → Export my data</em>.</li>
          <li><strong>Deletion:</strong> you can delete your account at any time via <em>Account → Delete account</em>. Profile data, applications, achievements and events are deleted; moderation reports you filed are anonymized (kept for integrity of moderation history without any identifying link).</li>
          <li><strong>Correction:</strong> you can edit your profile at any time.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Minors</h2>
        <p>
          The platform serves secondary-school students, including minors. We collect only the
          minimal data needed for eligibility, we do not publicly display student profiles, and
          we encourage students to provide school contact details only where a competition
          requires them. If you are a parent or guardian with concerns, contact us at{" "}
          <a className="underline" href="mailto:privacy@scholartrack.example">privacy@scholartrack.example</a>.
          Specific age-of-consent requirements will be confirmed during legal review before launch.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">9. Security</h2>
        <p>
          Passwords are hashed (never stored in plain text), access is enforced server-side,
          sensitive actions are audited, and traffic is encrypted in transit. See our{" "}
          <Link className="underline" href="/terms">Terms</Link> for service disclaimers.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">10. Changes to this policy</h2>
        <p>
          We will post any changes on this page with a new &quot;Last updated&quot; date. Material
          changes will be announced in-app before they take effect.
        </p>
      </section>
    </article>
  );
}
