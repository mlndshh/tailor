"use client";
import { AUDIENCES, type AudienceId } from "@tailor/core";
import { useTailor } from "@tailor/react";

const LABELS: Record<AudienceId, string> = {
  developer: "Developer",
  growth_lead: "Growth lead",
  privacy_reviewer: "Privacy reviewer",
  investor: "Investor",
};

/** Tailor's live read of this visit, drawn as tape measures. It dogfoods the same decision the page adapts to. */
export function FittingPanel() {
  const { decision, log } = useTailor();
  const p = decision?.p;
  const actions = log.at(-1)?.response.debug.actions.length ?? 0;
  const fitted = decision?.active ?? [];

  const status =
    fitted.length > 0
      ? `Fitted for ${fitted.map((a) => LABELS[a].toLowerCase()).join(" and ")}.`
      : actions > 0
        ? "Not sure yet. Keep clicking: every link, tab and copy button is a measurement."
        : "Taking your measurements. Click around the site and watch these move.";

  return (
    <aside
      aria-label="Tailor's live read of this visit"
      className="rounded-2xl border border-dashed border-stitch bg-denim-2/90 p-6 shadow-[0_24px_60px_rgb(0_0_0/0.35)]"
    >
      <h2 className="font-display text-3xl text-chalk">Your fitting</h2>
      <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted" aria-live="polite">
        {status}
      </p>
      <div className="mt-5 space-y-4">
        {AUDIENCES.map((a) => {
          const value = p?.[a] ?? 0;
          const on = fitted.includes(a);
          return (
            <div key={a}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className={on ? "font-semibold text-chalk" : "text-muted"}>{LABELS[a]}</span>
                <span className="font-mono text-xs text-muted">{p ? value.toFixed(2) : "0.00"}</span>
              </div>
              <div className="tape-track">
                <div className="tape-fill" style={{ width: `${Math.round(value * 100)}%` }} />
                <div className="tape-seam" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted">
        <span className="text-thread">Red seam</span>: Tailor only changes the page past 0.5. Open the Lens, bottom right, for
        every reading.
      </p>
    </aside>
  );
}
