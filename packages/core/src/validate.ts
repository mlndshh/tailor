import { MAX_EVENTS } from "./normalize";
import { AUDIENCES, type Arrival, type AudienceId, type DecideRequest, type Decision, type RawEvent } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isAudience = (v: unknown): v is AudienceId => typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);

function parseEvent(v: unknown): RawEvent | null {
  if (!isObj(v)) return null;
  const at = num(v.at) ?? 0;
  switch (v.kind) {
    case "page": {
      const path = str(v.path), title = str(v.title);
      return path !== null && title !== null ? { kind: "page", path, title, at } : null;
    }
    case "click": {
      const label = str(v.label);
      return label !== null ? { kind: "click", label, section: str(v.section), at } : null;
    }
    case "dwell": {
      const section = str(v.section), ms = num(v.ms);
      return section !== null && ms !== null && ms >= 0 ? { kind: "dwell", section, ms, at } : null;
    }
    case "signal": {
      const label = str(v.label);
      return label !== null ? { kind: "signal", label, at } : null;
    }
    default:
      return null;
  }
}

export function parseDecision(v: unknown): Decision | null {
  if (!isObj(v) || !isObj(v.p)) return null;
  const primary = v.primary === null ? null : isAudience(v.primary) ? v.primary : undefined;
  if (primary === undefined || !Array.isArray(v.active)) return null;
  const p = v.p;
  const scores = { developer: num(p.developer), growth_lead: num(p.growth_lead), privacy_reviewer: num(p.privacy_reviewer), investor: num(p.investor) };
  if (Object.values(scores).some((x) => x === null)) return null;
  return {
    primary,
    active: v.active.filter(isAudience),
    p: scores as Decision["p"],
    talkInterest: num(v.talkInterest) ?? 0,
    version: num(v.version) ?? 0,
  };
}

export function parseDecisionCookie(value: string | null | undefined): Decision | null {
  if (!value) return null;
  try {
    return parseDecision(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

export function parseDecideRequest(input: unknown): DecideRequest | null {
  if (!isObj(input) || !isObj(input.arrival) || !Array.isArray(input.events)) return null;
  const siteKey = str(input.siteKey, 64), sessionId = str(input.sessionId, 64);
  const landingPath = str(input.arrival.landingPath);
  if (!siteKey || !sessionId || landingPath === null) return null;
  const a = input.arrival;
  const arrival: Arrival = {
    referrer: str(a.referrer, 500), utm_source: str(a.utm_source), utm_campaign: str(a.utm_campaign), utm_term: str(a.utm_term), landingPath,
  };
  const events = input.events.slice(-MAX_EVENTS * 2).map(parseEvent).filter((e): e is RawEvent => e !== null).slice(-MAX_EVENTS);
  return { siteKey, sessionId, arrival, events, previous: parseDecision(input.previous) };
}
