import { Emphasis, Section, Slot, SlotGroup, Variant } from "@tailor/react";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { FittingPanel } from "@/components/fitting-panel";
import { NextStep } from "@/components/next-step";

const Hero = ({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) => (
  <div>
    <p className="eyebrow">{eyebrow}</p>
    <h1 className="mt-4 font-display text-5xl leading-[0.98] tracking-tight text-chalk sm:text-7xl">{title}</h1>
    <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted">{body}</p>
  </div>
);
const Primary = ({ href, text }: { href: string; text: string }) => <Link href={href} className="btn-primary">{text}</Link>;
const Second = ({ href, text }: { href: string; text: string }) => <Link href={href} className="btn-ghost">{text}</Link>;

const INSTALL = `# @tailor/react ships in the repo for now (npm package coming soon)
git clone https://github.com/mlndshh/tailor && cd tailor
pnpm install && pnpm dev`;
const USAGE = `<TailorProvider siteKey="site_…" endpoint="/api/tailor/v1/decide" initial={initial}>
  <Slot name="hero">
    <Variant default><Hero /></Variant>
    <Variant audience="developer"><CodeFirstHero /></Variant>
  </Slot>
</TailorProvider>`;

const Check = () => (
  <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-tape" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FitTag = () => (
  <span className="fit-tag mb-3 w-fit rounded-full bg-tape px-2.5 py-0.5 text-xs font-semibold text-denim">Tailored for you</span>
);

export default function Home() {
  return (
    <>
      <section className="grid items-start gap-12 pt-16 pb-16 sm:pt-24 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
        <div>
          <Slot name="hero">
            <Variant default><Hero eyebrow="Adaptive websites" title="Every visitor sees the page that fits them." body="Tailor reads each visitor on every click and puts what they came for first: code for developers, outcomes for buyers, data practices for reviewers. It never hides anything." /></Variant>
            <Variant audience="developer"><Hero eyebrow="For developers" title="Personalize any React site in five minutes." body="Wrap a section in <Slot>, write a version per audience, and Tailor picks one per visitor. Under a second and a fraction of a cent per decision, shown live in the Lens." /></Variant>
            <Variant audience="growth_lead"><Hero eyebrow="For growth teams" title="Show every visitor the page that converts them." body="Developers, buyers, reviewers and investors land on the same homepage. Tailor leads each one with what they came for, and only when it’s confident." /></Variant>
            <Variant audience="privacy_reviewer"><Hero eyebrow="For privacy reviewers" title="No personal data. First-party only." body="Tailor uses on-site behaviour from the current session. No fingerprinting, no third-party cookies, no protected traits. Visitors can see and reset every choice." /></Variant>
            <Variant audience="investor"><Hero eyebrow="For investors" title="Every website will adapt to its visitor. Jev made it affordable." body="Per-click decisions used to cost seconds and cents with LLMs. System One models make them milliseconds and fractions of a cent. Tailor is the layer that puts them to work." /></Variant>
          </Slot>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Slot name="primary-cta">
              <Variant default><Primary href="#how-it-works" text="See how it works" /></Variant>
              <Variant audience="developer"><Primary href="/docs" text="Read the quickstart" /></Variant>
              <Variant audience="growth_lead"><Primary href="/contact?topic=walkthrough" text="Book a walkthrough" /></Variant>
              <Variant audience="privacy_reviewer"><Primary href="/privacy" text="Read our data practices" /></Variant>
              <Variant audience="investor"><Primary href="/vision" text="Read why now" /></Variant>
            </Slot>
            <Slot name="second-cta" rank={1}>
              <Variant default><Second href="/use-cases" text="See use cases" /></Variant>
              <Variant audience="developer"><Second href="/docs" text="Read the docs" /></Variant>
              <Variant audience="growth_lead"><Second href="/use-cases" text="See use cases" /></Variant>
              <Variant audience="privacy_reviewer"><Second href="/privacy" text="Read our data practices" /></Variant>
              <Variant audience="investor"><Second href="/contact?topic=founders" text="Talk to the founders" /></Variant>
            </Slot>
          </div>
        </div>
        <FittingPanel />
      </section>

      <SlotGroup name="home">
        <Section id="how-it-works" title="How it works" className="stitch-top py-20">
          <h2 className="section-title">How it works</h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              ["Write your versions", "Wrap a section in <Slot> and write one version per audience. Your content, your words."],
              ["Tailor reads the visitor", "Where they came from and what they do, judged by Jev on every meaningful click."],
              ["The page adapts", "Headlines, buttons and section order change off-screen, only when Tailor is confident. Nothing is hidden."],
            ].map(([t, b], i) => (
              <li key={t}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-tape font-display text-xl text-tape">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold text-chalk">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="outcomes" title="What each visitor sees" audience="growth_lead" className="stitch-top py-20">
          <h2 className="section-title">What each visitor sees</h2>
          <dl className="mt-10 divide-y divide-dashed divide-stitch border-y border-dashed border-stitch">
            {[
              ["Developer", "The quickstart, code samples and latency numbers first."],
              ["Growth lead", "Use cases, outcomes and a walkthrough button first."],
              ["Privacy reviewer", "What we collect, cookies and retention first."],
              ["Investor", "Why now, the roadmap and the team first."],
            ].map(([t, b]) => (
              <div key={t} className="grid gap-2 py-5 sm:grid-cols-[16rem_1fr] sm:items-baseline">
                <dt className="font-display text-2xl text-chalk">{t}</dt>
                <dd className="text-muted">{b}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted">We’re in beta and haven’t published lift numbers yet. Built-in holdout measurement is next on the roadmap.</p>
          <Link href="/use-cases" className="text-link mt-4 inline-block text-sm">See use cases</Link>
        </Section>

        <Section id="quickstart" title="Quickstart" audience="developer" className="stitch-top py-20">
          <h2 className="section-title">Quickstart</h2>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-3">
              <CodeBlock code={INSTALL} signal="copied the install command" />
              <CodeBlock code={USAGE} signal="copied the Slot example" />
            </div>
            <dl className="space-y-6">
              {[
                ["< 1 s", "per decision, shown live in the Lens"],
                ["≈ $0.00003", "model cost per decision (estimated)"],
                ["0", "sections hidden, ever"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="whitespace-nowrap font-display text-4xl text-tape">{n}</dt>
                  <dd className="mt-1 text-sm text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link href="/docs" className="text-link mt-8 inline-block text-sm">Read the full docs</Link>
        </Section>

        <Section id="privacy" title="Privacy summary" audience="privacy_reviewer" className="stitch-top py-20">
          <h2 className="section-title">Privacy summary</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-5 text-chalk sm:grid-cols-2">
            {["Session-only behaviour: clicks and reading time on this site", "One first-party cookie; no third-party cookies", "No names, emails or IP-based identity", "No fingerprinting", "No inference of protected traits", "Visitors can see, change and reset every choice"].map((x) => (
              <li key={x} className="flex gap-3 leading-relaxed"><Check />{x}</li>
            ))}
          </ul>
          <Link href="/privacy" className="text-link mt-8 inline-block text-sm">Read our full data practices</Link>
        </Section>

        <Section id="pricing" title="Pricing" audience="growth_lead" className="stitch-top py-20">
          <h2 className="section-title">Pricing</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <Emphasis audience="developer" className="card flex flex-col" onClassName="emph">
              <FitTag />
              <h3 className="text-lg font-semibold text-chalk">Beta</h3>
              <p className="mt-2 font-display text-5xl text-chalk">Free</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">Everything, during the beta.</p>
            </Emphasis>
            <Emphasis audience="growth_lead" className="card flex flex-col" onClassName="emph">
              <FitTag />
              <h3 className="text-lg font-semibold text-chalk">Growth</h3>
              <p className="mt-2 font-display text-5xl text-chalk">Planned</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">Usage-based, per 10,000 decisions, with lift reports.</p>
            </Emphasis>
            <Emphasis audience="privacy_reviewer" className="card flex flex-col" onClassName="emph">
              <FitTag />
              <h3 className="text-lg font-semibold text-chalk">Enterprise</h3>
              <p className="mt-2 font-display text-5xl text-chalk">Planned</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">Data processing agreement, SSO, regional data handling.</p>
            </Emphasis>
          </div>
          <Emphasis audience="investor" className="mt-5 flex flex-col rounded-2xl border border-dashed border-stitch p-5 text-sm leading-relaxed text-muted" onClassName="emph">
            <FitTag />
            <p>Unit economics: at about $0.00003 of model cost per decision (estimated), a site making a million decisions a month spends about $30 on inference.</p>
          </Emphasis>
        </Section>

        <Section id="vision" title="Why now" audience="investor" className="stitch-top py-20">
          <h2 className="section-title">Why now</h2>
          <p className="mt-6 max-w-[62ch] leading-relaxed text-muted">Per-click decisions were possible with LLMs but too slow and expensive. System One models make adapting every page to every visitor practical. TypeSafe’s published benchmark, per workflow:</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-stitch p-6">
              <p className="text-sm text-muted">LLM workflow</p>
              <p className="mt-2 font-display text-5xl text-chalk">8.566 s</p>
              <p className="mt-1 font-mono text-sm text-muted">$0.013880</p>
            </div>
            <div className="rounded-2xl bg-tape p-6 text-denim">
              <p className="text-sm font-medium">Jev</p>
              <p className="mt-2 font-display text-5xl">0.114 s</p>
              <p className="mt-1 font-mono text-sm">$0.000081</p>
            </div>
          </div>
          <Link href="/vision" className="text-link mt-8 inline-block text-sm">Read the vision</Link>
        </Section>

        <Section id="faq" title="FAQ" className="stitch-top py-20">
          <h2 className="section-title">Questions</h2>
          <div className="mt-8 border-t border-dashed border-stitch">
            <SlotGroup name="faq">
              <Section id="faq-hide" title="FAQ: Does Tailor hide content?"><details className="faq border-b border-dashed border-stitch py-5"><summary className="cursor-pointer text-lg text-chalk">Does Tailor hide content?</summary><p className="mt-3 max-w-[64ch] leading-relaxed text-muted">No. It reorders sections, swaps headlines and buttons, and highlights. Every page and section stays reachable, and the switcher lets anyone pick a view.</p></details></Section>
              <Section id="faq-fast" title="FAQ: How fast is a decision?" audience="developer"><details className="faq border-b border-dashed border-stitch py-5"><summary className="cursor-pointer text-lg text-chalk">How fast is a decision?</summary><p className="mt-3 max-w-[64ch] leading-relaxed text-muted">Under a second from our server to Jev and back, shown live in the Lens. Changes are applied off-screen, so nothing jumps.</p></details></Section>
              <Section id="faq-data" title="FAQ: What data do you store?" audience="privacy_reviewer"><details className="faq border-b border-dashed border-stitch py-5"><summary className="cursor-pointer text-lg text-chalk">What data do you store?</summary><p className="mt-3 max-w-[64ch] leading-relaxed text-muted">This session’s clicks and reading time, in your browser’s session storage, plus one first-party cookie holding the current view. Our server keeps nothing between requests.</p></details></Section>
              <Section id="faq-works" title="FAQ: How do I know it works?" audience="growth_lead"><details className="faq border-b border-dashed border-stitch py-5"><summary className="cursor-pointer text-lg text-chalk">How do I know it works?</summary><p className="mt-3 max-w-[64ch] leading-relaxed text-muted">Today: simulated visitors and the Lens. Next: a built-in holdout group that measures lift for each audience.</p></details></Section>
              <Section id="faq-now" title="FAQ: Why is this possible now?" audience="investor"><details className="faq border-b border-dashed border-stitch py-5"><summary className="cursor-pointer text-lg text-chalk">Why is this possible now?</summary><p className="mt-3 max-w-[64ch] leading-relaxed text-muted">System One models like Jev return calibrated decisions in milliseconds for fractions of a cent, so deciding on every click finally pays for itself.</p></details></Section>
            </SlotGroup>
          </div>
        </Section>
      </SlotGroup>
      <NextStep />
    </>
  );
}
