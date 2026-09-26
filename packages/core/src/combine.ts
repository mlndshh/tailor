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
