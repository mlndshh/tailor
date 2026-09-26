import type { Arrival, NormalizedArrival, RawEvent } from "./types";

export const MAX_EVENTS = 50;
export const MAX_ACTIONS = 12;
export const MAX_TEXT = 80;

export function clip(text: string, max = MAX_TEXT): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

function referrerDomain(referrer: string | null, selfHost?: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || (selfHost && host === selfHost.replace(/^www\./, ""))) return null;
    return clip(host);
  } catch {
    return null;
  }
}

/** Arrival evidence Jev may see, or null when there is none (then the arrival request is skipped). */
export function normalizeArrival(arrival: Arrival, selfHost?: string): NormalizedArrival | null {
  const source = arrival.utm_source ? clip(arrival.utm_source) : referrerDomain(arrival.referrer, selfHost);
  const campaign = arrival.utm_campaign ? clip(arrival.utm_campaign) : null;
  const search_terms = arrival.utm_term ? clip(arrival.utm_term.replace(/\+/g, " ")) : null;
  if (!source && !campaign && !search_terms) return null;
  return { source, campaign, search_terms, landing_page: clip(arrival.landingPath || "/") };
}

export function dwellWords(ms: number): string | null {
  if (ms >= 20_000) return "for a long time";
  if (ms >= 8_000) return "for a while";
  return null;
}

function describe(event: RawEvent): string | null {
  switch (event.kind) {
    case "page":
      return `opened the ${clip(event.title, 60)} page`;
    case "click":
      return event.section ? `clicked '${clip(event.label, 40)}' in '${clip(event.section, 30)}'` : `clicked '${clip(event.label, 60)}'`;
    case "signal":
      return clip(event.label);
    case "dwell": {
      const words = dwellWords(event.ms);
      return words ? `read '${clip(event.section, 50)}' ${words}` : null;
    }
  }
}

/** Raw events → short phrases for Jev. Counts become words; only meaningful actions survive. */
export function normalizeActions(events: RawEvent[]): string[] {
  const recent = events.slice(-MAX_EVENTS);
  const longestDwell = new Map<string, number>();
  for (const e of recent) if (e.kind === "dwell") longestDwell.set(e.section, Math.max(longestDwell.get(e.section) ?? 0, e.ms));

  const order: string[] = [];
  const counts = new Map<string, number>();
  const dwellDone = new Set<string>();
  for (const e of recent) {
    if (e.kind === "dwell") {
      if (dwellDone.has(e.section) || e.ms < (longestDwell.get(e.section) ?? 0)) continue;
      dwellDone.add(e.section);
    }
    const phrase = describe(e);
    if (!phrase) continue;
    if (!counts.has(phrase)) order.push(phrase);
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return order
    .map((phrase) => ((counts.get(phrase) ?? 0) > 1 ? clip(`${phrase} more than once`, MAX_TEXT + 20) : phrase))
    .slice(-MAX_ACTIONS);
}
