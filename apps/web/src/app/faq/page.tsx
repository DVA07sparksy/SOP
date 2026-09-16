import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "What ScholarTrack is, who it's for, how recommendations work, whether competitions are verified, and how to report a problem.",
  robots: { index: true, follow: true },
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is ScholarTrack?",
    a: "A platform that helps students discover competitions and olympiads — starting in Cameroon and expanding internationally — with clear eligibility, verified sources, and deadline tracking.",
  },
  {
    q: "Who can use it?",
    a: "Any student: secondary school, university, or graduate. You create a free profile with your education level, fields of study and interests, and we use it to filter and rank competitions for you.",
  },
  {
    q: "Are competitions verified?",
    a: (
      <>
        Every competition shows a source link and a trust status. Records extracted by our AI are
        always reviewed by a human before publication, and each page shows when it was last
        verified. Still, <strong>always confirm details with the official organizer before
        applying</strong>.
      </>
    ),
  },
  {
    q: "How do recommendations work?",
    a: "We check hard eligibility rules first (age, education level, country, student status), then rank what's left using your interests, skills, location, cost and format preferences. Every recommendation shows a plain-language explanation of why it matched — not just a percentage.",
  },
  {
    q: "Is the platform free?",
    a: "Yes — for students, it's free. The platform may later charge organizers or institutions for verified submission services, but discovery, matching and tracking stay free for students.",
  },
  {
    q: "Do you apply for competitions on my behalf?",
    a: "No. Application links take you to the official organizer's website. You can track your progress (started, applied, shortlisted, won...) here, but applications themselves happen outside the platform.",
  },
  {
    q: "How are eligibility requirements determined?",
    a: "Eligibility rules (age, education level, country, student status, fees) are extracted from official sources by AI, converted into structured rules, and evaluated by deterministic code against your profile. When the source is ambiguous we say so instead of guessing.",
  },
  {
    q: "How can an organization submit a competition?",
    a: "Institution accounts can submit competitions for review and verify their students' participation. For now, contact support@scholartrack.example and we'll set you up.",
  },
  {
    q: "How do I report incorrect information?",
    a: (
      <>
        Every competition page has a <strong>Report</strong> button — flag fake competitions,
        wrong information, broken links or suspicious organizers. Our team reviews every report.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Frequently asked questions</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Everything about finding, understanding and tracking competitions on ScholarTrack.
      </p>
      <div className="mt-8 divide-y">
        {FAQS.map((f, i) => (
          <details key={i} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
              {f.q}
              <span aria-hidden="true" className="text-blue-700 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
