"use client";
import { dwellWords, orderSections, type AudienceId } from "@tailor/core";
import { Children, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useTailor } from "./context";

export interface SectionProps { id: string; title: string; audience?: AudienceId; className?: string; children: ReactNode }

const THRESHOLDS = [8_000, 20_000];

/** A named section. Reports reading time (at 8 s and 20 s) while at least half of it is visible. */
export function Section({ id, title, className, children }: SectionProps) {
  const { reportDwell } = useTailor();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let total = 0;
    let since: number | null = null;
    let reported = 0;
    const tick = () => {
      const ms = total + (since !== null ? Date.now() - since : 0);
      while (reported < THRESHOLDS.length && ms >= (THRESHOLDS[reported] ?? Infinity)) {
        reported += 1;
        if (dwellWords(ms)) reportDwell(title, ms);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) since = Date.now();
      else if (since !== null) {
        total += Date.now() - since;
        since = null;
      }
    }, { threshold: 0.5 });
    io.observe(el);
    const interval = setInterval(tick, 1_000);
    return () => {
      io.disconnect();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
  return (
    <section ref={ref} id={id} data-tailor-section={title} className={className}>
      {children}
    </section>
  );
}

/**
 * Reorders its Sections so the active audiences' sections come first. Sections the visitor has already reached (top
 * above the viewport's bottom edge) stay where they are; only sections below the viewport move.
 */
export function SlotGroup({ name, children }: { name: string; children: ReactNode }) {
  const { decision, noteChange, lensOpen } = useTailor();
  const sections = Children.toArray(children).filter(isValidElement) as ReactElement<SectionProps>[];
  const desired = orderSections(sections.map((s) => ({ id: s.props.id, audience: s.props.audience })), decision?.active ?? []).map((s: { id: string }) => s.id);
  const desiredKey = desired.join("|");
  const [order, setOrder] = useState<string[]>(desired);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root || order.join("|") === desiredKey) return;
    const locked: string[] = [];
    for (const id of order) {
      const el = root.querySelector(`[data-tailor-id="${id}"]`);
      if (el && el.getBoundingClientRect().top < window.innerHeight) locked.push(id);
      else break;
    }
    const next = [...locked, ...desired.filter((id: string) => !locked.includes(id))];
    if (next.join("|") === order.join("|")) return;
    const moved = next.filter((id, i) => order[i] !== id);
    noteChange(`${name}: ${next.join(" › ")}`);
    setOrder(next);
    if (lensOpen) {
      setFlashIds(new Set(moved));
      setTimeout(() => setFlashIds(new Set()), 1_800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredKey]);

  const byId = new Map(sections.map((s) => [s.props.id, s]));
  const ids = [...order.filter((id) => byId.has(id)), ...[...byId.keys()].filter((id) => !order.includes(id))];
  return (
    <div ref={container} data-tailor-group={name}>
      {ids.map((id) => (
        <div key={id} data-tailor-id={id} className={flashIds.has(id) ? "tailor-flash" : undefined}>
          {byId.get(id)}
        </div>
      ))}
    </div>
  );
}
