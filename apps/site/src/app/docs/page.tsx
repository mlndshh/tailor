"use client";
import { Section, Signal } from "@tailor/react";
import { useState } from "react";
import { CodeBlock } from "@/components/code-block";
import { NextStep } from "@/components/next-step";

const PROVIDER_REACT = `import { TailorProvider } from "@tailor/react";

<TailorProvider siteKey="site_…" endpoint="/api/tailor/v1/decide" initial={null}>
  <App />
</TailorProvider>`;
const PROVIDER_NEXT = `// app/layout.tsx: read the last decision so the first render doesn't flicker
const initial = parseDecisionCookie((await cookies()).get("tailor_decision")?.value);
<TailorRoot initial={initial}>{children}</TailorRoot>   // a client wrapper around <TailorProvider>`;

export default function Docs() {
  const [tab, setTab] = useState<"react" | "next">("next");
  return (
    <div className="pt-16">
      <p className="eyebrow">Docs</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Tailor for React</h1>
      <Section id="install" title="Install" audience="developer" className="py-8">
        <h2 className="text-xl text-white">Install</h2>
        <p className="mt-2 text-slate-400">The SDK isn’t on npm yet: <code>@tailor/react</code> and <code>@tailor/core</code> ship as workspace packages in the repo.</p>
        <div className="mt-3"><CodeBlock code={"git clone https://github.com/mlndshh/tailor && cd tailor\npnpm install && pnpm dev"} signal="copied the install command" /></div>
      </Section>
      <Section id="provider" title="Provider" audience="developer" className="py-8">
        <h2 className="text-xl text-white">Add the provider</h2>
        <div className="mt-3 flex gap-2 text-sm" role="tablist">
          <Signal label="switched the code sample to React"><button role="tab" aria-selected={tab === "react"} className={tab === "react" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("react")}>React</button></Signal>
          <Signal label="switched the code sample to Next.js"><button role="tab" aria-selected={tab === "next"} className={tab === "next" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("next")}>Next.js</button></Signal>
        </div>
        <div className="mt-3"><CodeBlock code={tab === "react" ? PROVIDER_REACT : PROVIDER_NEXT} signal="copied the Provider example" /></div>
      </Section>
      <Section id="slot" title="Slot and Variant" audience="developer" className="py-8">
        <h2 className="text-xl text-white">Slot and Variant: re-render</h2>
        <p className="mt-2 text-slate-400">One version at a time. <code>rank=1</code> follows the second active audience. Swaps wait until the slot is off screen or the visitor navigates.</p>
        <div className="mt-3"><CodeBlock signal="copied the Slot example" code={`<Slot name="hero">\n  <Variant default>…</Variant>\n  <Variant audience="developer">…</Variant>\n  <Variant audience="investor">…</Variant>\n</Slot>`} /></div>
      </Section>
      <Section id="slotgroup" title="SlotGroup and Section" audience="developer" className="py-8">
        <h2 className="text-xl text-white">SlotGroup and Section: reorder</h2>
        <p className="mt-2 text-slate-400">Every section always renders. Sections for active audiences move first; sections the visitor already reached stay put.</p>
        <div className="mt-3"><CodeBlock signal="copied the SlotGroup example" code={`<SlotGroup name="home">\n  <Section id="quickstart" title="Quickstart" audience="developer">…</Section>\n  <Section id="pricing" title="Pricing" audience="growth_lead">…</Section>\n</SlotGroup>`} /></div>
      </Section>
      <Section id="emphasis" title="Emphasis and Signal" audience="developer" className="py-8">
        <h2 className="text-xl text-white">Emphasis and Signal</h2>
        <div className="mt-3"><CodeBlock signal="copied the Emphasis example" code={`<Emphasis audience="growth_lead" onClassName="ring-2">…</Emphasis>\n<Signal label="copied the install command"><CopyButton /></Signal>\nconst { decision, pin, track, reset } = useTailor();`} /></div>
      </Section>
      <Section id="api" title="API reference" audience="developer" className="py-8">
        <details className="card"><summary className="cursor-pointer text-white">API reference: POST /api/tailor/v1/decide</summary>
          <pre className="mt-3 overflow-x-auto font-mono text-xs text-slate-300">{`{ siteKey, sessionId, arrival: { referrer, utm_source, utm_campaign, utm_term, landingPath },
  events: RawEvent[], previous: Decision | null }
→ { decision: { primary, active, p, talkInterest, version },
    debug: { arrivalScores, actionScores, weight, latencyMs, tokens, costUsd, error } }`}</pre>
        </details>
      </Section>
      <Section id="latency" title="Latency and cost" audience="developer" className="py-8">
        <h2 className="text-xl text-white">Latency and cost</h2>
        <p className="mt-2 text-slate-400">Two small Jev requests: arrival once per session (cached across visitors with the same arrival) and actions after each meaningful click, debounced to one per 600 ms. Each has four or five yes/no questions; about 600 input tokens, roughly $0.00003 (estimated). A failed read keeps the current page.</p>
      </Section>
      <NextStep />
    </div>
  );
}
