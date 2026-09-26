import { actionWeight, blend, chooseActive, emptyDecision } from "./combine";
import { normalizeActions, normalizeArrival } from "./normalize";
import { actionsRequest, arrivalRequest, type JevRequest } from "./questions";
import { AUDIENCES, type AudienceScores, type DecideRequest, type DecideResponse, type Decision } from "./types";

export const JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

export type JevAsk = (req: JevRequest) => Promise<{ answers: Record<string, { noul: number }>; usage: { input_tokens: number } }>;

export interface DecideDeps {
  ask: JevAsk;
  /** Arrival reads keyed by normalized arrival. Jev is self-consistent, so they're safe to share across visitors. */
  arrivalCache: Map<string, AudienceScores>;
  now?: () => number;
  selfHost?: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function scoresFrom(answers: Record<string, { noul: number }>): AudienceScores {
  return Object.fromEntries(AUDIENCES.map((a) => [a, clamp01(answers[a]?.noul ?? 0)])) as AudienceScores;
}

export async function decide(req: DecideRequest, deps: DecideDeps): Promise<DecideResponse> {
  const now = deps.now ?? Date.now;
  const started = now();
  const arrivalState = normalizeArrival(req.arrival, deps.selfHost);
  const actions = normalizeActions(req.events);
  const errors: string[] = [];
  let tokens = 0;

  const cacheKey = arrivalState ? JSON.stringify(arrivalState) : null;
  const cached = cacheKey ? (deps.arrivalCache.get(cacheKey) ?? null) : null;

  const arrivalPromise: Promise<AudienceScores | null> =
    arrivalState && cacheKey && !cached
      ? deps.ask(arrivalRequest(arrivalState)).then(
          (r) => {
            tokens += r.usage.input_tokens;
            const scores = scoresFrom(r.answers);
            deps.arrivalCache.set(cacheKey, scores);
            return scores;
          },
          (e) => {
            errors.push(`arrival: ${message(e)}`);
            return null;
          },
        )
      : Promise.resolve(cached);

  const actionsPromise: Promise<{ scores: AudienceScores; talk: number } | null> =
    actions.length > 0
      ? deps.ask(actionsRequest(actions)).then(
          (r) => {
            tokens += r.usage.input_tokens;
            return { scores: scoresFrom(r.answers), talk: clamp01(r.answers.talk_interest?.noul ?? 0) };
          },
          (e) => {
            errors.push(`actions: ${message(e)}`);
            return null;
          },
        )
      : Promise.resolve(null);

  const [arrivalScores, actionResult] = await Promise.all([arrivalPromise, actionsPromise]);
  const debugBase = {
    arrivalState, actions, arrivalScores, actionScores: actionResult?.scores ?? null,
    tokens, costUsd: tokens * JEV_USD_PER_INPUT_TOKEN, arrivalCached: cached !== null,
    error: errors.length > 0 ? errors.join("; ") : null,
  };

  // A failed read must not undo an earlier decision: keep the page as it is.
  if (errors.length > 0 && req.previous) {
    return { decision: req.previous, debug: { ...debugBase, weight: 0, latencyMs: now() - started } };
  }

  const w = actionResult ? actionWeight(actions.length, arrivalScores !== null) : 0;
  const p = blend(arrivalScores, actionResult?.scores ?? null, w);
  const { primary, active } = chooseActive(p, req.previous?.primary ?? null);
  const base: Decision = req.previous ?? emptyDecision();
  const decision: Decision = {
    primary, active, p,
    talkInterest: actionResult?.talk ?? base.talkInterest,
    version: base.version + 1,
  };
  return { decision, debug: { ...debugBase, weight: w, latencyMs: now() - started } };
}
