import { Section, Signal } from "@tailor/react";
import Link from "next/link";
import { NextStep } from "@/components/next-step";

const ITEMS = [
  ["What we collect", "Clicks on links and buttons, which sections you read and roughly for how long (in words, not seconds), the page you landed on, and the referring site's domain or campaign tags. Only for this browser tab's session."],
  ["What we don't collect", "No names, emails, IP-based identity, device fingerprints or cross-site tracking. We never infer protected traits such as age, gender, ethnicity or health."],
  ["Cookies", "One first-party cookie, tailor_decision, holding the current view (for example 'developer') so the next page renders without flicker. It's a session cookie: it ends when you close the browser."],
  ["Data retention", "Your session lives in your browser's session storage. Our server is stateless: it reads the session with each request and keeps nothing afterwards, apart from a cache of anonymous arrival reads keyed by campaign tags."],
  ["Subprocessors", "Vercel hosts the site and routes model calls through Vercel AI Gateway (falling back to TypeSafe’s API directly). TypeSafe runs Jev, which receives only the anonymous actions list and arrival tags."],
  ["Your controls", "The 'Showing' switcher in the header lets you pick any view or go back to Auto. The Lens shows every decision and has a reset."],
];

export default function Privacy() {
  return (
    <div className="pt-16">
      <p className="eyebrow">Privacy & data</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">How Tailor handles visitor data</h1>
      <div className="mt-8 space-y-3">
        {ITEMS.map(([title, body]) => (
          <Section key={title} id={title.toLowerCase().replace(/\W+/g, "-")} title={title} audience="privacy_reviewer">
            <details className="card"><summary className="cursor-pointer text-white">{title}</summary><p className="mt-2 text-slate-400">{body}</p></details>
          </Section>
        ))}
      </div>
      <div className="mt-8">
        <Signal label="requested the data summary"><Link href="/contact?topic=data-summary" className="btn-primary">Request our data summary</Link></Signal>
      </div>
      <NextStep />
    </div>
  );
}
