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
