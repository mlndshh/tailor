"use client";
import { AUDIENCES, type AudienceId, type Decision } from "@tailor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { TailorClient, type LogEntry } from "./client";
import { FLASH_CSS } from "./styles";

export interface ChangeEntry { at: number; message: string }

export interface TailorContextValue {
  decision: Decision | null;
  pinned: AudienceId | null;
  labels: Record<AudienceId, string>;
  log: LogEntry[];
  changes: ChangeEntry[];
  lensOpen: boolean;
  pathname: string;
  setLensOpen(open: boolean): void;
  track(label: string): void;
  reportDwell(section: string, ms: number): void;
  pin(audience: AudienceId | null): void;
  reset(): void;
  noteChange(message: string): void;
}

export const DEFAULT_LABELS: Record<AudienceId, string> = {
  developer: "Developer", growth_lead: "Growth", privacy_reviewer: "Privacy", investor: "Investor",
};

const Ctx = createContext<TailorContextValue | null>(null);

export function useTailor(): TailorContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useTailor must be used inside <TailorProvider>");
  return value;
}

function clickTarget(event: MouseEvent): { label: string; section: string | null } | null {
  const el = (event.target as Element | null)?.closest?.("a,button,summary,[role=button],[role=tab]");
  if (!el || el.closest("[data-tailor-ignore],[data-tailor-signal]")) return null;
  const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!label) return null;
  return { label, section: el.closest("[data-tailor-section]")?.getAttribute("data-tailor-section") ?? null };
}

export function TailorProvider(props: {
  siteKey: string;
  endpoint: string;
  initial: Decision | null;
  pathname?: string;
  pageTitles?: Record<string, string>;
  labels?: Partial<Record<AudienceId, string>>;
  children: ReactNode;
}) {
  const { siteKey, endpoint, initial, pageTitles, children } = props;
  const pathname = props.pathname ?? "/";
  const clientRef = useRef<TailorClient | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const client = new TailorClient({ siteKey, endpoint });
    clientRef.current = client;
    const off = client.subscribe(rerender);
    setMounted(true);
    const onClick = (e: MouseEvent) => {
      const t = clickTarget(e);
      if (t) client.record({ kind: "click", label: t.label, section: t.section, at: Date.now() });
    };
    document.addEventListener("click", onClick, true);
    return () => {
      off();
      document.removeEventListener("click", onClick, true);
    };
  }, [siteKey, endpoint]);

  // Page views after the landing page (the landing page is part of arrival, not an action).
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    if (lastPath.current !== null && lastPath.current !== pathname) {
      client.record({ kind: "page", path: pathname, title: pageTitles?.[pathname] ?? pathname, at: Date.now() });
    }
    lastPath.current = pathname;
  }, [pathname, mounted, pageTitles]);

  const client = clientRef.current;
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...props.labels }), [props.labels]);
  const noteChange = useCallback((message: string) => setChanges((c) => [...c, { at: Date.now(), message }].slice(-20)), []);

  const value: TailorContextValue = {
    // Before mount, render exactly what the server rendered (from the cookie) so hydration matches.
    decision: mounted && client ? (client.effective() ?? null) : initial,
    pinned: client?.session.pinned ?? null,
    labels,
    log: client?.log ?? [],
    changes,
    lensOpen: client?.session.lens ?? false,
    pathname,
    setLensOpen: (open) => client?.setLens(open),
    track: (label) => client?.record({ kind: "signal", label, at: Date.now() }),
    reportDwell: (section, ms) => client?.record({ kind: "dwell", section, ms, at: Date.now() }),
    pin: (a) => client?.pin(a),
    reset: () => {
      client?.reset();
      setChanges([]);
    },
    noteChange,
  };

  return (
    <Ctx.Provider value={value}>
      <style>{FLASH_CSS}</style>
      {children}
    </Ctx.Provider>
  );
}

export { AUDIENCES };
