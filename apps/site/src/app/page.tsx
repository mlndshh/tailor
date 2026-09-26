import { Emphasis, Section, Slot, SlotGroup, Variant } from "@tailor/react";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { NextStep } from "@/components/next-step";

const Hero = ({ eyebrow, title, body, cta, href }: { eyebrow: string; title: string; body: string; cta: string; href: string }) => (
  <div className="pt-20 pb-8">
    <p className="eyebrow">{eyebrow}</p>
    <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
    <p className="mt-5 max-w-2xl text-lg text-slate-400">{body}</p>
    <Link href={href} className="btn-primary mt-8">{cta}</Link>
  </div>
);
const Second = ({ href, text }: { href: string; text: string }) => <Link href={href} className="btn-ghost">{text}</Link>;

const INSTALL = "npm install @tailor/react";
const USAGE = `<TailorProvider siteKey="site_…" endpoint="/api/tailor/v1/decide" initial={initial}>
  <Slot name="hero">
    <Variant default><Hero /></Variant>
    <Variant audience="developer"><CodeFirstHero /></Variant>
  </Slot>
</TailorProvider>`;

export default function Home() {
  return (
    <>
      <Slot name="hero">
        <Variant default><Hero eyebrow="Adaptive websites" title="Every visitor sees the page that fits them." body="Tailor reads each visitor on every click and puts what they came for first: code for developers, outcomes for buyers, data practices for reviewers. It never hides anything." cta="See how it works" href="#how-it-works" /></Variant>
        <Variant audience="developer"><Hero eyebrow="For developers" title="Personalize any React site in five minutes." body="Wrap a section in <Slot>, write a version per audience, and Tailor picks one per visitor. About 300 ms and a fraction of a cent per decision." cta="Read the quickstart" href="/docs" /></Variant>
        <Variant audience="growth_lead"><Hero eyebrow="For growth teams" title="Show every visitor the page that converts them." body="Developers, buyers, reviewers and investors land on the same homepage. Tailor leads each one with what they came for, and only when it's confident." cta="Book a walkthrough" href="/contact?topic=walkthrough" /></Variant>
        <Variant audience="privacy_reviewer"><Hero eyebrow="For privacy reviewers" title="No personal data. First-party only." body="Tailor uses on-site behaviour from the current session. No fingerprinting, no third-party cookies, no protected traits. Visitors can see and reset every choice." cta="Read our data practices" href="/privacy" /></Variant>
        <Variant audience="investor"><Hero eyebrow="For investors" title="Every website will adapt to its visitor. Jev made it affordable." body="Per-click decisions used to cost seconds and cents with LLMs. System One models make them milliseconds and fractions of a cent. Tailor is the layer that puts them to work." cta="Read why now" href="/vision" /></Variant>
      </Slot>
      <div className="-mt-4 mb-8">
        <Slot name="second-cta" rank={1}>
          <Variant default><Second href="/use-cases" text="See use cases" /></Variant>
          <Variant audience="developer"><Second href="/docs" text="Read the docs" /></Variant>
          <Variant audience="growth_lead"><Second href="/use-cases" text="See use cases" /></Variant>
          <Variant audience="privacy_reviewer"><Second href="/privacy" text="Read our data practices" /></Variant>
          <Variant audience="investor"><Second href="/contact?topic=founders" text="Talk to the founders" /></Variant>
        </Slot>
      </div>

      <SlotGroup name="home">
        <Section id="how-it-works" title="How it works" className="py-12">
          <h2 className="text-2xl font-semibold text-white">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["1. Write your versions", "Wrap a section in <Slot> and write one version per audience. Your content, your words."],
              ["2. Tailor reads the visitor", "Where they came from and what they do, judged by Jev on every meaningful click."],
              ["3. The page adapts", "Headlines, buttons and section order change off-screen, only when Tailor is confident. Nothing is hidden."],
            ].map(([t, b]) => <div key={t} className="card"><h3 className="font-medium text-white">{t}</h3><p className="mt-2 text-sm text-slate-400">{b}</p></div>)}
          </div>
        </Section>
        <Section id="outcomes" title="What each visitor sees" audience="growth_lead" className="py-12">
          <h2 className="text-2xl font-semibold text-white">What each visitor sees</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Developer", "The quickstart, code samples and latency numbers first."],
              ["Growth lead", "Use cases, outcomes and a walkthrough button first."],
              ["Privacy reviewer", "What we collect, cookies and retention first."],
              ["Investor", "Why now, the roadmap and the team first."],
            ].map(([t, b]) => <div key={t} className="card"><h3 className="font-medium text-white">{t}</h3><p className="mt-2 text-sm text-slate-400">{b}</p></div>)}
          </div>
          <p className="mt-4 text-sm text-slate-500">We're in beta and haven't published lift numbers yet. Built-in holdout measurement is next on the roadmap.</p>
          <Link href="/use-cases" className="mt-4 inline-block text-amber-400">See use cases →</Link>
        </Section>
        <Section id="quickstart" title="Quickstart" audience="developer" className="py-12">
          <h2 className="text-2xl font-semibold text-white">Quickstart</h2>
          <div className="mt-6 space-y-3">
            <CodeBlock code={INSTALL} signal="copied the install command" />
            <CodeBlock code={USAGE} signal="copied the Slot example" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            <div className="card"><div className="text-2xl text-white">~300 ms</div>per decision, measured in the Lens</div>
            <div className="card"><div className="text-2xl text-white">≈ $0.00003</div>model cost per decision (estimated)</div>
            <div className="card"><div className="text-2xl text-white">0</div>sections hidden, ever</div>
          </div>
          <Link href="/docs" className="mt-4 inline-block text-amber-400">Full docs →</Link>
        </Section>
        <Section id="privacy" title="Privacy summary" audience="privacy_reviewer" className="py-12">
          <h2 className="text-2xl font-semibold text-white">Privacy summary</h2>
          <ul className="mt-6 grid gap-2 text-slate-300 sm:grid-cols-2">
            {["Session-only behaviour: clicks and reading time on this site", "One first-party cookie; no third-party cookies", "No names, emails or IP-based identity", "No fingerprinting", "No inference of protected traits", "Visitors can see, change and reset every choice"].map((x) => <li key={x} className="card text-sm">{x}</li>)}
          </ul>
          <Link href="/privacy" className="mt-4 inline-block text-amber-400">Full data practices →</Link>
        </Section>
        <Section id="pricing" title="Pricing" audience="growth_lead" className="py-12">
          <h2 className="text-2xl font-semibold text-white">Pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Emphasis audience="developer" className="card" onClassName="emph"><h3 className="text-white">Beta</h3><p className="text-2xl text-white">Free</p><p className="mt-2 text-sm text-slate-400">Everything, during the beta.</p></Emphasis>
            <Emphasis audience="growth_lead" className="card" onClassName="emph"><h3 className="text-white">Growth</h3><p className="text-2xl text-white">Planned</p><p className="mt-2 text-sm text-slate-400">Usage-based, per 10,000 decisions, with lift reports.</p></Emphasis>
            <Emphasis audience="privacy_reviewer" className="card" onClassName="emph"><h3 className="text-white">Enterprise</h3><p className="text-2xl text-white">Planned</p><p className="mt-2 text-sm text-slate-400">Data processing agreement, SSO, regional data handling.</p></Emphasis>
          </div>
          <Emphasis audience="investor" className="mt-4 rounded-lg p-3 text-sm text-slate-400" onClassName="emph">
            Unit economics: at about $0.00003 of model cost per decision (estimated), a site making a million decisions a month spends about $30 on inference.
          </Emphasis>
        </Section>
        <Section id="vision" title="Why now" audience="investor" className="py-12">
          <h2 className="text-2xl font-semibold text-white">Why now</h2>
          <p className="mt-4 max-w-3xl text-slate-400">Per-click decisions were possible with LLMs but too slow and expensive: TypeSafe's published benchmark shows an LLM workflow at 8.566 s and $0.013880 against Jev at 0.114 s and $0.000081. System One models make adapting every page to every visitor practical.</p>
          <Link href="/vision" className="mt-4 inline-block text-amber-400">Read the vision →</Link>
        </Section>
        <Section id="faq" title="FAQ" className="py-12">
          <h2 className="text-2xl font-semibold text-white">FAQ</h2>
          <SlotGroup name="faq">
            <Section id="faq-hide" title="FAQ: Does Tailor hide content?"><details className="card mt-3"><summary className="cursor-pointer text-white">Does Tailor hide content?</summary><p className="mt-2 text-sm text-slate-400">No. It reorders sections, swaps headlines and buttons, and highlights. Every page and section stays reachable, and the switcher lets anyone pick a view.</p></details></Section>
            <Section id="faq-fast" title="FAQ: How fast is a decision?" audience="developer"><details className="card mt-3"><summary className="cursor-pointer text-white">How fast is a decision?</summary><p className="mt-2 text-sm text-slate-400">About 300 ms from our server to Jev and back; the Lens shows each one. Changes are applied off-screen, so nothing jumps.</p></details></Section>
            <Section id="faq-data" title="FAQ: What data do you store?" audience="privacy_reviewer"><details className="card mt-3"><summary className="cursor-pointer text-white">What data do you store?</summary><p className="mt-2 text-sm text-slate-400">This session's clicks and reading time, in your browser's session storage, plus one first-party cookie holding the current view. Our server keeps nothing between requests.</p></details></Section>
            <Section id="faq-works" title="FAQ: How do I know it works?" audience="growth_lead"><details className="card mt-3"><summary className="cursor-pointer text-white">How do I know it works?</summary><p className="mt-2 text-sm text-slate-400">Today: simulated visitors and the Lens. Next: a built-in holdout group that measures lift for each audience.</p></details></Section>
            <Section id="faq-now" title="FAQ: Why is this possible now?" audience="investor"><details className="card mt-3"><summary className="cursor-pointer text-white">Why is this possible now?</summary><p className="mt-2 text-sm text-slate-400">System One models like Jev return calibrated decisions in milliseconds for fractions of a cent, so deciding on every click finally pays for itself.</p></details></Section>
          </SlotGroup>
        </Section>
      </SlotGroup>
      <NextStep />
    </>
  );
}
