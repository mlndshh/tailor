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
