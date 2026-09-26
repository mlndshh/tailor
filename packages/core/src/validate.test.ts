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
