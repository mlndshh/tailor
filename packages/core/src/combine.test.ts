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
