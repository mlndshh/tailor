import { Section, Signal } from "@tailor/react";
import Link from "next/link";
import { NextStep } from "@/components/next-step";

const CASES = [
  { id: "homepage", title: "Dev-tool homepage", body: "One homepage, four audiences.", sees: [["Developer", "Quickstart and code first; 'Get a site key'."], ["Growth lead", "Outcomes and use cases first; 'Book a walkthrough'."], ["Privacy reviewer", "Data practices first."], ["Investor", "Why now and roadmap first."]] },
  { id: "pricing", title: "Pricing page", body: "Highlight the plan that fits.", sees: [["Developer", "Free tier highlighted, rate limits in the FAQ first."], ["Growth lead", "Usage-based plan highlighted, lift reports explained."], ["Privacy reviewer", "Enterprise plan with the data agreement highlighted."], ["Investor", "Unit economics note highlighted."]] },
  { id: "docs", title: "Docs site", body: "Order guides by what the reader is doing.", sees: [["Developer", "API reference and copyable examples first."], ["Growth lead", "Concepts and outcomes before the API."], ["Privacy reviewer", "Data handling pages first."], ["Investor", "Architecture overview first."]] },
  { id: "onboarding", title: "SaaS onboarding (roadmap)", body: "Adapt the setup checklist to the user's first clicks.", sees: [["Developer", "API keys and SDK setup first."], ["Growth lead", "Invite the team and connect analytics first."], ["Privacy reviewer", "Data settings first."], ["Investor", "Not applicable."]] },
];

export default function UseCases() {
  return (
    <div className="pt-16">
      <p className="eyebrow">Use cases</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Where Tailor helps</h1>
      <p className="mt-4 max-w-2xl text-slate-400">Anywhere several audiences share one page. Your team writes the versions; Tailor chooses which to lead with.</p>
      <div className="mt-8 grid gap-4">
        {CASES.map((c) => (
          <Section key={c.id} id={c.id} title={c.title} audience="growth_lead">
            <div className="card">
              <h2 className="text-xl text-white">{c.title}</h2>
              <p className="mt-1 text-slate-400">{c.body}</p>
              <details className="mt-3"><summary className="cursor-pointer text-amber-400">See what each visitor sees</summary>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">{c.sees.map(([who, what]) => <li key={who}><strong className="text-white">{who}:</strong> {what}</li>)}</ul>
              </details>
            </div>
          </Section>
        ))}
      </div>
      <div className="mt-8">
        <Signal label="clicked Book a walkthrough"><Link href="/contact?topic=walkthrough" className="btn-primary">Book a walkthrough</Link></Signal>
      </div>
      <NextStep />
    </div>
  );
}
