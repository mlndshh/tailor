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
