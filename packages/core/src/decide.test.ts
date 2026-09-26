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
