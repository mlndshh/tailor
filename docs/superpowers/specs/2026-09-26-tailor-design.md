# Tailor: design spec

Date: 2026-09-26 (JEVATHON). Working name **Tailor** (clashes with Tailor Brands; rename before any public launch).
Rules and rubric: [docs/hackathon/](../../hackathon/). Jev notes: `~/Personal/game-dev-tycoon/docs/jev-reference.md` and
https://docs.typesafe.ai.

## 1. Pitch

**One-liner:** Tailor shows every website visitor the version of your site that fits them, and updates its read on
every click.

**30 seconds:** Every dev-tool website serves developers, buyers, privacy reviewers and investors with one page, so
everyone gets a compromise and most leave. Tailor reads each visitor on every click and puts what they came for first.
Your team writes the content; Jev decides what to lead with, in about 300 ms for a fraction of a cent, and only when
it's confident. Tailor never hides anything: it reorders and emphasizes. It's a React SDK you add in five minutes, and
the site you're looking at runs on it.

**Problem.** Growth and marketing teams at dev-tool companies serve several audiences with one page. Developers get
"Book a demo", buyers get code samples, and privacy reviewers hunt for the data policy. The evidence is everywhere:
homepages put "Start free" next to "Contact sales", keep separate /enterprise pages, and personalization vendors
(Mutiny, Webflow Optimize) exist because companies pay for this. Those tools segment once per visit using company data
and fixed rules. Tailor decides again after every click, from behaviour.

**Why Jev.** Deciding on every click is only affordable with a System One model. TypeSafe's own benchmark puts Jev at
about 193x faster and 444x cheaper than LLM workflows. Calibrated probabilities tell Tailor when *not* to personalize.

**Vision.**
- **Now:** a React SDK that makes a decision on every click.
- **Next:** measure lift with a built-in control group via `convert()`; a script tag for Webflow, Framer and
  WordPress; page versions drafted by an LLM and approved by the team; webhooks to CRMs and Slack.
- **Later:** app onboarding and chat or voice agents that adapt their tone and depth; optimization that learns which
  version converts each audience.
- **End state:** a System One layer for user experience.

## 2. Goals and non-goals (today)

**Goals**
- A working React SDK, API and decision engine that any React or Next.js site could adopt.
- Our own marketing site runs on it (dogfooding) and is deployed, so judges can scan a QR code and use it.
- A demo that shows each audience, a visitor who is two audiences at once, a mid-session switch, and a manual
  override. Every change is visible and explained.

**Non-goals today:**
- A script tag for non-React sites
- A dashboard
- Measuring lift or A/B testing
- Multi-tenant site config
- A persistent database
- LLM-written content in the live path

## 3. Principles

1. **The site owns the content; Tailor chooses.** Every version is written ahead of time. Nothing is generated live.
2. **Never hide; reorder and emphasize.** Every section and page stays reachable. Navigation never changes.
3. **Atomic Jev questions.** Each question makes one judgment and sees only the evidence it needs. Where the visitor
   came from and what they did are judged separately.
4. **Code owns facts and policy.** Counting, thresholds, weights, hysteresis and explicit user choices live in code.
   Jev only judges intent from ambiguous behaviour.
5. **Only act when confident.** Below the cut-off, the default page stays.
6. **Never change what the visitor is looking at.** Swap sections only when they're off screen or on the next page.
7. **Never break the host site.** Any failure leaves the current page (or the default) as it is.

## 4. Audiences

A visitor can belong to several audiences at once; each is judged independently.

| id | Jev question (asked about `arrival` and about `actions`) | Wants | Draws them |
| --- | --- | --- | --- |
| `developer` | "is this visitor a developer who would write the code that adds Tailor to a website?" | `npm install`, the `<Slot>` API, latency | Docs |
| `growth_lead` | "is this visitor a growth lead who would buy Tailor to raise conversion?" | Outcomes, use cases, pricing | Use cases |
| `privacy_reviewer` | "is this visitor reviewing Tailor against data-privacy requirements?" | What we collect, cookies, retention | Privacy & data |
| `investor` | "is this visitor judging Tailor as an investment?" | Why now, market, roadmap, team | Vision |

## 5. Architecture

A pnpm workspace:

```
packages/core     @tailor/core    Pure TypeScript, no I/O. Types, arrival and event normalization, Jev question
                                  builders, combining the answers, active-audience set, hysteresis, page policy
                                  (section order, calls to action). Unit-tested.
packages/react    @tailor/react   TailorProvider, Slot/Variant, SlotGroup/Section, Signal, useTailor,
                                  AudienceSwitcher, TailorLens, automatic tracking. Imports only core types and
                                  policy helpers.
apps/site                         Next.js App Router. (a) Our marketing site (Home, Docs, Use cases, Privacy & data,
                                  Vision, /demo). (b) API route POST /api/tailor/v1/decide. (c) Server-side Jev
                                  client and webhooks.
tools/eval   (stretch)            Browserbase + Stagehand simulated visitors.
tools/variants (stretch)          GMI Cloud drafts page versions for review.
```

The Next.js config uses `transpilePackages` so the packages ship TypeScript source; there's no build step.

### 5.1 Stateless decide API

The browser keeps the session: a session ID, the arrival record, a list of raw events capped at 50, and the previous
decision. It sends all of it with each request, so the server is **stateless**. That means no database and it scales
on Vercel without sticky sessions. Tampering only changes the tamperer's own page.

```
POST /api/tailor/v1/decide
{ siteKey, sessionId, arrival: { referrer?, utm_source?, utm_campaign?, utm_term?, landingPath },
  events: RawEvent[], previous?: Decision, pinned?: AudienceId | null }
→ { decision: Decision, debug: { arrival?: Answers, actions?: Answers, blended, latencyMs, tokens, costUsd, cached } }
```

- `Decision` = `{ primary: AudienceId | null, active: AudienceId[] (sorted by p), p: Record<AudienceId, number>,
  sectionOrder: string[], version: number }`.
- The latest decision is also written to a first-party cookie `tailor_decision`. The server layout reads it, so the
  first render after a navigation is already personalized and doesn't flicker.
- `siteKey` is public and checked against an allowed-origin list. The Jev key (`AI_GATEWAY_API_KEY`) stays on the
  server.

### 5.2 Decision pipeline (in `core`, called by the route)

1. **Normalize arrival.** Code reduces the referrer to a domain and trims UTM values to 80 characters, e.g.
   `{ source: "news.ycombinator.com", campaign: null, search_terms: null, landing_page: "/" }`. **If there's no
   referrer and no UTM, the arrival request is skipped** (that's a fact code knows).
2. **Normalize actions.** Code turns raw events into short phrases:
   - `"opened Docs"`, `"copied the install command"`, `"read 'Data retention' for a long time"`;
   - dwell time becomes words: at least 8 s is "for a while", at least 20 s is "for a long time";
   - repeats become "more than once";
   - scroll noise is dropped, duplicates are removed, and only the last 12 meaningful actions are kept.

   Jev never sees raw numbers.
3. **Jev: request A (arrival).** State `{ arrival }`, four yes/no questions, one per audience. It runs once per
   session and is **cached in memory, keyed by the normalized arrival** (Jev gives the same answer to the same input).
4. **Jev: request B (actions).** State `{ actions }`, four yes/no audience questions plus `talk_interest`. It runs when
   there's at least one meaningful action. A and B run in parallel on the first call.
5. **Combine** (in code):
   - `w` = the action weight, by count of meaningful actions: 0, 1, 2, ≥3 → `[0, 0.5, 0.7, 0.85]`;
   - when arrival was skipped, `w = 1`;
   - `p[a] = (1 − w)·arrival[a] + w·actions[a]`.
6. **Active set.**
   - Audiences with `p ≥ 0.6` are active, sorted by `p`.
   - **Hysteresis:** the current primary stays while `p ≥ 0.5`; a challenger replaces it only when its `p` exceeds
     the primary's by at least 0.1.
   - A **pinned** audience from the switcher overrides everything: it becomes the primary, and active is
     `[pinned, …others]`.
7. **Page policy.** From the active set:
   - `primary` sets the headline and main button;
   - `active[1]` sets the second button;
   - `sectionOrder` = the active audiences' sections in order of `p`, then `how-it-works`, then the rest in default
     order.
8. **Talk alert.** If `talk_interest ≥ 0.8`, send the webhook once per session (in-memory dedupe) → Photon texts the
   presenter.

All cut-offs are **starting values**, tuned on the simulated visitors and the demo runs.

### 5.3 Jev questions

The client is `@typesafe-ai/sdk` with `baseURL https://ai-gateway.vercel.sh/typesafe`, model `typesafe-ai/jev`. The
timeout is 1.5 s with 1 retry. On failure, the previous decision is returned with `debug.error`.

```ts
const audienceQuestions = (src: "arrival" | "actions") => ({
  developer: noul(`Based on \`${src}\`, is this visitor a developer who would write the code that adds Tailor to a website?`, {
    true: "The visitor is a developer who would write the integration code.",
    false: "The visitor is not a developer who would write the integration code." }),
  growth_lead: noul(`Based on \`${src}\`, is this visitor a growth lead who would buy Tailor to raise conversion?`, {
    true: "The visitor is a growth lead evaluating Tailor as a purchase.",
    false: "The visitor is not a growth lead evaluating Tailor as a purchase." }),
  privacy_reviewer: noul(`Based on \`${src}\`, is this visitor reviewing Tailor against data-privacy requirements?`, {
    true: "The visitor is checking how Tailor handles visitor data.",
    false: "The visitor is not checking how Tailor handles visitor data." }),
  investor: noul(`Based on \`${src}\`, is this visitor judging Tailor as an investment?`, {
    true: "The visitor is assessing Tailor as a company to invest in.",
    false: "The visitor is not assessing Tailor as a company to invest in." }),
});
// Request B only:
talk_interest: noul("Based on `actions`, does this visitor want a conversation with the Tailor team?", {
  true: "The visitor is seeking a conversation with the Tailor team.",
  false: "The visitor shows no interest in a conversation with the Tailor team." })
```

Every question and criterion states one condition: no "and", no "or". The cost is about 600 tokens per decision, or
about $0.00003.

### 5.4 React SDK

```tsx
// app/layout.tsx
<TailorProvider siteKey="site_tailor" endpoint="/api/tailor/v1/decide" initial={readDecisionCookie()}>

<Slot name="hero">                               {/* re-render: one version at a time */}
  <Variant default>…</Variant>
  <Variant audience="developer">…</Variant>
</Slot>

<SlotGroup name="home">                          {/* reorder: every section always rendered */}
  <Section id="quickstart" audience="developer">…</Section>
  <Section id="outcomes"   audience="growth_lead">…</Section>
</SlotGroup>

<Emphasis audience="growth_lead">…</Emphasis>    {/* highlight: e.g. a pricing card or nav item */}
<Signal label="copied the install command"><CopyButton/></Signal>
<AudienceSwitcher />   <TailorLens />
const { decision, pin, track, reset } = useTailor();
```

- **Automatic tracking:**
  - page views;
  - clicks on links and buttons, described by their text and the nearest section heading;
  - dwell time per `<Section>` (via `IntersectionObserver`);
  - `<Signal>` labels.

  A decision is requested at most every 600 ms, one at a time, and the latest request wins.
- **Swap rule:** `Slot` and `SlotGroup` apply a new decision only while they're outside the viewport. Otherwise they
  wait until the section leaves the screen or the next navigation.
- **Session:**
  - a `tailor_sid` in `sessionStorage` (arrival, events, previous decision);
  - `?tailor_new=1` starts a fresh session (used by demo links);
  - `reset()` clears it.
- **AudienceSwitcher:** a chip reading "Showing: Developer view (auto) ▾" with the options Auto, Developer, Growth,
  Privacy and Investor. Picking one pins it; Auto unpins.
- **TailorLens** (a toggle, also opened with `?tailor_lens`):
  - bars for arrival, actions and the combined result for each audience;
  - the active set and the talk interest;
  - latency, tokens, cost and cache hits per decision;
  - a timeline of decisions;
  - a **"what changed" log**, e.g. "Moved Privacy summary from #4 to #2 · Headline → Privacy";
  - a short outline flash on any section that changed while the Lens is open, so judges notice subtle reorders.

## 6. The site (dogfood)

Built in Next.js, Tailwind and TypeScript. All content is true: the Docs describe the real SDK, the Privacy page
describes what this implementation actually does, and pricing is labelled "free during beta; planned pricing".

| Page | Content | Tailor elements |
| --- | --- | --- |
| **Home** | Headline; a strip of the four audiences; sections: how-it-works, quickstart, outcomes, privacy summary, pricing, vision, FAQ | Slot `hero` (5 versions), second button, SlotGroup `home`, Emphasis on the pricing cards, FAQ order |
| **Docs** | Install, Provider, Slot/Variant, SlotGroup, Signal, API reference, latency and cost | Copy buttons (`Signal`), a code tab (React / Next.js), a "next step" Slot |
| **Use cases** | Dev-tool homepage, pricing page, docs site, SaaS onboarding (roadmap), each showing "what each visitor sees" | Case cards, "Book a walkthrough", a "next step" Slot |
| **Privacy & data** | What we collect or don't, the session-only cookie, retention, subprocessors (Vercel, TypeSafe), no protected traits, how to reset | Expandable sections, "Request our data summary", a "next step" Slot |
| **Vision** | Why now (System One cost curve), market, roadmap, team | "Talk to the founders", "Read the roadmap", a "next step" Slot |
| **/demo** | The demo launcher (section 7) | none |

Across the site:
- the navigation shows a small "Start here" dot on the page for the current primary audience (Emphasis);
- every page ends with a "next step" Slot;
- the AudienceSwitcher chip sits in the header.

## 7. Demo design

### 7.1 Entry links

Each link adds `tailor_new=1`. The `/demo` launcher shows each one with a QR code and the expected first read.

| # | Link | Simulates | Expected first read |
| --- | --- | --- | --- |
| L0 | `/` | Typed the URL, no referrer | Default page; the Lens shows "no arrival evidence, skipped" |
| L1 | `/?utm_source=hackernews` | Hacker News post | Developer |
| L2 | `/?utm_source=github&utm_campaign=readme` | GitHub README link | Developer |
| L3 | `/?utm_source=linkedin&utm_campaign=website-conversion` | LinkedIn ad | Growth lead |
| L4 | `/?utm_source=google&utm_term=website+personalization+gdpr+cookies` | Google search | Privacy reviewer |
| L5 | `/?utm_source=vc-newsletter&utm_campaign=seed-deals` | VC newsletter | Investor |
| L6 | `/docs?utm_source=vc-newsletter` | Investor who lands on the Docs | Investor, with developer likely once they click |

### 7.2 Interaction catalogue (real signals, by audience)

- **Developer:** open Docs · copy `npm install @tailor/react` · switch the code tab to Next.js · open "API reference" ·
  click the GitHub link · read latency and cost.
- **Growth lead:** open Use cases · open the "Pricing page" case · click "Book a walkthrough" · read the pricing
  section.
- **Privacy reviewer:** open Privacy & data · expand "What we collect", "Cookies" and "Data retention" · click
  "Request our data summary".
- **Investor:** open Vision · read "Why now" and "Market" · click "Read the roadmap" · click "Talk to the founders".

### 7.3 What visibly changes (nothing is hidden)

| Change | Type |
| --- | --- |
| Headline, subline and main button | Re-render (Slot) |
| Second button (the second active audience) | Re-render |
| Home section order | Reorder (SlotGroup) |
| Highlighted pricing card (developer → free tier; growth lead → the planned Growth plan; investor → a note on unit economics) | Emphasis |
| "Start here" dot in the navigation | Emphasis |
| FAQ order | Reorder |
| "Next step" card on every page | Re-render |
| Switcher chip ("Showing: Privacy view (auto)") | Transparency |

### 7.4 Scripted scenarios, about 5 minutes

Use two browser windows side by side (normal and private), with the Lens open.

1. **Cold start (L0).** Default page; the Lens explains that arrival was skipped. Opening Docs → developer passes the
   cut-off; Home now leads with Quickstart, and the main button is "Get a site key".
2. **Developer (L1).** The first render already leans developer. Copying the install command raises it to about 0.9.
   Pricing highlights the free tier.
3. **Growth lead (L3) plus the alert.** Use cases → the "Pricing page" case → "Book a walkthrough". The headline
   becomes "Show every visitor the page that converts them", and `talk_interest` passes 0.8 → **Photon texts the
   presenter's phone**.
4. **Privacy reviewer (L4).** Expanding "Data retention" and "Cookies" moves the privacy summary to #2 and changes the
   headline to "No personal data. First-party only."
5. **Two audiences at once (L6).** The visitor arrives as an investor, then copies code in Docs. The headline stays
   investor, the second button becomes "Read the docs", and the section order is vision, quickstart, then the rest.
6. **The switch.** Continue scenario 2 by reading Privacy for a long time. The Lens shows privacy overtaking developer
   once the margin clears 0.1 (hysteresis).
7. **Manual override.** Pick "Investor" in the switcher → the page pins to it; "Auto" hands control back.
8. **Judges' turn.** A QR code for L0 is on screen; each judge's phone adapts to what they tap.
9. **Close.** The Lens totals (decisions, average latency, total cost), then the integration code: "any React site in
   five minutes".

**Backup:** if Jev or the wifi fails, the switcher still shows every version, and the Lens says why.

## 8. Sponsors

| Sponsor | Role | Priority |
| --- | --- | --- |
| Jev (TypeSafe) | The decision engine (required) | P0 |
| CodeRabbit | Build parts with the CodeRabbit Agent (Slack), review pull requests, public post, feedback in their Discord | P1 (process) |
| Photon | The talk-alert webhook → an iMessage to the presenter | P1 |
| Browserbase | `tools/eval`: Stagehand visitors for each audience; report accuracy and clicks to confidence; tune cut-offs | P2 |
| GMI Cloud | `tools/variants`: draft page versions for review (never in the live path) | P2 |

## 9. Reliability, cost, privacy

- **Failures:** 1.5 s timeout with 1 retry, then the previous decision; the SDK never throws into the page; the
  default content always renders.
- **Cost and rate limits:**
  - about $0.00003 per decision;
  - arrival reads are cached across visitors;
  - decisions are debounced to at most one per 600 ms per session;
  - the Jev limit of 1,200 requests a minute is per account, so production needs per-site quotas.
- **Privacy:**
  - session-only behaviour and no personal data;
  - no fingerprinting and no protected traits;
  - a first-party cookie only;
  - the switcher and Lens explain the choices, and `reset()` forgets the session.
- **Security:**
  - the Jev key stays on the server;
  - the site key is checked against allowed origins;
  - input is capped: 50 events, 80-character UTM values, domain-only referrers;
  - arrival and actions text is visitor-controllable, but the worst case is the wrong version of their own page.

## 10. Testing

- **Unit tests (Vitest) in `core`:**
  - normalization (dwell words, "more than once", dedupe, the cap);
  - combining (weights, skipped arrival);
  - the active set, hysteresis and pinning;
  - section order and calls to action.
- **A live Jev check:** a script sends one arrival and one actions state for each audience and prints the answers.
  Run it before tuning the cut-offs.
- **A manual run** of every scenario in section 7.4 on the deployed URL.
- **Stretch:** Browserbase simulated visitors.

## 11. Priorities

- **P0 (demo-critical):**
  - core and its tests;
  - the decide route with Jev;
  - the React SDK (Provider, Slot, SlotGroup, Emphasis, Signal, tracking, switcher, Lens);
  - the five pages with real copy;
  - entry links and `/demo`;
  - deploying to Vercel.
- **P1:**
  - the Photon alert;
  - the Lens "what changed" log and flash;
  - the arrival cache;
  - a CodeRabbit-built piece and pull request reviews;
  - the README and the HackerSquad submission.
- **P2:** Browserbase evaluation, GMI drafting.

## 12. Known gaps (what production needs)

- Lift measurement with a control group (`convert()`), then optimization of which version is shown.
- Server-side session storage for analytics and reliable deduplication of the talk alert.
- Multi-tenant site config and a dashboard.
- Per-site quotas and batching against the Jev rate limit.
- A consent banner where required.
- A script tag for non-React sites.
