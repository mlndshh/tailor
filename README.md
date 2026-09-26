# Tailor

**Websites that adapt to every visitor, powered by [Jev](https://docs.typesafe.ai).**

Tailor shows every website visitor the version of your site that fits them, and updates its read on every click.

- **Live:** https://tailor-five-indol.vercel.app
- **Demo launcher (entry links + QR codes):** https://tailor-five-indol.vercel.app/demo

Built at JEVATHON, San Francisco, September 2026.

## The problem

Dev-tool websites serve developers, buyers, privacy reviewers and investors with one page. Developers get "Book a
demo", buyers get code samples, privacy reviewers hunt for the data policy, and most of them leave. Existing
personalization tools segment once per visit, from company data and fixed rules.

## What Tailor does

Tailor is a React SDK plus a stateless decision API. Your team writes a version of each section per audience. Tailor
watches on-site behaviour (clicks, reading time, code copies), Jev decides who the visitor is, and the page re-renders
headlines and buttons, reorders sections, and highlights the right pricing plan.

- **Never hides anything.** Every page and section stays reachable, and a "View as" switcher lets anyone pick a view.
- **Never changes what you're reading.** Swaps happen off-screen or on the next page.
- **Only acts when Jev is confident.** Otherwise you see the normal page.
- **Handles more than one audience.** A technical investor gets both the vision and the code.

## How we use Jev

- **Atomic yes/no (noul) questions**, one per audience. For example: "is this visitor a developer who would write the
  code that adds Tailor to a website?"
- **Each evidence source is judged separately:**
  - where the visitor came from (referrer/UTM), asked once per session and cached across visitors;
  - what they did on the site, asked after each meaningful action.

  Each request's state holds only its own evidence.
- **Code owns policy.** It blends the two reads, weighting behaviour more as it accumulates, and applies a confidence
  cut-off with hysteresis so the page doesn't flip-flop. Explicit choices from the switcher always win.
- **A separate `talk_interest` question** flags visitors who want a conversation. It scores 0.9+ on "Book a walkthrough"
  and "Talk to the founders".
- **Live numbers:**
  - about 0.5 s server-side per decision;
  - about 1.2k input tokens across two parallel Jev calls;
  - roughly $0.00005 per decision.

  Per-click personalization with an LLM would cost seconds and cents.

## Dogfooded

Tailor's own marketing site runs on Tailor. The **Lens** overlay (toggle bottom-right, or add `?tailor_lens` to the
URL) shows each evidence source, the combined read, latency and cost live. `/demo` has entry links that simulate a
Hacker News post, a LinkedIn ad, a GDPR search and a VC newsletter, so you can watch the site adapt to your own clicks.

## Using the SDK

`@tailor/react` lives in this repo as a workspace package (not yet published to npm).

```tsx
// app/layout.tsx: read the last decision so the first render doesn't flicker
const initial = parseDecisionCookie((await cookies()).get("tailor_decision")?.value);

<TailorProvider siteKey="site_tailor" endpoint="/api/tailor/v1/decide" initial={initial} pathname={pathname}>
  <Slot name="hero">                                  {/* re-render: one version at a time */}
    <Variant default>…</Variant>
    <Variant audience="developer">…</Variant>
    <Variant audience="investor">…</Variant>
  </Slot>

  <SlotGroup name="home">                             {/* reorder: every section always renders */}
    <Section id="quickstart" title="Quickstart" audience="developer">…</Section>
    <Section id="pricing" title="Pricing" audience="growth_lead">…</Section>
  </SlotGroup>

  <Emphasis audience="growth_lead" onClassName="ring-2">…</Emphasis>   {/* highlight */}
  <Signal label="copied the install command"><CopyButton /></Signal>  {/* label a key action */}
  <AudienceSwitcher />
  <TailorLens />
</TailorProvider>
```

Audiences: `developer`, `growth_lead`, `privacy_reviewer`, `investor`.

## Architecture

| Path | What |
| --- | --- |
| `packages/core` | Pure TypeScript: normalization, Jev question building, combining, section policy, request validation, and `decide()` with Jev injected (43 tests) |
| `packages/react` | `TailorProvider`, `Slot`/`Variant`, `SlotGroup`/`Section`, `Emphasis`, `Signal`, `AudienceSwitcher`, `TailorLens` |
| `apps/site` | Next.js 16 marketing site on Vercel, plus `POST /api/tailor/v1/decide` |

About the decide route:
- It calls Jev only on the server; the key never reaches the browser.
- It's stateless: the browser holds the session and sends it with each request.
- A Jev failure keeps the current page.

## Privacy

- Session-only behaviour, with one first-party cookie.
- No personal data and no fingerprinting.
- No inference of protected traits.
- Visitors can see and reset every choice.

## Run it locally

Requires Node 22+ and pnpm 9.

```sh
pnpm install
pnpm test          # core unit tests
pnpm jev:check     # live Jev reads for sample arrivals and action lists
pnpm dev           # http://localhost:3000  (try /demo, and ?tailor_lens for the Lens)
pnpm build
```

### Environment

Put these in a root `.env` (gitignored):

| Variable | |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Primary: calls Jev through Vercel AI Gateway (the path the thresholds were tuned against) |
| `TYPESAFE_OWN_API_KEY` | Fallback: calls the TypeSafe API directly (pinned `jev-1.13.0`), used if the Gateway key is missing or rejected |
| `TAILOR_ALERT_WEBHOOK_URL` | Optional: receives `{ text }` when a visitor wants to talk (it's always logged on the server) |

## What's next

- Built-in holdout groups to measure lift per audience.
- A script tag for Webflow, Framer and WordPress.
- Page versions drafted by an LLM and approved by the team.
- Onboarding flows and chat agents that adapt the same way.

## Docs

- Design spec: [docs/superpowers/specs/2026-09-26-tailor-design.md](docs/superpowers/specs/2026-09-26-tailor-design.md)
- Implementation plan: [docs/superpowers/plans/2026-09-26-tailor-mvp.md](docs/superpowers/plans/2026-09-26-tailor-mvp.md)
- Hackathon info, rubric and rules: [docs/hackathon/](docs/hackathon/)

## License

[MIT](LICENSE)
