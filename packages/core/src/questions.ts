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
