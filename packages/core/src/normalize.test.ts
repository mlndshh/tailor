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
