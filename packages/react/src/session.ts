import type { Arrival, AudienceId, Decision, RawEvent } from "@tailor/core";

export interface TailorSession {
  id: string;
  arrival: Arrival;
  events: RawEvent[];
  /** The server's (unpinned) decision; sent back as `previous` for hysteresis. */
  decision: Decision | null;
  pinned: AudienceId | null;
  lens: boolean;
}

const KEY = "tailor:session";
let memory: TailorSession | null = null; // used when sessionStorage is unavailable (private mode, blocked storage)

function read(): TailorSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TailorSession) : memory;
  } catch {
    return memory;
  }
}

export function saveSession(session: TailorSession): void {
  memory = session;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* in-memory only */
  }
}

function captureArrival(): Arrival {
  const params = new URLSearchParams(window.location.search);
  let referrer: string | null = document.referrer || null;
  try {
    if (referrer && new URL(referrer).host === window.location.host) referrer = null;
  } catch {
    referrer = null;
  }
  return {
    referrer,
    utm_source: params.get("utm_source"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    landingPath: window.location.pathname,
  };
}

/** Loads this tab's session, or starts one. `?tailor_new=1` forces a fresh session (used by demo links). */
export function startSession(forceNew = false): { session: TailorSession; isNew: boolean } {
  const url = new URL(window.location.href);
  const wantsNew = forceNew || url.searchParams.has("tailor_new");
  const wantsLens = url.searchParams.has("tailor_lens");
  if (url.searchParams.has("tailor_new") || url.searchParams.has("tailor_lens")) {
    url.searchParams.delete("tailor_new");
    url.searchParams.delete("tailor_lens");
    window.history.replaceState(window.history.state, "", url);
  }
  const existing = wantsNew ? null : read();
  if (existing) {
    if (wantsLens) existing.lens = true;
    return { session: existing, isNew: false };
  }
  const newId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  const session: TailorSession = {
    id: newId, arrival: captureArrival(), events: [], decision: null, pinned: null, lens: wantsLens,
  };
  if (wantsNew) writeDecisionCookie(null);
  saveSession(session);
  return { session, isNew: true };
}

/** The effective decision, for the server layout's first render on the next navigation. */
export function writeDecisionCookie(decision: Decision | null): void {
  document.cookie = decision
    ? `tailor_decision=${encodeURIComponent(JSON.stringify(decision))}; path=/; samesite=lax`
    : "tailor_decision=; path=/; max-age=0; samesite=lax";
}
