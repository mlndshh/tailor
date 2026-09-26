import { Section, Signal } from "@tailor/react";
import Link from "next/link";
import { NextStep } from "@/components/next-step";

export default function Vision() {
  return (
    <div className="pt-16">
      <p className="eyebrow">Vision</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Every interface should adapt to the person using it.</h1>
      <Section id="why-now" title="Why now" audience="investor" className="py-8">
        <h2 className="text-xl text-white">Why now</h2>
        <p className="mt-2 text-slate-400">Deciding on every click was possible with LLMs but uneconomic: TypeSafe’s published benchmark puts an LLM workflow at 8.566 s and $0.013880 against Jev at 0.114 s and $0.000081. Calibrated System One models also say when they aren’t sure, which is what makes it safe to change a live page.</p>
      </Section>
      <Section id="market" title="Market" audience="investor" className="py-8">
        <h2 className="text-xl text-white">Market</h2>
        <p className="mt-2 text-slate-400">Website personalization and experimentation is an established category (Mutiny, Webflow Optimize, Optimizely). Existing tools segment once per visit from company data and rules. Tailor decides after every click, from behaviour, and ships as a developer SDK.</p>
      </Section>
      <Section id="roadmap" title="Roadmap" audience="investor" className="py-8">
        <h2 className="text-xl text-white">Roadmap</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-400">
          <li>Lift measurement with a built-in holdout group.</li>
          <li>A script tag for Webflow, Framer and WordPress.</li>
          <li>Versions drafted by an LLM, approved by the team.</li>
          <li>Onboarding flows and chat or voice agents that adapt tone and depth.</li>
          <li>Optimization that learns which version converts each audience.</li>
        </ol>
      </Section>
      <Section id="team" title="Team" audience="investor" className="py-8">
        <h2 className="text-xl text-white">Team</h2>
        <p className="mt-2 text-slate-400">Built at JEVATHON in San Francisco, September 2026.</p>
      </Section>
      <div className="mt-4 flex gap-3">
        <Signal label="clicked Talk to the founders"><Link href="/contact?topic=founders" className="btn-primary">Talk to the founders</Link></Signal>
        <Signal label="clicked Read the roadmap"><a href="#roadmap" className="btn-ghost">Read the roadmap</a></Signal>
      </div>
      <NextStep />
    </div>
  );
}
