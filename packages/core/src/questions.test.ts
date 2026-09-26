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
