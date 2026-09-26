# Tailor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Tailor: a React SDK plus a stateless decision API that uses Jev to reorder, re-render and highlight
website content for each visitor's audience. The first site using it is Tailor's own marketing site, deployed on
Vercel with a `/demo` launcher.

**Architecture:** A pnpm workspace with three parts:
- `packages/core`: pure TypeScript for normalization, Jev question building, combining answers, policy, request
  validation, and a `decide()` orchestrator with Jev injected.
- `packages/react`: a client class plus React components.
- `apps/site`: Next.js 16 with the marketing pages, the `POST /api/tailor/v1/decide` route, and the server-side Jev
  client.

The browser holds the session; the server is stateless.

**Tech Stack:** Node 24, pnpm 9, TypeScript, Next.js 16 (App Router), React 19, Tailwind CSS 4, Vitest,
`@typesafe-ai/sdk` 0.6 through Vercel AI Gateway, and `qrcode`.

**Spec:** `docs/superpowers/specs/2026-09-26-tailor-design.md`

## Global Constraints

- **Jev access:**
  - Jev is reached only from the server: `new TypeSafeClient({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: "https://ai-gateway.vercel.sh/typesafe", defaultModel: "typesafe-ai/jev" })`.
  - Timeout 1.5 s, `retry: { maxRetries: 1 }`.
  - The key never reaches the browser.
- **Question rules:**
  - Every Jev question and criterion states one condition: no "and", no "or".
  - Arrival and actions go in **separate requests**, and each state contains only its own evidence.
- **Content rules:**
  - Never hide content: only reorder (`SlotGroup`), re-render (`Slot`) or highlight (`Emphasis`).
  - Never swap a `Slot`, or move a `SlotGroup` section, that is in the viewport. Apply on scroll-out, on navigation, or
    to sections below the viewport.
- **Thresholds and limits:**
  - active `p ≥ 0.6`; keep primary while `p ≥ 0.5`; switch margin `0.1`;
  - action weights `[0, 0.5, 0.7, 0.85]` for 0, 1, 2, ≥3 meaningful actions, and `w = 1` when there's no arrival
    evidence;
  - talk alert at `talk_interest ≥ 0.8`;
  - dwell words at 8 s ("for a while") and 20 s ("for a long time");
  - at most 50 events and 12 actions;
  - text clipped to 80 characters;
  - debounce 600 ms.
- **Cost:** $0.042 per 1M input tokens (`JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000`).
- **Copy must be true:**
  - no invented customers, lift numbers or market sizes;
  - pricing is labelled "free during beta" or "planned";
  - estimates are labelled "estimated".
- **Git:** work on branch `feat/tailor-mvp`, commit after each task, and open a pull request to `main` at the end (for
  the CodeRabbit review).

## Review Focus

1. **Jev unreachable, timing out, or no key.** The site still renders. `decide()` returns the previous decision (or an
   empty one) with `debug.error`, and the route never returns 500 for a Jev failure. Pinned by the `decide.test.ts`
   test "keeps the previous decision when Jev fails" (Task 4).
2. **A malformed or oversized request body** (non-object, wrong types, 500 events, 10 kB strings). The route returns
   400 for bad shapes, and caps and clips everything else. Pinned by `validate.test.ts` (Task 4).
3. **A referrer from our own domain, or not a URL.** Internal navigation or a reload must not count as arrival
   evidence. Pinned by `normalize.test.ts`, "ignores self referrer and garbage" (Task 2).
4. **Pinning an audience, then going back to Auto.** The pin wins immediately, survives new server decisions, and
   Auto restores the server's decision. Pinned by `policy.test.ts` `applyPin` (Task 3).
5. **Mixed evidence arriving click by click.** The primary audience must not flip back and forth. Pinned by
   `combine.test.ts`, the hysteresis tests (Task 3).

---

## File structure

```
package.json, pnpm-workspace.yaml, tsconfig.base.json, vitest.config.ts, .env (gitignored)
packages/core/
  package.json, tsconfig.json
  src/index.ts        re-exports
  src/types.ts        AudienceId, Arrival, RawEvent, Decision, DecideRequest/Response, NormalizedArrival
  src/normalize.ts    clip, normalizeArrival, dwellWords, normalizeActions
  src/questions.ts    AUDIENCE_DEFINITIONS, audienceQuestions, arrivalRequest, actionsRequest (plain objects)
  src/combine.ts      actionWeight, blend, chooseActive, emptyDecision, zeroScores
  src/policy.ts       orderSections, audienceAtRank, applyPin, shouldAlert
  src/validate.ts     parseDecideRequest, parseDecision, parseDecisionCookie
  src/decide.ts       decide(req, deps)
  src/*.test.ts
packages/react/
  package.json, tsconfig.json
  src/index.ts
  src/session.ts      TailorSession, startSession, saveSession, writeDecisionCookie
  src/client.ts       TailorClient (event queue, debounce, fetch, subscribe)
  src/context.tsx     TailorProvider, useTailor, DEFAULT_LABELS
  src/defer.ts        inViewport, useDeferredApply
  src/Slot.tsx        Slot, Variant
  src/SlotGroup.tsx   SlotGroup, Section (dwell tracking)
  src/Emphasis.tsx    Emphasis
  src/Signal.tsx      Signal
  src/AudienceSwitcher.tsx
  src/TailorLens.tsx
  src/styles.ts       FLASH_CSS
apps/site/  (create-next-app, then:)
  next.config.ts
  src/app/layout.tsx, globals.css
  src/app/page.tsx, docs/page.tsx, use-cases/page.tsx, privacy/page.tsx, vision/page.tsx, contact/page.tsx, demo/page.tsx
  src/app/api/tailor/v1/decide/route.ts, src/app/api/contact/route.ts
  src/server/jev.ts, src/server/alert.ts
  src/components/tailor-root.tsx, site-header.tsx, site-footer.tsx, code-block.tsx, next-step.tsx, contact-form.tsx
scripts/jev-check.ts
```

---

### Task 1: Workspace and core types

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/types.ts`,
  `packages/core/src/index.ts`

**Interfaces:**
- Produces: the types used by every later task (exact definitions below).

- [ ] **Step 1: Branch and workspace files**

```bash
cd /Users/milindsunils/Personal/jevathon && git checkout -b feat/tailor-mvp
```

`package.json`:
```json
{
  "name": "tailor",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "test": "vitest run",
    "dev": "pnpm --filter site dev",
    "build": "pnpm --filter site build",
    "jev:check": "tsx --env-file=.env scripts/jev-check.ts"
  },
  "devDependencies": {
    "@types/node": "^24",
    "tsx": "^4",
    "typescript": "^5.9",
    "vitest": "^5"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - packages/*
  - apps/*
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["packages/**/src/**/*.test.ts"] } });
```

`packages/core/package.json`:
```json
{ "name": "@tailor/core", "version": "0.1.0", "private": true, "type": "module", "exports": { ".": "./src/index.ts" } }
```

`packages/core/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 2: Core types** in `packages/core/src/types.ts`

```ts
export const AUDIENCES = ["developer", "growth_lead", "privacy_reviewer", "investor"] as const;
export type AudienceId = (typeof AUDIENCES)[number];
export type AudienceScores = Record<AudienceId, number>;

/** What the browser captured when the session started. */
export interface Arrival {
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  landingPath: string;
}

/** Arrival reduced to what Jev may see. */
export interface NormalizedArrival {
  source: string | null;
  campaign: string | null;
  search_terms: string | null;
  landing_page: string;
}

export type RawEvent =
  | { kind: "page"; path: string; title: string; at: number }
  | { kind: "click"; label: string; section: string | null; at: number }
  | { kind: "dwell"; section: string; ms: number; at: number }
  | { kind: "signal"; label: string; at: number };

export interface Decision {
  /** Most likely active audience, or null for the default page. */
  primary: AudienceId | null;
  /** Active audiences, primary first. */
  active: AudienceId[];
  /** Combined probability per audience. */
  p: AudienceScores;
  /** P(visitor wants a conversation with the Tailor team). */
  talkInterest: number;
  version: number;
}

export interface DecideRequest {
  siteKey: string;
  sessionId: string;
  arrival: Arrival;
  events: RawEvent[];
  previous: Decision | null;
}

export interface DecideDebug {
  arrivalState: NormalizedArrival | null;
  actions: string[];
  arrivalScores: AudienceScores | null;
  actionScores: AudienceScores | null;
  weight: number;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  arrivalCached: boolean;
  error: string | null;
}

export interface DecideResponse {
  decision: Decision;
  debug: DecideDebug;
}
```

`packages/core/src/index.ts`:
```ts
export * from "./types";
```

- [ ] **Step 3: Install and typecheck**

Run: `pnpm install && pnpm exec tsc -p packages/core`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Workspace and Tailor core types"
```

---

### Task 2: Normalization (arrival and actions)

**Files:**
- Create: `packages/core/src/normalize.ts`, `packages/core/src/normalize.test.ts`
- Modify: `packages/core/src/index.ts` (add `export * from "./normalize";`)

**Interfaces:**
- Consumes: `Arrival`, `NormalizedArrival`, `RawEvent` from Task 1.
- Produces:
  - `clip(text: string, max?: number): string`
  - `normalizeArrival(arrival: Arrival, selfHost?: string): NormalizedArrival | null`
  - `dwellWords(ms: number): string | null`
  - `normalizeActions(events: RawEvent[]): string[]`
  - `MAX_EVENTS = 50`, `MAX_ACTIONS = 12`, `MAX_TEXT = 80`

- [ ] **Step 1: Write the failing tests** in `packages/core/src/normalize.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { clip, dwellWords, normalizeActions, normalizeArrival } from "./normalize";
import type { Arrival, RawEvent } from "./types";

const arrival = (a: Partial<Arrival>): Arrival => ({
  referrer: null, utm_source: null, utm_campaign: null, utm_term: null, landingPath: "/", ...a,
});

describe("normalizeArrival", () => {
  it("returns null when there is no evidence", () => {
    expect(normalizeArrival(arrival({}))).toBeNull();
  });
  it("prefers utm_source over the referrer and keeps campaign and terms", () => {
    expect(normalizeArrival(arrival({
      referrer: "https://www.google.com/", utm_source: "linkedin", utm_campaign: "website-conversion",
      utm_term: "website+personalization", landingPath: "/docs",
    }))).toEqual({ source: "linkedin", campaign: "website-conversion", search_terms: "website personalization", landing_page: "/docs" });
  });
  it("reduces the referrer to its domain without www", () => {
    expect(normalizeArrival(arrival({ referrer: "https://www.news.ycombinator.com/item?id=1" }))?.source).toBe("news.ycombinator.com");
  });
  it("ignores self referrer and garbage", () => {
    expect(normalizeArrival(arrival({ referrer: "https://tailor.example/docs" }), "tailor.example")).toBeNull();
    expect(normalizeArrival(arrival({ referrer: "not a url" }))).toBeNull();
  });
  it("clips long values", () => {
    expect(normalizeArrival(arrival({ utm_source: "x".repeat(500) }))?.source).toHaveLength(80);
  });
});

describe("dwellWords", () => {
  it("buckets dwell time into words", () => {
    expect(dwellWords(7_999)).toBeNull();
    expect(dwellWords(8_000)).toBe("for a while");
    expect(dwellWords(20_000)).toBe("for a long time");
  });
});

describe("normalizeActions", () => {
  const at = 0;
  it("describes each event kind", () => {
    const events: RawEvent[] = [
      { kind: "page", path: "/docs", title: "Docs", at },
      { kind: "click", label: "Copy", section: "Install", at },
      { kind: "signal", label: "copied the install command", at },
      { kind: "dwell", section: "Data retention", ms: 21_000, at },
    ];
    expect(normalizeActions(events)).toEqual([
      "opened the Docs page", "clicked 'Copy' in 'Install'", "copied the install command", "read 'Data retention' for a long time",
    ]);
  });
  it("marks repeats instead of listing them twice", () => {
    const e: RawEvent = { kind: "signal", label: "copied the install command", at };
    expect(normalizeActions([e, e])).toEqual(["copied the install command more than once"]);
  });
  it("keeps only the longest dwell per section and drops short dwells", () => {
    expect(normalizeActions([
      { kind: "dwell", section: "Pricing", ms: 3_000, at },
      { kind: "dwell", section: "Pricing", ms: 9_000, at },
      { kind: "dwell", section: "Pricing", ms: 22_000, at },
    ])).toEqual(["read 'Pricing' for a long time"]);
  });
  it("keeps the last 12 actions", () => {
    const events: RawEvent[] = Array.from({ length: 20 }, (_, i) => ({ kind: "signal" as const, label: `s${i}`, at }));
    const actions = normalizeActions(events);
    expect(actions).toHaveLength(12);
    expect(actions[11]).toBe("s19");
  });
  it("clips labels", () => {
    expect(clip("  a   b  ")).toBe("a b");
    expect(normalizeActions([{ kind: "signal", label: "y".repeat(300), at }])[0]).toHaveLength(80);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, "Failed to resolve import ./normalize".

- [ ] **Step 3: Implement** `packages/core/src/normalize.ts`

```ts
import type { Arrival, NormalizedArrival, RawEvent } from "./types";

export const MAX_EVENTS = 50;
export const MAX_ACTIONS = 12;
export const MAX_TEXT = 80;

export function clip(text: string, max = MAX_TEXT): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function referrerDomain(referrer: string | null, selfHost?: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || (selfHost && host === selfHost.replace(/^www\./, ""))) return null;
    return clip(host);
  } catch {
    return null;
  }
}

/** Arrival evidence Jev may see, or null when there is none (then the arrival request is skipped). */
export function normalizeArrival(arrival: Arrival, selfHost?: string): NormalizedArrival | null {
  const source = arrival.utm_source ? clip(arrival.utm_source) : referrerDomain(arrival.referrer, selfHost);
  const campaign = arrival.utm_campaign ? clip(arrival.utm_campaign) : null;
  const search_terms = arrival.utm_term ? clip(arrival.utm_term.replace(/\+/g, " ")) : null;
  if (!source && !campaign && !search_terms) return null;
  return { source, campaign, search_terms, landing_page: clip(arrival.landingPath || "/") };
}

export function dwellWords(ms: number): string | null {
  if (ms >= 20_000) return "for a long time";
  if (ms >= 8_000) return "for a while";
  return null;
}

function describe(event: RawEvent): string | null {
  switch (event.kind) {
    case "page":
      return `opened the ${clip(event.title, 60)} page`;
    case "click":
      return event.section ? `clicked '${clip(event.label, 40)}' in '${clip(event.section, 30)}'` : `clicked '${clip(event.label, 60)}'`;
    case "signal":
      return clip(event.label);
    case "dwell": {
      const words = dwellWords(event.ms);
      return words ? `read '${clip(event.section, 50)}' ${words}` : null;
    }
  }
}

/** Raw events → short phrases for Jev. Counts become words; only meaningful actions survive. */
export function normalizeActions(events: RawEvent[]): string[] {
  const recent = events.slice(-MAX_EVENTS);
  const longestDwell = new Map<string, number>();
  for (const e of recent) if (e.kind === "dwell") longestDwell.set(e.section, Math.max(longestDwell.get(e.section) ?? 0, e.ms));

  const order: string[] = [];
  const counts = new Map<string, number>();
  const dwellDone = new Set<string>();
  for (const e of recent) {
    if (e.kind === "dwell") {
      if (dwellDone.has(e.section) || e.ms < (longestDwell.get(e.section) ?? 0)) continue;
      dwellDone.add(e.section);
    }
    const phrase = describe(e);
    if (!phrase) continue;
    if (!counts.has(phrase)) order.push(phrase);
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return order
    .map((phrase) => ((counts.get(phrase) ?? 0) > 1 ? clip(`${phrase} more than once`, MAX_TEXT + 20) : phrase))
    .slice(-MAX_ACTIONS);
}
```

Add `export * from "./normalize";` to `index.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Core: normalize arrival and actions into phrases for Jev"
```

---

### Task 3: Questions, combining, policy

**Files:**
- Create: `packages/core/src/questions.ts`, `packages/core/src/combine.ts`, `packages/core/src/policy.ts`
- Create: `packages/core/src/combine.test.ts`, `packages/core/src/policy.test.ts`, `packages/core/src/questions.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: the types from Task 1.
- Produces:
  - `interface NoulQ { type: "noul"; instructions: string; criteria: { true: string; false: string } }`
  - `interface JevRequest { state: Record<string, unknown>; questions: Record<string, NoulQ> }`
  - `arrivalRequest(arrival: NormalizedArrival): JevRequest`
  - `actionsRequest(actions: string[]): JevRequest` (questions: the four audiences plus `talk_interest`)
  - `ACTIVE_THRESHOLD = 0.6`, `KEEP_THRESHOLD = 0.5`, `SWITCH_MARGIN = 0.1`, `ACTION_WEIGHTS`, `TALK_THRESHOLD = 0.8`
  - `zeroScores(): AudienceScores`
  - `emptyDecision(version?: number): Decision`
  - `actionWeight(meaningfulActions: number, hasArrival: boolean): number`
  - `blend(arrival: AudienceScores | null, actions: AudienceScores | null, w: number): AudienceScores`
  - `chooseActive(p: AudienceScores, previousPrimary: AudienceId | null): { primary: AudienceId | null; active: AudienceId[] }`
  - `orderSections<T extends { id: string; audience?: AudienceId | undefined }>(sections: T[], active: AudienceId[]): T[]`
  - `audienceAtRank(decision: Decision | null, rank: number): AudienceId | null`
  - `applyPin(decision: Decision | null, pinned: AudienceId | null): Decision | null`
  - `shouldAlert(talkInterest: number): boolean`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/questions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { actionsRequest, arrivalRequest } from "./questions";

const compound = /\b(and|or)\b/i;

describe("questions", () => {
  it("keeps arrival and actions evidence in separate states", () => {
    const a = arrivalRequest({ source: "hackernews", campaign: null, search_terms: null, landing_page: "/" });
    expect(Object.keys(a.state)).toEqual(["arrival"]);
    expect(Object.keys(a.questions).sort()).toEqual(["developer", "growth_lead", "investor", "privacy_reviewer"]);
    const b = actionsRequest(["opened the Docs page"]);
    expect(Object.keys(b.state)).toEqual(["actions"]);
    expect(Object.keys(b.questions)).toContain("talk_interest");
  });
  it("asks only atomic questions: no and/or in instructions or criteria", () => {
    const b = actionsRequest(["x"]);
    for (const q of Object.values(b.questions)) {
      expect(q.instructions).not.toMatch(compound);
      expect(q.criteria.true).not.toMatch(compound);
      expect(q.criteria.false).not.toMatch(compound);
    }
  });
  it("points each question at its own evidence", () => {
    expect(arrivalRequest({ source: "x", campaign: null, search_terms: null, landing_page: "/" }).questions.developer?.instructions).toContain("`arrival`");
    expect(actionsRequest(["x"]).questions.investor?.instructions).toContain("`actions`");
  });
});
```

`packages/core/src/combine.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { actionWeight, blend, chooseActive, zeroScores } from "./combine";
import type { AudienceScores } from "./types";

const s = (p: Partial<AudienceScores>): AudienceScores => ({ ...zeroScores(), ...p });

describe("actionWeight", () => {
  it("grows with meaningful actions", () => {
    expect([0, 1, 2, 3, 9].map((n) => actionWeight(n, true))).toEqual([0, 0.5, 0.7, 0.85, 0.85]);
  });
  it("is 1 when there is no arrival evidence", () => {
    expect(actionWeight(1, false)).toBe(1);
  });
});

describe("blend", () => {
  it("uses arrival alone before any action", () => {
    expect(blend(s({ developer: 0.8 }), null, 0).developer).toBeCloseTo(0.8);
  });
  it("mixes by weight", () => {
    expect(blend(s({ investor: 0.8 }), s({ investor: 0.2 }), 0.5).investor).toBeCloseTo(0.5);
  });
  it("uses actions alone when arrival is missing", () => {
    expect(blend(null, s({ privacy_reviewer: 0.9 }), 1).privacy_reviewer).toBeCloseTo(0.9);
  });
});

describe("chooseActive", () => {
  it("returns the default page when nothing clears 0.6", () => {
    expect(chooseActive(s({ developer: 0.59 }), null)).toEqual({ primary: null, active: [] });
  });
  it("allows several active audiences, most likely first", () => {
    expect(chooseActive(s({ developer: 0.7, investor: 0.9 }), null)).toEqual({ primary: "investor", active: ["investor", "developer"] });
  });
  it("keeps the previous primary while it stays above 0.5 and no challenger leads by 0.1", () => {
    expect(chooseActive(s({ developer: 0.55, privacy_reviewer: 0.62 }), "developer")).toEqual({
      primary: "developer", active: ["developer", "privacy_reviewer"],
    });
  });
  it("switches when a challenger leads by at least 0.1", () => {
    expect(chooseActive(s({ developer: 0.6, privacy_reviewer: 0.75 }), "developer").primary).toBe("privacy_reviewer");
  });
  it("drops the previous primary below 0.5", () => {
    expect(chooseActive(s({ developer: 0.4 }), "developer")).toEqual({ primary: null, active: [] });
  });
  it("does not oscillate over a sequence of close readings", () => {
    const readings = [s({ developer: 0.7, investor: 0.65 }), s({ developer: 0.66, investor: 0.7 }), s({ developer: 0.68, investor: 0.72 })];
    let primary: ReturnType<typeof chooseActive>["primary"] = null;
    const seen = readings.map((p) => (primary = chooseActive(p, primary).primary));
    expect(seen).toEqual(["developer", "developer", "developer"]);
  });
});
```

`packages/core/src/policy.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { emptyDecision } from "./combine";
import { applyPin, audienceAtRank, orderSections, shouldAlert } from "./policy";
import type { Decision } from "./types";

const sections = [
  { id: "how-it-works" }, { id: "outcomes", audience: "growth_lead" as const }, { id: "quickstart", audience: "developer" as const },
  { id: "privacy", audience: "privacy_reviewer" as const }, { id: "pricing", audience: "growth_lead" as const },
  { id: "vision", audience: "investor" as const }, { id: "faq" },
];

describe("orderSections", () => {
  it("keeps the default order with no active audience", () => {
    expect(orderSections(sections, []).map((x) => x.id)).toEqual(sections.map((x) => x.id));
  });
  it("puts active audiences' sections first, in active order, keeping everything", () => {
    expect(orderSections(sections, ["investor", "developer"]).map((x) => x.id)).toEqual([
      "vision", "quickstart", "how-it-works", "outcomes", "privacy", "pricing", "faq",
    ]);
  });
  it("keeps default order among one audience's sections", () => {
    expect(orderSections(sections, ["growth_lead"]).map((x) => x.id).slice(0, 2)).toEqual(["outcomes", "pricing"]);
  });
});

describe("audienceAtRank", () => {
  it("reads the active list", () => {
    const d: Decision = { ...emptyDecision(), primary: "developer", active: ["developer", "investor"] };
    expect(audienceAtRank(d, 0)).toBe("developer");
    expect(audienceAtRank(d, 1)).toBe("investor");
    expect(audienceAtRank(d, 2)).toBeNull();
    expect(audienceAtRank(null, 0)).toBeNull();
  });
});

describe("applyPin", () => {
  const auto: Decision = { ...emptyDecision(3), primary: "developer", active: ["developer", "investor"] };
  it("returns the auto decision when unpinned", () => {
    expect(applyPin(auto, null)).toBe(auto);
  });
  it("puts the pinned audience first without losing the others", () => {
    expect(applyPin(auto, "investor")).toMatchObject({ primary: "investor", active: ["investor", "developer"], version: 3 });
  });
  it("works before any server decision", () => {
    expect(applyPin(null, "privacy_reviewer")).toMatchObject({ primary: "privacy_reviewer", active: ["privacy_reviewer"] });
    expect(applyPin(null, null)).toBeNull();
  });
});

describe("shouldAlert", () => {
  it("alerts at 0.8", () => {
    expect(shouldAlert(0.79)).toBe(false);
    expect(shouldAlert(0.8)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement** `packages/core/src/questions.ts`

```ts
import { AUDIENCES, type AudienceId, type NormalizedArrival } from "./types";

export interface NoulQ {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

export interface JevRequest {
  state: Record<string, unknown>;
  questions: Record<string, NoulQ>;
}

/** One condition per question and criterion. The Jev docs say to keep questions atomic. */
export const AUDIENCE_DEFINITIONS: Record<AudienceId, { question: string; yes: string; no: string }> = {
  developer: {
    question: "is this visitor a developer who would write the code that adds Tailor to a website?",
    yes: "The visitor is a developer who would write the integration code.",
    no: "The visitor is not a developer who would write the integration code.",
  },
  growth_lead: {
    question: "is this visitor a growth lead who would buy Tailor to raise conversion?",
    yes: "The visitor is a growth lead evaluating Tailor as a purchase.",
    no: "The visitor is not a growth lead evaluating Tailor as a purchase.",
  },
  privacy_reviewer: {
    question: "is this visitor reviewing Tailor against data-privacy requirements?",
    yes: "The visitor is checking how Tailor handles visitor data.",
    no: "The visitor is not checking how Tailor handles visitor data.",
  },
  investor: {
    question: "is this visitor judging Tailor as an investment?",
    yes: "The visitor is assessing Tailor as a company to invest in.",
    no: "The visitor is not assessing Tailor as a company to invest in.",
  },
};

function audienceQuestions(source: "arrival" | "actions"): Record<AudienceId, NoulQ> {
  return Object.fromEntries(
    AUDIENCES.map((a) => {
      const d = AUDIENCE_DEFINITIONS[a];
      return [a, { type: "noul", instructions: `Based on \`${source}\`, ${d.question}`, criteria: { true: d.yes, false: d.no } }];
    }),
  ) as Record<AudienceId, NoulQ>;
}

export const TALK_INTEREST_QUESTION: NoulQ = {
  type: "noul",
  instructions: "Based on `actions`, does this visitor want a conversation with the Tailor team?",
  criteria: {
    true: "The visitor is seeking a conversation with the Tailor team.",
    false: "The visitor shows no interest in a conversation with the Tailor team.",
  },
};

export function arrivalRequest(arrival: NormalizedArrival): JevRequest {
  return { state: { arrival }, questions: audienceQuestions("arrival") };
}

export function actionsRequest(actions: string[]): JevRequest {
  return { state: { actions }, questions: { ...audienceQuestions("actions"), talk_interest: TALK_INTEREST_QUESTION } };
}
```

- [ ] **Step 4: Implement** `packages/core/src/combine.ts`

```ts
import { AUDIENCES, type AudienceId, type AudienceScores, type Decision } from "./types";

export const ACTIVE_THRESHOLD = 0.6;
export const KEEP_THRESHOLD = 0.5;
export const SWITCH_MARGIN = 0.1;
export const ACTION_WEIGHTS = [0, 0.5, 0.7, 0.85] as const;

export function zeroScores(): AudienceScores {
  return { developer: 0, growth_lead: 0, privacy_reviewer: 0, investor: 0 };
}

export function emptyDecision(version = 0): Decision {
  return { primary: null, active: [], p: zeroScores(), talkInterest: 0, version };
}

/** How much behaviour counts against arrival. With no arrival evidence, behaviour is everything. */
export function actionWeight(meaningfulActions: number, hasArrival: boolean): number {
  if (!hasArrival) return 1;
  return ACTION_WEIGHTS[Math.min(meaningfulActions, ACTION_WEIGHTS.length - 1)] ?? 0;
}

export function blend(arrival: AudienceScores | null, actions: AudienceScores | null, w: number): AudienceScores {
  const out = zeroScores();
  for (const a of AUDIENCES) out[a] = (arrival ? (1 - w) * arrival[a] : 0) + (actions ? w * actions[a] : 0);
  return out;
}

/** Active audiences with hysteresis, so the primary doesn't flip back and forth on close readings. */
export function chooseActive(p: AudienceScores, previousPrimary: AudienceId | null): { primary: AudienceId | null; active: AudienceId[] } {
  const ranked = [...AUDIENCES].sort((a, b) => p[b] - p[a]);
  const active = ranked.filter((a) => p[a] >= ACTIVE_THRESHOLD);
  if (previousPrimary && p[previousPrimary] >= KEEP_THRESHOLD) {
    const challenger = active.find((a) => a !== previousPrimary);
    if (!challenger || p[challenger] < p[previousPrimary] + SWITCH_MARGIN) {
      return { primary: previousPrimary, active: [previousPrimary, ...active.filter((a) => a !== previousPrimary)] };
    }
  }
  return { primary: active[0] ?? null, active };
}
```

- [ ] **Step 5: Implement** `packages/core/src/policy.ts`

```ts
import { emptyDecision } from "./combine";
import type { AudienceId, Decision } from "./types";

export const TALK_THRESHOLD = 0.8;

/** Sections for active audiences first (in active order), then the rest in their default order. Nothing is removed. */
export function orderSections<T extends { id: string; audience?: AudienceId | undefined }>(sections: T[], active: AudienceId[]): T[] {
  const rank = (s: T) => (s.audience ? active.indexOf(s.audience) : -1);
  const promoted = sections.filter((s) => rank(s) >= 0).sort((a, b) => rank(a) - rank(b));
  return [...promoted, ...sections.filter((s) => rank(s) < 0)];
}

export function audienceAtRank(decision: Decision | null, rank: number): AudienceId | null {
  return decision?.active[rank] ?? null;
}

/** An explicit choice beats inference: the pinned audience leads, and the others stay active behind it. */
export function applyPin(decision: Decision | null, pinned: AudienceId | null): Decision | null {
  if (!pinned) return decision;
  const base = decision ?? emptyDecision();
  return { ...base, primary: pinned, active: [pinned, ...base.active.filter((a) => a !== pinned)] };
}

export function shouldAlert(talkInterest: number): boolean {
  return talkInterest >= TALK_THRESHOLD;
}
```

Update `index.ts`:
```ts
export * from "./types";
export * from "./normalize";
export * from "./questions";
export * from "./combine";
export * from "./policy";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS (all core tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Core: atomic Jev questions, combining with hysteresis, section policy and pinning"
```

---

### Task 4: Validation and the decide orchestrator

**Files:**
- Create: `packages/core/src/validate.ts`, `packages/core/src/decide.ts`
- Create: `packages/core/src/validate.test.ts`, `packages/core/src/decide.test.ts`
- Modify: `packages/core/src/index.ts` (export both)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `parseDecideRequest(input: unknown): DecideRequest | null`
  - `parseDecision(input: unknown): Decision | null`
  - `parseDecisionCookie(value: string | null | undefined): Decision | null`
  - `type JevAsk = (req: JevRequest) => Promise<{ answers: Record<string, { noul: number }>; usage: { input_tokens: number } }>`
  - `interface DecideDeps { ask: JevAsk; arrivalCache: Map<string, AudienceScores>; now?: () => number; selfHost?: string }`
  - `decide(req: DecideRequest, deps: DecideDeps): Promise<DecideResponse>`
  - `JEV_USD_PER_INPUT_TOKEN`

- [ ] **Step 1: Write the failing tests**

`packages/core/src/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseDecideRequest, parseDecisionCookie } from "./validate";

const good = {
  siteKey: "site_tailor", sessionId: "abc",
  arrival: { referrer: null, utm_source: "hackernews", utm_campaign: null, utm_term: null, landingPath: "/" },
  events: [{ kind: "signal", label: "copied", at: 1 }], previous: null,
};

describe("parseDecideRequest", () => {
  it("accepts a well-formed request", () => {
    expect(parseDecideRequest(good)).toMatchObject({ siteKey: "site_tailor", events: [{ kind: "signal", label: "copied" }] });
  });
  it("rejects bad shapes", () => {
    expect(parseDecideRequest(null)).toBeNull();
    expect(parseDecideRequest("x")).toBeNull();
    expect(parseDecideRequest({ ...good, sessionId: 5 })).toBeNull();
    expect(parseDecideRequest({ ...good, arrival: null })).toBeNull();
    expect(parseDecideRequest({ ...good, events: "nope" })).toBeNull();
  });
  it("caps events at 50, drops unknown kinds, and clips strings", () => {
    const events = [
      ...Array.from({ length: 500 }, () => ({ kind: "signal", label: "z".repeat(10_000), at: 1 })),
      { kind: "evil", label: "x" },
      { kind: "dwell", section: "s", ms: -5, at: 1 },
    ];
    const parsed = parseDecideRequest({ ...good, events });
    expect(parsed?.events.length).toBeLessThanOrEqual(50);
    expect(parsed?.events.every((e) => e.kind === "signal" && e.label.length <= 200)).toBe(true);
  });
  it("drops an invalid previous decision instead of failing", () => {
    expect(parseDecideRequest({ ...good, previous: { primary: "hacker" } })?.previous).toBeNull();
  });
});

describe("parseDecisionCookie", () => {
  it("round-trips a decision and rejects junk", () => {
    const d = { primary: "developer", active: ["developer"], p: { developer: 0.9, growth_lead: 0, privacy_reviewer: 0, investor: 0 }, talkInterest: 0.1, version: 2 };
    expect(parseDecisionCookie(encodeURIComponent(JSON.stringify(d)))).toEqual(d);
    expect(parseDecisionCookie("%7Bbad")).toBeNull();
    expect(parseDecisionCookie(undefined)).toBeNull();
  });
});
```

`packages/core/src/decide.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { decide, type JevAsk } from "./decide";
import type { DecideRequest } from "./types";

const req = (over: Partial<DecideRequest> = {}): DecideRequest => ({
  siteKey: "k", sessionId: "s",
  arrival: { referrer: null, utm_source: null, utm_campaign: null, utm_term: null, landingPath: "/" },
  events: [], previous: null, ...over,
});

const answers = (p: Record<string, number>) => ({
  answers: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { noul: v }])),
  usage: { input_tokens: 300 },
});

describe("decide", () => {
  it("skips Jev entirely with no arrival evidence and no actions", async () => {
    const ask = vi.fn<JevAsk>();
    const res = await decide(req(), { ask, arrivalCache: new Map() });
    expect(ask).not.toHaveBeenCalled();
    expect(res.decision.primary).toBeNull();
  });
  it("uses arrival alone on the first call and caches it", async () => {
    const ask = vi.fn<JevAsk>().mockResolvedValue(answers({ developer: 0.85, growth_lead: 0.1, privacy_reviewer: 0.05, investor: 0.1 }));
    const cache = new Map();
    const r = req({ arrival: { ...req().arrival, utm_source: "hackernews" } });
    const first = await decide(r, { ask, arrivalCache: cache });
    expect(first.decision.primary).toBe("developer");
    expect(first.debug.arrivalCached).toBe(false);
    const second = await decide(r, { ask, arrivalCache: cache });
    expect(second.debug.arrivalCached).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });
  it("lets behaviour take over from arrival", async () => {
    const ask = vi.fn<JevAsk>(async (jr) =>
      "arrival" in jr.state
        ? answers({ developer: 0.1, growth_lead: 0.1, privacy_reviewer: 0.1, investor: 0.9 })
        : answers({ developer: 0.95, growth_lead: 0.1, privacy_reviewer: 0.1, investor: 0.2, talk_interest: 0.1 }),
    );
    const events = [1, 2, 3].map((i) => ({ kind: "signal" as const, label: `copied snippet ${i}`, at: i }));
    const res = await decide(req({ arrival: { ...req().arrival, utm_source: "vc-newsletter" }, events }), { ask, arrivalCache: new Map() });
    expect(res.debug.weight).toBe(0.85);
    expect(res.decision.primary).toBe("developer");
  });
  it("keeps the previous decision when Jev fails", async () => {
    const ask = vi.fn<JevAsk>().mockRejectedValue(new Error("timeout"));
    const previous = { primary: "investor" as const, active: ["investor" as const], p: { developer: 0, growth_lead: 0, privacy_reviewer: 0, investor: 0.8 }, talkInterest: 0, version: 4 };
    const res = await decide(req({ events: [{ kind: "signal", label: "x", at: 1 }], previous }), { ask, arrivalCache: new Map() });
    expect(res.decision).toEqual(previous);
    expect(res.debug.error).toContain("timeout");
  });
  it("reports talk interest, tokens and cost", async () => {
    const ask = vi.fn<JevAsk>().mockResolvedValue(answers({ developer: 0.1, growth_lead: 0.9, privacy_reviewer: 0.1, investor: 0.1, talk_interest: 0.85 }));
    const res = await decide(req({ events: [{ kind: "signal", label: "clicked Book a walkthrough", at: 1 }] }), { ask, arrivalCache: new Map() });
    expect(res.decision.talkInterest).toBeCloseTo(0.85);
    expect(res.debug.tokens).toBe(300);
    expect(res.debug.costUsd).toBeCloseTo(300 * 0.042 / 1_000_000);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement** `packages/core/src/validate.ts`

```ts
import { MAX_EVENTS } from "./normalize";
import { AUDIENCES, type Arrival, type AudienceId, type DecideRequest, type Decision, type RawEvent } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isAudience = (v: unknown): v is AudienceId => typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);

function parseEvent(v: unknown): RawEvent | null {
  if (!isObj(v)) return null;
  const at = num(v.at) ?? 0;
  switch (v.kind) {
    case "page": {
      const path = str(v.path), title = str(v.title);
      return path !== null && title !== null ? { kind: "page", path, title, at } : null;
    }
    case "click": {
      const label = str(v.label);
      return label !== null ? { kind: "click", label, section: str(v.section), at } : null;
    }
    case "dwell": {
      const section = str(v.section), ms = num(v.ms);
      return section !== null && ms !== null && ms >= 0 ? { kind: "dwell", section, ms, at } : null;
    }
    case "signal": {
      const label = str(v.label);
      return label !== null ? { kind: "signal", label, at } : null;
    }
    default:
      return null;
  }
}

export function parseDecision(v: unknown): Decision | null {
  if (!isObj(v) || !isObj(v.p)) return null;
  const primary = v.primary === null ? null : isAudience(v.primary) ? v.primary : undefined;
  if (primary === undefined || !Array.isArray(v.active)) return null;
  const p = v.p;
  const scores = { developer: num(p.developer), growth_lead: num(p.growth_lead), privacy_reviewer: num(p.privacy_reviewer), investor: num(p.investor) };
  if (Object.values(scores).some((x) => x === null)) return null;
  return {
    primary,
    active: v.active.filter(isAudience),
    p: scores as Decision["p"],
    talkInterest: num(v.talkInterest) ?? 0,
    version: num(v.version) ?? 0,
  };
}

export function parseDecisionCookie(value: string | null | undefined): Decision | null {
  if (!value) return null;
  try {
    return parseDecision(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

export function parseDecideRequest(input: unknown): DecideRequest | null {
  if (!isObj(input) || !isObj(input.arrival) || !Array.isArray(input.events)) return null;
  const siteKey = str(input.siteKey, 64), sessionId = str(input.sessionId, 64);
  const landingPath = str(input.arrival.landingPath);
  if (!siteKey || !sessionId || landingPath === null) return null;
  const a = input.arrival;
  const arrival: Arrival = {
    referrer: str(a.referrer, 500), utm_source: str(a.utm_source), utm_campaign: str(a.utm_campaign), utm_term: str(a.utm_term), landingPath,
  };
  const events = input.events.slice(-MAX_EVENTS * 2).map(parseEvent).filter((e): e is RawEvent => e !== null).slice(-MAX_EVENTS);
  return { siteKey, sessionId, arrival, events, previous: parseDecision(input.previous) };
}
```

- [ ] **Step 4: Implement** `packages/core/src/decide.ts`

```ts
import { actionWeight, blend, chooseActive, emptyDecision } from "./combine";
import { normalizeActions, normalizeArrival } from "./normalize";
import { actionsRequest, arrivalRequest, type JevRequest } from "./questions";
import { AUDIENCES, type AudienceScores, type DecideRequest, type DecideResponse, type Decision } from "./types";

export const JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

export type JevAsk = (req: JevRequest) => Promise<{ answers: Record<string, { noul: number }>; usage: { input_tokens: number } }>;

export interface DecideDeps {
  ask: JevAsk;
  /** Arrival reads keyed by normalized arrival. Jev is self-consistent, so they're safe to share across visitors. */
  arrivalCache: Map<string, AudienceScores>;
  now?: () => number;
  selfHost?: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function scoresFrom(answers: Record<string, { noul: number }>): AudienceScores {
  return Object.fromEntries(AUDIENCES.map((a) => [a, clamp01(answers[a]?.noul ?? 0)])) as AudienceScores;
}

export async function decide(req: DecideRequest, deps: DecideDeps): Promise<DecideResponse> {
  const now = deps.now ?? Date.now;
  const started = now();
  const arrivalState = normalizeArrival(req.arrival, deps.selfHost);
  const actions = normalizeActions(req.events);
  const errors: string[] = [];
  let tokens = 0;

  const cacheKey = arrivalState ? JSON.stringify(arrivalState) : null;
  const cached = cacheKey ? (deps.arrivalCache.get(cacheKey) ?? null) : null;

  const arrivalPromise: Promise<AudienceScores | null> =
    arrivalState && cacheKey && !cached
      ? deps.ask(arrivalRequest(arrivalState)).then(
          (r) => {
            tokens += r.usage.input_tokens;
            const scores = scoresFrom(r.answers);
            deps.arrivalCache.set(cacheKey, scores);
            return scores;
          },
          (e) => {
            errors.push(`arrival: ${message(e)}`);
            return null;
          },
        )
      : Promise.resolve(cached);

  const actionsPromise: Promise<{ scores: AudienceScores; talk: number } | null> =
    actions.length > 0
      ? deps.ask(actionsRequest(actions)).then(
          (r) => {
            tokens += r.usage.input_tokens;
            return { scores: scoresFrom(r.answers), talk: clamp01(r.answers.talk_interest?.noul ?? 0) };
          },
          (e) => {
            errors.push(`actions: ${message(e)}`);
            return null;
          },
        )
      : Promise.resolve(null);

  const [arrivalScores, actionResult] = await Promise.all([arrivalPromise, actionsPromise]);
  const debugBase = {
    arrivalState, actions, arrivalScores, actionScores: actionResult?.scores ?? null,
    tokens, costUsd: tokens * JEV_USD_PER_INPUT_TOKEN, arrivalCached: cached !== null,
    error: errors.length > 0 ? errors.join("; ") : null,
  };

  // A failed read must not undo an earlier decision: keep the page as it is.
  if (errors.length > 0 && req.previous) {
    return { decision: req.previous, debug: { ...debugBase, weight: 0, latencyMs: now() - started } };
  }

  const w = actionResult ? actionWeight(actions.length, arrivalScores !== null) : 0;
  const p = blend(arrivalScores, actionResult?.scores ?? null, w);
  const { primary, active } = chooseActive(p, req.previous?.primary ?? null);
  const base: Decision = req.previous ?? emptyDecision();
  const decision: Decision = {
    primary, active, p,
    talkInterest: actionResult?.talk ?? base.talkInterest,
    version: base.version + 1,
  };
  return { decision, debug: { ...debugBase, weight: w, latencyMs: now() - started } };
}
```

Add to `index.ts`:
```ts
export * from "./validate";
export * from "./decide";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS (all core tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Core: request validation and the decide orchestrator with Jev injected"
```

---

### Task 5: Next.js site scaffold, Jev client, decide route, live check

**Files:**
- Create: `apps/site/*` (create-next-app), `apps/site/next.config.ts` (replace), `apps/site/src/server/jev.ts`,
  `apps/site/src/server/alert.ts`, `apps/site/src/app/api/tailor/v1/decide/route.ts`, `scripts/jev-check.ts`, `.env`

**Interfaces:**
- Consumes: `decide`, `parseDecideRequest`, `shouldAlert`, `arrivalRequest`, `actionsRequest` from `@tailor/core`.
- Produces:
  - `POST /api/tailor/v1/decide` → `DecideResponse` (400 for invalid, 403 for a wrong site key)
  - `jevAsk: JevAsk`
  - `sendTalkAlert(text: string): Promise<void>`
  - `SITE_KEY = "site_tailor"`

- [ ] **Step 1: Scaffold**

```bash
cd /Users/milindsunils/Personal/jevathon/apps 2>/dev/null || mkdir -p /Users/milindsunils/Personal/jevathon/apps && cd /Users/milindsunils/Personal/jevathon/apps
pnpm create next-app@latest site --ts --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --skip-install --disable-git --yes
cd site && rm -f pnpm-lock.yaml pnpm-workspace.yaml
```

Set `"name": "site"` in `apps/site/package.json`. Add dependencies: `"@tailor/core": "workspace:*"`,
`"@tailor/react": "workspace:*"`, `"@typesafe-ai/sdk": "^0.6.0"`, `"qrcode": "^1.5.4"`, and dev dependency
`"@types/qrcode": "^1.5.5"`. Then run `pnpm install` from the repo root. (The `@tailor/react` package is created in
Task 6; if install complains, create its `package.json` from Task 6 Step 1 first.)

Copy the Gateway key: `grep AI_GATEWAY_API_KEY ../game-dev-tycoon/.env > /Users/milindsunils/Personal/jevathon/.env`
(the root `.env` is gitignored).

- [ ] **Step 2: next.config.ts** (loads the root `.env` and transpiles the workspace packages)

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(root);

const config: NextConfig = {
  transpilePackages: ["@tailor/core", "@tailor/react"],
  turbopack: { root },
};

export default config;
```

- [ ] **Step 3: Server Jev client** `apps/site/src/server/jev.ts`

```ts
// Server-only: calls Jev through Vercel AI Gateway. The key must never reach the browser.
import "server-only";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { JevAsk } from "@tailor/core";

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (client) return client;
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY is not set");
  client = new TypeSafeClient({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/typesafe",
    defaultModel: "typesafe-ai/jev",
    timeout: 1_500,
    retry: { maxRetries: 1 },
  });
  return client;
}

export const jevAsk: JevAsk = async (req) => {
  const res = await getClient().systemOne({ state: req.state, questions: req.questions });
  return res as unknown as Awaited<ReturnType<JevAsk>>;
};
```

Run `pnpm --filter site add server-only`.

- [ ] **Step 4: Alert webhook** `apps/site/src/server/alert.ts`

```ts
import "server-only";

/** Sends a plain-text alert to TAILOR_ALERT_WEBHOOK_URL if configured; logs either way. Never throws. */
export async function sendTalkAlert(text: string): Promise<void> {
  console.info(`[tailor alert] ${text}`);
  const url = process.env.TAILOR_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  } catch (error) {
    console.warn(`[tailor alert] webhook failed: ${(error as Error).message}`);
  }
}
```

- [ ] **Step 5: Decide route** `apps/site/src/app/api/tailor/v1/decide/route.ts`

```ts
import { decide, parseDecideRequest, shouldAlert, type AudienceScores } from "@tailor/core";
import { sendTalkAlert } from "@/server/alert";
import { jevAsk } from "@/server/jev";

const SITE_KEY = "site_tailor"; // public; route modules may only export handlers
const arrivalCache = new Map<string, AudienceScores>();
const alerted = new Set<string>();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const req = parseDecideRequest(body);
  if (!req) return Response.json({ error: "invalid request" }, { status: 400 });
  if (req.siteKey !== SITE_KEY) return Response.json({ error: "unknown site key" }, { status: 403 });

  const selfHost = new URL(request.url).hostname;
  const result = await decide(req, { ask: jevAsk, arrivalCache, selfHost });

  if (shouldAlert(result.decision.talkInterest) && !alerted.has(req.sessionId)) {
    alerted.add(req.sessionId);
    const who = result.decision.active.join(", ") || "unclassified visitor";
    void sendTalkAlert(`Tailor: a ${who} wants to talk. Recent: ${result.debug.actions.slice(-3).join("; ")}`);
  }
  return Response.json(result);
}
```


- [ ] **Step 6: Live Jev check** `scripts/jev-check.ts`

```ts
// Prints Jev's reads for sample arrivals and action lists. Run: pnpm jev:check
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { actionsRequest, arrivalRequest, type NormalizedArrival } from "@tailor/core";

const client = new TypeSafeClient({
  apiKey: process.env.AI_GATEWAY_API_KEY!, baseURL: "https://ai-gateway.vercel.sh/typesafe", defaultModel: "typesafe-ai/jev",
});

const arrivals: NormalizedArrival[] = [
  { source: "hackernews", campaign: null, search_terms: null, landing_page: "/" },
  { source: "linkedin", campaign: "website-conversion", search_terms: null, landing_page: "/" },
  { source: "google", campaign: null, search_terms: "website personalization gdpr cookies", landing_page: "/" },
  { source: "vc-newsletter", campaign: "seed-deals", search_terms: null, landing_page: "/" },
];
const actionLists = [
  ["opened the Docs page", "copied the install command", "clicked 'Next.js' in 'Provider'"],
  ["opened the Use cases page", "clicked 'See what each visitor sees' in 'Pricing page'", "clicked Book a walkthrough"],
  ["opened the Privacy & data page", "clicked 'Data retention' in 'Privacy'", "read 'Cookies' for a long time"],
  ["opened the Vision page", "read 'Why now' for a while", "clicked 'Talk to the founders' in 'Vision'"],
];

const fmt = (a: Record<string, { noul: number }>) => Object.entries(a).map(([k, v]) => `${k}=${v.noul.toFixed(2)}`).join("  ");
for (const a of arrivals) {
  const t = Date.now();
  const r = await client.systemOne(arrivalRequest(a));
  console.log(`arrival ${a.source}/${a.campaign ?? a.search_terms ?? "-"} (${Date.now() - t} ms): ${fmt(r.answers)}`);
}
for (const list of actionLists) {
  const t = Date.now();
  const r = await client.systemOne(actionsRequest(list));
  console.log(`actions [${list[0]}…] (${Date.now() - t} ms): ${fmt(r.answers)}`);
}
```

Add `@typesafe-ai/sdk` and `@tailor/core` (`workspace:*`) to the root devDependencies.

- [ ] **Step 7: Run the live check**

Run: `pnpm install && pnpm jev:check`
Expected: eight lines. Each sample's intended audience should have the highest yes probability (e.g. hackernews →
developer highest). Write the numbers into the commit message; if an intended audience doesn't lead, note it for
threshold tuning in Task 10.

- [ ] **Step 8: Smoke-test the route**

Run: `pnpm dev` (in another terminal), then:
```bash
curl -s localhost:3000/api/tailor/v1/decide -H 'content-type: application/json' -d '{"siteKey":"site_tailor","sessionId":"t1","arrival":{"referrer":null,"utm_source":"hackernews","utm_campaign":null,"utm_term":null,"landingPath":"/"},"events":[],"previous":null}' | head -c 600
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/tailor/v1/decide -d 'nope'
```
Expected: JSON with `decision.p.developer` > 0.6 and `debug.latencyMs`; then `400`.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Site scaffold, server-side Jev client, decide route and live Jev check"
```

---

### Task 6: React SDK: session, client, provider

**Files:**
- Create: `packages/react/package.json`, `packages/react/tsconfig.json`, `packages/react/src/session.ts`,
  `packages/react/src/client.ts`, `packages/react/src/context.tsx`, `packages/react/src/styles.ts`,
  `packages/react/src/index.ts`

**Interfaces:**
- Consumes: `applyPin`, `Decision`, `DecideResponse`, `RawEvent`, `AudienceId`, `AUDIENCES`, `MAX_EVENTS` from core.
- Produces:
  - `TailorProvider(props: { siteKey: string; endpoint: string; initial: Decision | null; pathname?: string; pageTitles?: Record<string, string>; labels?: Partial<Record<AudienceId, string>>; children: ReactNode })`
  - `useTailor(): TailorContextValue`, where `TailorContextValue` is `{ decision: Decision | null; pinned: AudienceId | null; labels: Record<AudienceId, string>; log: LogEntry[]; changes: ChangeEntry[]; lensOpen: boolean; pathname: string; setLensOpen(open: boolean): void; track(label: string): void; reportDwell(section: string, ms: number): void; pin(a: AudienceId | null): void; reset(): void; noteChange(message: string): void }`
  - `LogEntry = { at: number; response: DecideResponse }`
  - `ChangeEntry = { at: number; message: string }`
  - `DEFAULT_LABELS`

- [ ] **Step 1: Package files**

`packages/react/package.json`:
```json
{
  "name": "@tailor/react", "version": "0.1.0", "private": true, "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@tailor/core": "workspace:*" },
  "peerDependencies": { "react": ">=19" },
  "devDependencies": { "@types/react": "^19", "react": "^19" }
}
```
`packages/react/tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`

- [ ] **Step 2: Session storage** `packages/react/src/session.ts`

```ts
import type { Arrival, AudienceId, Decision, RawEvent } from "@tailor/core";

export interface TailorSession {
  id: string;
  arrival: Arrival;
  events: RawEvent[];
  /** The server's (unpinned) decision; sent back as `previous` for hysteresis. */
  decision: Decision | null;
  pinned: AudienceId | null;
  lens: boolean;
}

const KEY = "tailor:session";
let memory: TailorSession | null = null; // used when sessionStorage is unavailable (private mode, blocked storage)

function read(): TailorSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TailorSession) : memory;
  } catch {
    return memory;
  }
}

export function saveSession(session: TailorSession): void {
  memory = session;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* in-memory only */
  }
}

function captureArrival(): Arrival {
  const params = new URLSearchParams(window.location.search);
  let referrer: string | null = document.referrer || null;
  try {
    if (referrer && new URL(referrer).host === window.location.host) referrer = null;
  } catch {
    referrer = null;
  }
  return {
    referrer,
    utm_source: params.get("utm_source"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    landingPath: window.location.pathname,
  };
}

/** Loads this tab's session, or starts one. `?tailor_new=1` forces a fresh session (used by demo links). */
export function startSession(forceNew = false): { session: TailorSession; isNew: boolean } {
  const url = new URL(window.location.href);
  const wantsNew = forceNew || url.searchParams.has("tailor_new");
  const wantsLens = url.searchParams.has("tailor_lens");
  if (url.searchParams.has("tailor_new") || url.searchParams.has("tailor_lens")) {
    url.searchParams.delete("tailor_new");
    url.searchParams.delete("tailor_lens");
    window.history.replaceState(window.history.state, "", url);
  }
  const existing = wantsNew ? null : read();
  if (existing) {
    if (wantsLens) existing.lens = true;
    return { session: existing, isNew: false };
  }
  const session: TailorSession = {
    id: crypto.randomUUID(), arrival: captureArrival(), events: [], decision: null, pinned: null, lens: wantsLens,
  };
  if (wantsNew) writeDecisionCookie(null);
  saveSession(session);
  return { session, isNew: true };
}

/** The effective decision, for the server layout's first render on the next navigation. */
export function writeDecisionCookie(decision: Decision | null): void {
  document.cookie = decision
    ? `tailor_decision=${encodeURIComponent(JSON.stringify(decision))}; path=/; samesite=lax`
    : "tailor_decision=; path=/; max-age=0; samesite=lax";
}
```

Note: `captureArrival` must run before `replaceState` strips parameters. UTM parameters stay in the URL; only the
`tailor_*` parameters are removed, so this order is safe.

- [ ] **Step 3: Client** `packages/react/src/client.ts`

```ts
import { applyPin, MAX_EVENTS, type AudienceId, type DecideResponse, type Decision, type RawEvent } from "@tailor/core";
import { saveSession, startSession, writeDecisionCookie, type TailorSession } from "./session";

export interface LogEntry { at: number; response: DecideResponse }

/** Owns the session, the event queue and the decide calls. At most one request is in flight; the latest state wins. */
export class TailorClient {
  session: TailorSession;
  log: LogEntry[] = [];
  private inFlight = false;
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();

  constructor(private readonly opts: { siteKey: string; endpoint: string; debounceMs?: number }) {
    const { session, isNew } = startSession();
    this.session = session;
    if (isNew) void this.send(); // arrival-only read right away
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  effective(): Decision | null {
    return applyPin(this.session.decision, this.session.pinned);
  }

  record(event: RawEvent): void {
    this.session.events = [...this.session.events, event].slice(-MAX_EVENTS);
    saveSession(this.session);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.send(), this.opts.debounceMs ?? 600);
  }

  pin(audience: AudienceId | null): void {
    this.session.pinned = audience;
    saveSession(this.session);
    writeDecisionCookie(this.effective());
    this.emit();
  }

  setLens(open: boolean): void {
    this.session.lens = open;
    saveSession(this.session);
    this.emit();
  }

  reset(): void {
    this.session = startSession(true).session;
    this.log = [];
    this.emit();
  }

  private async send(): Promise<void> {
    if (this.inFlight) {
      this.pending = true;
      return;
    }
    this.inFlight = true;
    const s = this.session;
    try {
      const res = await fetch(this.opts.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteKey: this.opts.siteKey, sessionId: s.id, arrival: s.arrival, events: s.events, previous: s.decision }),
      });
      if (res.ok && s === this.session) {
        const data = (await res.json()) as DecideResponse;
        s.decision = data.decision;
        saveSession(s);
        writeDecisionCookie(this.effective());
        this.log = [...this.log, { at: Date.now(), response: data }].slice(-30);
        this.emit();
      }
    } catch {
      // Network failure: keep the current page.
    } finally {
      this.inFlight = false;
      if (this.pending) {
        this.pending = false;
        void this.send();
      }
    }
  }
}
```

- [ ] **Step 4: Styles** `packages/react/src/styles.ts`

```ts
export const FLASH_CSS = `
@keyframes tailor-flash { 0% { outline: 3px solid #f59e0b; outline-offset: 4px } 100% { outline: 3px solid transparent; outline-offset: 4px } }
.tailor-flash { animation: tailor-flash 1.8s ease-out; border-radius: 8px }
`;
```

- [ ] **Step 5: Provider** `packages/react/src/context.tsx`

```tsx
"use client";
import { AUDIENCES, type AudienceId, type Decision } from "@tailor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { TailorClient, type LogEntry } from "./client";
import { FLASH_CSS } from "./styles";

export interface ChangeEntry { at: number; message: string }

export interface TailorContextValue {
  decision: Decision | null;
  pinned: AudienceId | null;
  labels: Record<AudienceId, string>;
  log: LogEntry[];
  changes: ChangeEntry[];
  lensOpen: boolean;
  pathname: string;
  setLensOpen(open: boolean): void;
  track(label: string): void;
  reportDwell(section: string, ms: number): void;
  pin(audience: AudienceId | null): void;
  reset(): void;
  noteChange(message: string): void;
}

export const DEFAULT_LABELS: Record<AudienceId, string> = {
  developer: "Developer", growth_lead: "Growth", privacy_reviewer: "Privacy", investor: "Investor",
};

const Ctx = createContext<TailorContextValue | null>(null);

export function useTailor(): TailorContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useTailor must be used inside <TailorProvider>");
  return value;
}

function clickTarget(event: MouseEvent): { label: string; section: string | null } | null {
  const el = (event.target as Element | null)?.closest?.("a,button,summary,[role=button],[role=tab]");
  if (!el || el.closest("[data-tailor-ignore],[data-tailor-signal]")) return null;
  const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!label) return null;
  return { label, section: el.closest("[data-tailor-section]")?.getAttribute("data-tailor-section") ?? null };
}

export function TailorProvider(props: {
  siteKey: string;
  endpoint: string;
  initial: Decision | null;
  pathname?: string;
  pageTitles?: Record<string, string>;
  labels?: Partial<Record<AudienceId, string>>;
  children: ReactNode;
}) {
  const { siteKey, endpoint, initial, pageTitles, children } = props;
  const pathname = props.pathname ?? "/";
  const clientRef = useRef<TailorClient | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const client = new TailorClient({ siteKey, endpoint });
    clientRef.current = client;
    const off = client.subscribe(rerender);
    setMounted(true);
    const onClick = (e: MouseEvent) => {
      const t = clickTarget(e);
      if (t) client.record({ kind: "click", label: t.label, section: t.section, at: Date.now() });
    };
    document.addEventListener("click", onClick, true);
    return () => {
      off();
      document.removeEventListener("click", onClick, true);
    };
  }, [siteKey, endpoint]);

  // Page views after the landing page (the landing page is part of arrival, not an action).
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    if (lastPath.current !== null && lastPath.current !== pathname) {
      client.record({ kind: "page", path: pathname, title: pageTitles?.[pathname] ?? pathname, at: Date.now() });
    }
    lastPath.current = pathname;
  }, [pathname, mounted, pageTitles]);

  const client = clientRef.current;
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...props.labels }), [props.labels]);
  const noteChange = useCallback((message: string) => setChanges((c) => [...c, { at: Date.now(), message }].slice(-20)), []);

  const value: TailorContextValue = {
    // Before mount, render exactly what the server rendered (from the cookie) so hydration matches.
    decision: mounted && client ? (client.effective() ?? null) : initial,
    pinned: client?.session.pinned ?? null,
    labels,
    log: client?.log ?? [],
    changes,
    lensOpen: client?.session.lens ?? false,
    pathname,
    setLensOpen: (open) => client?.setLens(open),
    track: (label) => client?.record({ kind: "signal", label, at: Date.now() }),
    reportDwell: (section, ms) => client?.record({ kind: "dwell", section, ms, at: Date.now() }),
    pin: (a) => client?.pin(a),
    reset: () => {
      client?.reset();
      setChanges([]);
    },
    noteChange,
  };

  return (
    <Ctx.Provider value={value}>
      <style>{FLASH_CSS}</style>
      {children}
    </Ctx.Provider>
  );
}

export { AUDIENCES };
```

`packages/react/src/index.ts` (the components are added in Tasks 7–8):
```ts
export { TailorProvider, useTailor, DEFAULT_LABELS, type TailorContextValue, type ChangeEntry } from "./context";
export type { LogEntry } from "./client";
```

- [ ] **Step 6: Typecheck**

Run: `pnpm install && pnpm exec tsc -p packages/react`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "React SDK: session, client with debounced decide calls, provider with automatic click and page tracking"
```

---

### Task 7: React SDK: Slot, SlotGroup/Section, Emphasis, Signal

**Files:**
- Create: `packages/react/src/defer.ts`, `packages/react/src/Slot.tsx`, `packages/react/src/SlotGroup.tsx`,
  `packages/react/src/Emphasis.tsx`, `packages/react/src/Signal.tsx`
- Modify: `packages/react/src/index.ts`

**Interfaces:**
- Consumes: `useTailor` (Task 6); `orderSections`, `audienceAtRank` (core).
- Produces:
  - `Slot({ name: string; rank?: 0 | 1; children })` with `Variant({ audience?: AudienceId; default?: boolean; children })`
  - `SlotGroup({ name: string; children })` with `Section({ id: string; title: string; audience?: AudienceId; className?: string; children })`
  - `Emphasis({ audience: AudienceId; children: ReactNode | ((on: boolean) => ReactNode); className?: string; onClassName?: string })`
  - `Signal({ label: string; children })`

- [ ] **Step 1: Viewport helpers** `packages/react/src/defer.ts`

```ts
import { useEffect, type RefObject } from "react";

export function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/**
 * Applies `want` when it's safe: immediately if the element is off screen, when it scrolls out of view, or on the
 * next navigation. Never swaps content the visitor is looking at.
 */
export function useDeferredApply<T>(ref: RefObject<Element | null>, want: T, shown: T, pathname: string, apply: (next: T) => void): void {
  useEffect(() => {
    if (Object.is(want, shown)) return;
    const el = ref.current;
    if (!el || !inViewport(el)) {
      apply(want);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) {
        io.disconnect();
        apply(want);
      }
    });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want, shown]);

  // A navigation means the visitor isn't looking at the old content any more.
  useEffect(() => {
    if (!Object.is(want, shown)) apply(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
```

- [ ] **Step 2: Slot** `packages/react/src/Slot.tsx`

```tsx
"use client";
import { audienceAtRank, type AudienceId } from "@tailor/core";
import { Children, isValidElement, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useTailor } from "./context";
import { useDeferredApply } from "./defer";

export interface VariantProps { audience?: AudienceId; default?: boolean; children: ReactNode }

/** One version of a Slot. Rendered by <Slot>; has no behaviour of its own. */
export function Variant({ children }: VariantProps) {
  return <>{children}</>;
}

type Key = AudienceId | "default";

/** Re-renders one version at a time: the version for the audience at `rank` (0 = primary, 1 = second active). */
export function Slot({ name, rank = 0, children }: { name: string; rank?: 0 | 1; children: ReactNode }) {
  const { decision, pathname, noteChange, lensOpen } = useTailor();
  const variants = Children.toArray(children).filter(isValidElement) as ReactElement<VariantProps>[];
  const keyOf = (v: ReactElement<VariantProps>): Key => v.props.audience ?? "default";
  const target = audienceAtRank(decision, rank);
  const want: Key = variants.some((v) => v.props.audience === target) && target ? target : "default";
  const [shown, setShown] = useState<Key>(want);
  const [flash, setFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDeferredApply(ref, want, shown, pathname, (next) => {
    noteChange(`${name}: ${shown} → ${next}`);
    setShown(next);
    if (lensOpen) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1_800);
    }
  });

  const current = variants.find((v) => keyOf(v) === shown) ?? variants.find((v) => v.props.default) ?? variants[0] ?? null;
  return (
    <div ref={ref} data-tailor-slot={name} data-tailor-variant={shown} className={flash ? "tailor-flash" : undefined}>
      {current}
    </div>
  );
}
```

- [ ] **Step 3: SlotGroup and Section** `packages/react/src/SlotGroup.tsx`

```tsx
"use client";
import { dwellWords, orderSections, type AudienceId } from "@tailor/core";
import { Children, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useTailor } from "./context";

export interface SectionProps { id: string; title: string; audience?: AudienceId; className?: string; children: ReactNode }

const THRESHOLDS = [8_000, 20_000];

/** A named section. Reports reading time (at 8 s and 20 s) while at least half of it is visible. */
export function Section({ id, title, className, children }: SectionProps) {
  const { reportDwell } = useTailor();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let total = 0;
    let since: number | null = null;
    let reported = 0;
    const tick = () => {
      const ms = total + (since !== null ? Date.now() - since : 0);
      while (reported < THRESHOLDS.length && ms >= (THRESHOLDS[reported] ?? Infinity)) {
        reported += 1;
        if (dwellWords(ms)) reportDwell(title, ms);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) since = Date.now();
      else if (since !== null) {
        total += Date.now() - since;
        since = null;
      }
    }, { threshold: 0.5 });
    io.observe(el);
    const interval = setInterval(tick, 1_000);
    return () => {
      io.disconnect();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
  return (
    <section ref={ref} id={id} data-tailor-section={title} className={className}>
      {children}
    </section>
  );
}

/**
 * Reorders its Sections so the active audiences' sections come first. Sections the visitor has already reached (top
 * above the viewport's bottom edge) stay where they are; only sections below the viewport move.
 */
export function SlotGroup({ name, children }: { name: string; children: ReactNode }) {
  const { decision, noteChange, lensOpen } = useTailor();
  const sections = Children.toArray(children).filter(isValidElement) as ReactElement<SectionProps>[];
  const desired = orderSections(sections.map((s) => ({ id: s.props.id, audience: s.props.audience })), decision?.active ?? []).map((s) => s.id);
  const desiredKey = desired.join("|");
  const [order, setOrder] = useState<string[]>(desired);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root || order.join("|") === desiredKey) return;
    const locked: string[] = [];
    for (const id of order) {
      const el = root.querySelector(`[data-tailor-id="${id}"]`);
      if (el && el.getBoundingClientRect().top < window.innerHeight) locked.push(id);
      else break;
    }
    const next = [...locked, ...desired.filter((id) => !locked.includes(id))];
    if (next.join("|") === order.join("|")) return;
    const moved = next.filter((id, i) => order[i] !== id);
    noteChange(`${name}: ${next.join(" › ")}`);
    setOrder(next);
    if (lensOpen) {
      setFlashIds(new Set(moved));
      setTimeout(() => setFlashIds(new Set()), 1_800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredKey]);

  const byId = new Map(sections.map((s) => [s.props.id, s]));
  const ids = [...order.filter((id) => byId.has(id)), ...[...byId.keys()].filter((id) => !order.includes(id))];
  return (
    <div ref={container} data-tailor-group={name}>
      {ids.map((id) => (
        <div key={id} data-tailor-id={id} className={flashIds.has(id) ? "tailor-flash" : undefined}>
          {byId.get(id)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Emphasis and Signal**

`packages/react/src/Emphasis.tsx`:
```tsx
"use client";
import type { AudienceId } from "@tailor/core";
import type { ReactNode } from "react";
import { useTailor } from "./context";

/** Highlights its children when `audience` is the primary audience. Never hides anything. */
export function Emphasis(props: { audience: AudienceId; children: ReactNode | ((on: boolean) => ReactNode); className?: string; onClassName?: string }) {
  const { decision } = useTailor();
  const on = decision?.primary === props.audience;
  const cls = [props.className, on ? props.onClassName : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div data-tailor-emphasis={on ? "on" : "off"} className={cls}>
      {typeof props.children === "function" ? props.children(on) : props.children}
    </div>
  );
}
```

`packages/react/src/Signal.tsx`:
```tsx
"use client";
import type { ReactNode } from "react";
import { useTailor } from "./context";

/** Labels a meaningful action ("copied the install command"). Clicks inside are recorded once, with this label. */
export function Signal({ label, children }: { label: string; children: ReactNode }) {
  const { track } = useTailor();
  return (
    <span data-tailor-signal={label} onClickCapture={() => track(label)} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
```

Update `packages/react/src/index.ts`:
```ts
export { TailorProvider, useTailor, DEFAULT_LABELS, type TailorContextValue, type ChangeEntry } from "./context";
export type { LogEntry } from "./client";
export { Slot, Variant } from "./Slot";
export { SlotGroup, Section } from "./SlotGroup";
export { Emphasis } from "./Emphasis";
export { Signal } from "./Signal";
```

- [ ] **Step 5: Typecheck and commit**

Run: `pnpm exec tsc -p packages/react`
Expected: no errors.
```bash
git add -A && git commit -m "React SDK: Slot, SlotGroup and Section with viewport-safe swaps, Emphasis, Signal"
```

---

### Task 8: React SDK: AudienceSwitcher and TailorLens

**Files:**
- Create: `packages/react/src/AudienceSwitcher.tsx`, `packages/react/src/TailorLens.tsx`
- Modify: `packages/react/src/index.ts`

**Interfaces:**
- Consumes: `useTailor`; `AUDIENCES` (core).
- Produces: `AudienceSwitcher({ className?: string })`, `TailorLens()`.

- [ ] **Step 1: AudienceSwitcher** `packages/react/src/AudienceSwitcher.tsx`

```tsx
"use client";
import { AUDIENCES, type AudienceId } from "@tailor/core";
import { useTailor } from "./context";

/** Shows which view Tailor chose and lets anyone pick another. An explicit pick is pinned until "Auto". */
export function AudienceSwitcher({ className }: { className?: string }) {
  const { decision, pinned, pin, labels } = useTailor();
  const current = decision?.primary ?? null;
  return (
    <label data-tailor-ignore className={className} style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      <span>
        Showing: {current ? `${labels[current]} view` : "Default view"} <span style={{ opacity: 0.6 }}>({pinned ? "pinned" : "auto"})</span>
      </span>
      <select
        aria-label="Choose a view"
        value={pinned ?? "auto"}
        onChange={(e) => pin(e.target.value === "auto" ? null : (e.target.value as AudienceId))}
        style={{ background: "transparent", border: "1px solid currentColor", borderRadius: 6, padding: "2px 6px", color: "inherit" }}
      >
        <option value="auto">Auto</option>
        {AUDIENCES.map((a) => (
          <option key={a} value={a}>{labels[a]}</option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: TailorLens** `packages/react/src/TailorLens.tsx`

```tsx
"use client";
import { AUDIENCES, type AudienceScores } from "@tailor/core";
import { useTailor } from "./context";

const panel: React.CSSProperties = {
  position: "fixed", right: 16, bottom: 16, width: 360, maxHeight: "80vh", overflow: "auto", zIndex: 9999,
  background: "#0b0f19", color: "#e5e7eb", border: "1px solid #334155", borderRadius: 12, padding: 14,
  font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace", boxShadow: "0 20px 50px rgba(0,0,0,.45)",
};
const colors = { developer: "#38bdf8", growth_lead: "#34d399", privacy_reviewer: "#f472b6", investor: "#fbbf24" } as const;

function Bars({ title, scores }: { title: string; scores: AudienceScores | null }) {
  const { labels } = useTailor();
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ opacity: 0.7, marginBottom: 4 }}>{title}</div>
      {scores ? (
        AUDIENCES.map((a) => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 64 }}>{labels[a]}</span>
            <span style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, position: "relative" }}>
              <span style={{ position: "absolute", inset: 0, width: `${Math.round(scores[a] * 100)}%`, background: colors[a], borderRadius: 4 }} />
              <span style={{ position: "absolute", left: "60%", top: -2, bottom: -2, borderLeft: "1px dashed #94a3b8" }} />
            </span>
            <span style={{ width: 34, textAlign: "right" }}>{scores[a].toFixed(2)}</span>
          </div>
        ))
      ) : (
        <div style={{ opacity: 0.5 }}>skipped (no evidence)</div>
      )}
    </div>
  );
}

/** Live view of Tailor's reasoning: each evidence source, the combined read, cost, latency, and what changed. */
export function TailorLens() {
  const { lensOpen, setLensOpen, log, changes, decision, pinned, labels, reset } = useTailor();
  if (!lensOpen) {
    return (
      <button data-tailor-ignore onClick={() => setLensOpen(true)} style={{ ...panel, width: "auto", padding: "8px 12px", cursor: "pointer" }}>
        Tailor Lens
      </button>
    );
  }
  const last = log.at(-1)?.response;
  const totalCost = log.reduce((s, e) => s + e.response.debug.costUsd, 0);
  const avgLatency = log.length ? Math.round(log.reduce((s, e) => s + e.response.debug.latencyMs, 0) / log.length) : 0;
  return (
    <aside data-tailor-ignore style={panel} aria-label="Tailor Lens">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Tailor Lens</strong>
        <span>
          <button onClick={reset} style={{ marginRight: 8, color: "inherit", background: "none", border: "none", cursor: "pointer" }}>reset</button>
          <button onClick={() => setLensOpen(false)} style={{ color: "inherit", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </span>
      </div>
      <div style={{ marginBottom: 10 }}>
        Primary: <strong>{decision?.primary ? labels[decision.primary] : "default page"}</strong>
        {pinned ? " (pinned)" : ""} · Active: {decision?.active.map((a) => labels[a]).join(", ") || "none"}
        <br />
        Talk interest: {(decision?.talkInterest ?? 0).toFixed(2)} {decision && decision.talkInterest >= 0.8 ? "→ alert sent" : ""}
      </div>
      <Bars title={`Arrival ${last?.debug.arrivalCached ? "(cached)" : ""}: ${last?.debug.arrivalState ? JSON.stringify(last.debug.arrivalState) : "none"}`} scores={last?.debug.arrivalScores ?? null} />
      <Bars title="Actions" scores={last?.debug.actionScores ?? null} />
      <Bars title={`Combined (behaviour weight ${last?.debug.weight ?? 0}; cut-off 0.6)`} scores={decision?.p ?? null} />
      <div style={{ marginBottom: 10 }}>
        Last decision: {last ? `${last.debug.latencyMs} ms · ${last.debug.tokens} tokens · $${last.debug.costUsd.toFixed(6)}` : "none yet"}
        {last?.debug.error ? <div style={{ color: "#f87171" }}>Jev error, kept page: {last.debug.error}</div> : null}
        <br />
        Session: {log.length} decisions · avg {avgLatency} ms · total ${totalCost.toFixed(6)}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ opacity: 0.7 }}>Actions Jev saw</div>
        {(last?.debug.actions ?? []).map((a, i) => <div key={i}>· {a}</div>)}
      </div>
      <div>
        <div style={{ opacity: 0.7 }}>What changed</div>
        {changes.length === 0 ? <div style={{ opacity: 0.5 }}>nothing yet</div> : changes.slice(-8).reverse().map((c, i) => <div key={i}>· {c.message}</div>)}
      </div>
    </aside>
  );
}
```

Add `import type React from "react";` at the top of `TailorLens.tsx` for `React.CSSProperties`.

- [ ] **Step 3: Exports, typecheck, commit**

Append to `packages/react/src/index.ts`:
```ts
export { AudienceSwitcher } from "./AudienceSwitcher";
export { TailorLens } from "./TailorLens";
```
Run: `pnpm exec tsc -p packages/react`. Expected: no errors.
```bash
git add -A && git commit -m "React SDK: audience switcher and Tailor Lens"
```

---

### Task 9: Site shell and Home page

**Files:**
- Create: `apps/site/src/components/tailor-root.tsx`, `site-header.tsx`, `site-footer.tsx`, `code-block.tsx`,
  `next-step.tsx`
- Modify: `apps/site/src/app/layout.tsx`, `apps/site/src/app/globals.css`, `apps/site/src/app/page.tsx`

**Interfaces:**
- Consumes: everything exported from `@tailor/react`; `parseDecisionCookie` (core); `SITE_KEY` from
  `@/server/site`. That module is server-only in spirit, but `SITE_KEY` is public, so duplicate the constant in
  `tailor-root.tsx` as `"site_tailor"` rather than importing server code into a client component.
- Produces:
  - `TailorRoot({ initial, children })`
  - `CodeBlock({ code: string; signal: string; lang?: string })`
  - `NextStep()`
  - page titles map: `/` → "Home", `/docs` → "Docs", `/use-cases` → "Use cases", `/privacy` → "Privacy & data",
    `/vision` → "Vision", `/contact` → "Contact", `/demo` → "Demo"

- [ ] **Step 1: Root and layout**

`apps/site/src/components/tailor-root.tsx`:
```tsx
"use client";
import type { Decision } from "@tailor/core";
import { TailorLens, TailorProvider } from "@tailor/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const PAGE_TITLES: Record<string, string> = {
  "/": "Home", "/docs": "Docs", "/use-cases": "Use cases", "/privacy": "Privacy & data", "/vision": "Vision", "/contact": "Contact", "/demo": "Demo",
};

export function TailorRoot({ initial, children }: { initial: Decision | null; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <TailorProvider siteKey="site_tailor" endpoint="/api/tailor/v1/decide" initial={initial} pathname={pathname} pageTitles={PAGE_TITLES}>
      {children}
      <TailorLens />
    </TailorProvider>
  );
}
```

`apps/site/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseDecisionCookie } from "@tailor/core";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TailorRoot } from "@/components/tailor-root";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tailor: every visitor sees the page that fits them",
  description: "Tailor reads each visitor on every click and puts what they came for first. Built on Jev.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = parseDecisionCookie((await cookies()).get("tailor_decision")?.value);
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07090f] text-slate-200 antialiased">
        <TailorRoot initial={initial}>
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-5">{children}</main>
          <SiteFooter />
        </TailorRoot>
      </body>
    </html>
  );
}
```

`apps/site/src/app/globals.css`: keep `@import "tailwindcss";` and add:
```css
@theme { --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace; }
.card { @apply rounded-xl border border-slate-800 bg-slate-900/40 p-5; }
/* Tailwind v4 can't @apply a custom class, so each button spells out its utilities */
.btn-primary { @apply inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition bg-amber-400 text-slate-950 hover:bg-amber-300; }
.btn-ghost { @apply inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition border border-slate-700 hover:border-slate-500; }
.eyebrow { @apply text-xs font-semibold uppercase tracking-widest text-amber-400; }
.emph { @apply ring-2 ring-amber-400/80; }
```

- [ ] **Step 2: Header, footer, code block, next step**

`apps/site/src/components/site-header.tsx`:
```tsx
"use client";
import type { AudienceId } from "@tailor/core";
import { AudienceSwitcher, Emphasis } from "@tailor/react";
import Link from "next/link";

const NAV: { href: string; label: string; audience: AudienceId }[] = [
  { href: "/docs", label: "Docs", audience: "developer" },
  { href: "/use-cases", label: "Use cases", audience: "growth_lead" },
  { href: "/privacy", label: "Privacy & data", audience: "privacy_reviewer" },
  { href: "/vision", label: "Vision", audience: "investor" },
];

export function SiteHeader() {
  return (
    <header data-tailor-section="Navigation" className="sticky top-0 z-40 border-b border-slate-800 bg-[#07090f]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="font-semibold tracking-tight text-white">◐ Tailor</Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          {NAV.map((n) => (
            <Emphasis key={n.href} audience={n.audience}>
              {(on) => (
                <Link href={n.href} className="relative text-slate-300 hover:text-white">
                  {n.label}
                  {on ? <span title="Start here" className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
                </Link>
              )}
            </Emphasis>
          ))}
        </nav>
        <AudienceSwitcher className="ml-auto text-slate-400" />
      </div>
    </header>
  );
}
```

`apps/site/src/components/site-footer.tsx`:
```tsx
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-5xl border-t border-slate-800 px-5 py-8 text-sm text-slate-500">
      Tailor · built at JEVATHON, San Francisco, September 2026 · decisions by{" "}
      <a className="underline" href="https://docs.typesafe.ai">Jev</a> · <Link className="underline" href="/privacy">Privacy & data</Link> ·{" "}
      <Link className="underline" href="/demo">Demo</Link>
    </footer>
  );
}
```

`apps/site/src/components/code-block.tsx`:
```tsx
"use client";
import { Signal } from "@tailor/react";
import { useState } from "react";

export function CodeBlock({ code, signal }: { code: string; signal: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-slate-800 bg-black/60">
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-200"><code>{code}</code></pre>
      <Signal label={signal}>
        <button
          className="absolute right-2 top-2 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-500"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_200);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </Signal>
    </div>
  );
}
```

`apps/site/src/components/next-step.tsx`:
```tsx
"use client";
import { Slot, Variant } from "@tailor/react";
import Link from "next/link";

const Step = ({ href, text }: { href: string; text: string }) => (
  <Link href={href} className="card mt-16 block hover:border-slate-600">
    <span className="eyebrow">Next step</span>
    <span className="mt-1 block text-lg text-white">{text} →</span>
  </Link>
);

export function NextStep() {
  return (
    <Slot name="next-step">
      <Variant default><Step href="/#how-it-works" text="New here? See how Tailor works" /></Variant>
      <Variant audience="developer"><Step href="/docs" text="Read the quickstart" /></Variant>
      <Variant audience="growth_lead"><Step href="/use-cases" text="See what each visitor sees" /></Variant>
      <Variant audience="privacy_reviewer"><Step href="/privacy" text="Read our data practices" /></Variant>
      <Variant audience="investor"><Step href="/vision" text="Read why now" /></Variant>
    </Slot>
  );
}
```

- [ ] **Step 3: Home page** `apps/site/src/app/page.tsx`

```tsx
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
```

- [ ] **Step 4: Run and check by hand**

Run: `pnpm dev`, then open `http://localhost:3000/?tailor_new=1&tailor_lens=1&utm_source=hackernews`.
Expected:
- the Lens shows an arrival read with developer > 0.6;
- after a reload, the hero is "Personalize any React site in five minutes." and Quickstart is the first home section;
- the switcher shows "Developer view (auto)";
- choosing "Investor" in the switcher changes the hero on the next navigation and immediately in the section order
  below the viewport.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Site: shell, header with switcher and emphasis dots, adaptive Home page"
```

---

### Task 10: Docs, Use cases, Privacy, Vision, Contact pages

**Files:**
- Create: `apps/site/src/app/docs/page.tsx`, `use-cases/page.tsx`, `privacy/page.tsx`, `vision/page.tsx`,
  `contact/page.tsx`, `apps/site/src/components/contact-form.tsx`, `apps/site/src/app/api/contact/route.ts`

**Interfaces:**
- Consumes: `Section`, `Signal`, `useTailor` (react); `CodeBlock`, `NextStep`; `sendTalkAlert` (server).
- Produces: pages at the paths in `PAGE_TITLES`; `POST /api/contact` `{ topic, name, email, message }` → `{ ok: true }`.

- [ ] **Step 1: Docs** `apps/site/src/app/docs/page.tsx`

```tsx
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
        <div className="mt-3"><CodeBlock code="npm install @tailor/react" signal="copied the install command" /></div>
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
```

- [ ] **Step 2: Use cases** `apps/site/src/app/use-cases/page.tsx`

```tsx
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
```

- [ ] **Step 3: Privacy** `apps/site/src/app/privacy/page.tsx`

```tsx
import { Section, Signal } from "@tailor/react";
import Link from "next/link";
import { NextStep } from "@/components/next-step";

const ITEMS = [
  ["What we collect", "Clicks on links and buttons, which sections you read and roughly for how long (in words, not seconds), the page you landed on, and the referring site's domain or campaign tags. Only for this browser tab's session."],
  ["What we don't collect", "No names, emails, IP-based identity, device fingerprints or cross-site tracking. We never infer protected traits such as age, gender, ethnicity or health."],
  ["Cookies", "One first-party cookie, tailor_decision, holding the current view (for example 'developer') so the next page renders without flicker. It's a session cookie: it ends when you close the browser."],
  ["Data retention", "Your session lives in your browser's session storage. Our server is stateless: it reads the session with each request and keeps nothing afterwards, apart from a cache of anonymous arrival reads keyed by campaign tags."],
  ["Subprocessors", "Vercel hosts the site and routes model calls through Vercel AI Gateway. TypeSafe runs Jev, which receives the anonymous actions list and arrival tags."],
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
```

- [ ] **Step 4: Vision** `apps/site/src/app/vision/page.tsx`

```tsx
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
        <p className="mt-2 text-slate-400">Deciding on every click was possible with LLMs but uneconomic: TypeSafe's published benchmark puts an LLM workflow at 8.566 s and $0.013880 against Jev at 0.114 s and $0.000081. Calibrated System One models also say when they aren't sure, which is what makes it safe to change a live page.</p>
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
```

- [ ] **Step 5: Contact form and route**

`apps/site/src/components/contact-form.tsx`:
```tsx
"use client";
import { useTailor } from "@tailor/react";
import { useState } from "react";

export function ContactForm({ topic }: { topic: string }) {
  const { track, decision } = useTailor();
  const [sent, setSent] = useState(false);
  if (sent) return <p className="card text-white">Thanks. We'll be in touch shortly.</p>;
  return (
    <form
      className="card mt-6 grid max-w-lg gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        track(`submitted the contact form about ${topic}`);
        await fetch("/api/contact", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic, name: form.get("name"), email: form.get("email"), message: form.get("message"), audiences: decision?.active ?? [] }),
        });
        setSent(true);
      }}
    >
      <input required name="name" placeholder="Name" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <input required type="email" name="email" placeholder="Work email" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <textarea name="message" placeholder="What would you like to talk about?" className="rounded border border-slate-700 bg-transparent px-3 py-2" />
      <button className="btn-primary justify-center">Send</button>
    </form>
  );
}
```

`apps/site/src/app/contact/page.tsx`:
```tsx
import { ContactForm } from "@/components/contact-form";

const TITLES: Record<string, string> = { walkthrough: "Book a walkthrough", founders: "Talk to the founders", "data-summary": "Request our data summary" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const topic = (await searchParams).topic ?? "general";
  return (
    <div className="pt-16">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">{TITLES[topic] ?? "Get in touch"}</h1>
      <ContactForm topic={topic} />
    </div>
  );
}
```

`apps/site/src/app/api/contact/route.ts`:
```ts
import { sendTalkAlert } from "@/server/alert";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.email !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  const audiences = Array.isArray(body.audiences) ? body.audiences.filter((a) => typeof a === "string").join(", ") : "";
  await sendTalkAlert(`Tailor contact (${s(body.topic)}) from ${s(body.name)} <${s(body.email)}> [${audiences || "no audience"}]: ${s(body.message)}`);
  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Run and check by hand**

Run: `pnpm dev`. Open `/?tailor_new=1&tailor_lens=1` (no UTM).
Expected:
- the Lens says "Arrival … none" / "skipped";
- after going to Docs and clicking Copy on the install command, the Lens shows actions including "copied the install
  command" and developer rising;
- back on Home, the hero is the developer version;
- submitting the contact form logs `[tailor alert] Tailor contact …` in the dev server output.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Site: Docs, Use cases, Privacy, Vision and Contact pages with real signals"
```

---

### Task 11: /demo launcher, tuning, deploy

**Files:**
- Create: `apps/site/src/app/demo/page.tsx`
- Modify: `packages/core/src/combine.ts` constants (only if tuning requires it; update the tests to match)

**Interfaces:**
- Consumes: `qrcode`.
- Produces: `/demo` listing L0–L6 with QR codes; a public Vercel URL.

- [ ] **Step 1: Demo launcher** `apps/site/src/app/demo/page.tsx`

```tsx
import { headers } from "next/headers";
import QRCode from "qrcode";

const LINKS = [
  { id: "L0", path: "/", simulates: "Typed the URL (no referrer)", expect: "Default page; arrival skipped" },
  { id: "L1", path: "/?utm_source=hackernews", simulates: "Hacker News post", expect: "Developer" },
  { id: "L2", path: "/?utm_source=github&utm_campaign=readme", simulates: "GitHub README link", expect: "Developer" },
  { id: "L3", path: "/?utm_source=linkedin&utm_campaign=website-conversion", simulates: "LinkedIn ad", expect: "Growth lead" },
  { id: "L4", path: "/?utm_source=google&utm_term=website+personalization+gdpr+cookies", simulates: "Google search", expect: "Privacy reviewer" },
  { id: "L5", path: "/?utm_source=vc-newsletter&utm_campaign=seed-deals", simulates: "VC newsletter", expect: "Investor" },
  { id: "L6", path: "/docs?utm_source=vc-newsletter", simulates: "Investor who lands on the docs", expect: "Investor, then developer too" },
];

const withFlags = (path: string, lens: boolean) => `${path}${path.includes("?") ? "&" : "?"}tailor_new=1${lens ? "&tailor_lens=1" : ""}`;

export default async function Demo() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const rows = await Promise.all(LINKS.map(async (l) => ({ ...l, url: origin + withFlags(l.path, false), qr: await QRCode.toString(origin + withFlags(l.path, false), { type: "svg", margin: 1, width: 132 }) })));
  return (
    <div className="pt-16">
      <p className="eyebrow">Demo</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Try Tailor as different visitors</h1>
      <p className="mt-3 text-slate-400">Each link starts a fresh session. Open two windows side by side (one private), turn on the Lens, and follow the scenarios in the spec.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="card flex gap-4">
            <div className="shrink-0 rounded bg-white p-1" dangerouslySetInnerHTML={{ __html: r.qr }} />
            <div className="text-sm">
              <div className="text-white"><strong>{r.id}</strong> · {r.simulates}</div>
              <div className="mt-1 text-slate-400">Expected first read: {r.expect}</div>
              <div className="mt-2 flex gap-3">
                <a className="text-amber-400" href={r.url}>Open</a>
                <a className="text-amber-400" href={origin + withFlags(r.path, true)}>Open with Lens</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the scenarios locally and tune**

Run `pnpm dev` and walk scenarios 1–7 from spec §7.4 using `/demo`. For each, check the expected read in the Lens. If
an intended audience doesn't clear 0.6 after its interactions, change `ACTIVE_THRESHOLD` / `ACTION_WEIGHTS` in
`packages/core/src/combine.ts` and the matching tests, rerun `pnpm test`, and note the observed values in the commit.

- [ ] **Step 3: Deploy to Vercel**

Use the `vercel:deploy` skill. Requirements:
- the project is named `tailor`, linked at the repo root, with **Root Directory `apps/site`** so pnpm installs the
  workspace;
- the env var `AI_GATEWAY_API_KEY` (from the root `.env`) is set for Production and Preview.

Then open `<url>/demo` and run L1 once.
Expected: the Lens shows a live arrival read.

- [ ] **Step 4: Commit and open the pull request**

```bash
git add -A && git commit -m "Demo launcher with entry links and QR codes; tuned thresholds"
git push -u origin feat/tailor-mvp
gh pr create --title "Tailor MVP: adaptive website SDK on Jev" --body "Implements docs/superpowers/specs/2026-09-26-tailor-design.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

### Task 12 (P1, planned when reached): Photon iMessage alert

`sendTalkAlert` already posts `{ text }` to `TAILOR_ALERT_WEBHOOK_URL`. When we get here, look up Photon's current
send-message API (Context7 or photon.codes docs). Then add either a small Photon adapter in `apps/site/src/server/alert.ts`
that runs when `PHOTON_*` env vars are set, or a relay that accepts `{ text }`. Verify by triggering scenario 3. This
task is detailed at execution time because Photon's API wasn't read during planning.

### Stretch (P2, not planned today)

Browserbase simulated visitors (`tools/eval`) and GMI Cloud drafting of page versions (`tools/variants`), per spec §8.
