import { applyPin, MAX_EVENTS, type AudienceId, type DecideResponse, type Decision, type RawEvent } from "@tailor/core";
import { saveSession, startSession, writeDecisionCookie, type TailorSession } from "./session";

export interface LogEntry { at: number; response: DecideResponse }

/** Owns the session, the event queue and the decide calls. At most one request is in flight; the latest state wins. */
export class TailorClient {
  session: TailorSession;
  log: LogEntry[] = [];
  private inFlight = false;
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();

  constructor(private readonly opts: { siteKey: string; endpoint: string; debounceMs?: number }) {
    const { session, isNew } = startSession();
    this.session = session;
    if (isNew) void this.send(); // arrival-only read right away
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  effective(): Decision | null {
    return applyPin(this.session.decision, this.session.pinned);
  }

  record(event: RawEvent): void {
    this.session.events = [...this.session.events, event].slice(-MAX_EVENTS);
    saveSession(this.session);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.send(), this.opts.debounceMs ?? 600);
  }

  pin(audience: AudienceId | null): void {
    this.session.pinned = audience;
    saveSession(this.session);
    writeDecisionCookie(this.effective());
    this.emit();
  }

  setLens(open: boolean): void {
    this.session.lens = open;
    saveSession(this.session);
    this.emit();
  }

  reset(): void {
    this.session = startSession(true).session;
    this.log = [];
    this.emit();
  }

  private async send(): Promise<void> {
    if (this.inFlight) {
      this.pending = true;
      return;
    }
    this.inFlight = true;
    const s = this.session;
    try {
      const res = await fetch(this.opts.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteKey: this.opts.siteKey, sessionId: s.id, arrival: s.arrival, events: s.events, previous: s.decision }),
      });
      if (res.ok && s === this.session) {
        const data = (await res.json()) as DecideResponse;
        s.decision = data.decision;
        saveSession(s);
        writeDecisionCookie(this.effective());
        this.log = [...this.log, { at: Date.now(), response: data }].slice(-30);
        this.emit();
      }
    } catch {
      // Network failure: keep the current page.
    } finally {
      this.inFlight = false;
      if (this.pending) {
        this.pending = false;
        void this.send();
      }
    }
  }
}
