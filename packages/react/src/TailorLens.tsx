"use client";
import { AUDIENCES, type AudienceScores } from "@tailor/core";
import type React from "react";
import { useTailor } from "./context";

const panel: React.CSSProperties = {
  position: "fixed", right: 16, bottom: 16, width: 360, maxHeight: "80vh", overflow: "auto", zIndex: 9999,
  background: "#0b0f19", color: "#e5e7eb", border: "1px solid #334155", borderRadius: 12, padding: 14,
  font: "12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace", boxShadow: "0 20px 50px rgba(0,0,0,.45)",
};
const colors = { developer: "#38bdf8", growth_lead: "#34d399", privacy_reviewer: "#f472b6", investor: "#fbbf24" } as const;

function Bars({ title, scores }: { title: string; scores: AudienceScores | null }) {
  const { labels } = useTailor();
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ opacity: 0.7, marginBottom: 4 }}>{title}</div>
      {scores ? (
        AUDIENCES.map((a) => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 64 }}>{labels[a]}</span>
            <span style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, position: "relative" }}>
              <span style={{ position: "absolute", inset: 0, width: `${Math.round(scores[a] * 100)}%`, background: colors[a], borderRadius: 4 }} />
              <span style={{ position: "absolute", left: "60%", top: -2, bottom: -2, borderLeft: "1px dashed #94a3b8" }} />
            </span>
            <span style={{ width: 34, textAlign: "right" }}>{scores[a].toFixed(2)}</span>
          </div>
        ))
      ) : (
        <div style={{ opacity: 0.5 }}>skipped (no evidence)</div>
      )}
    </div>
  );
}

/** Live view of Tailor's reasoning: each evidence source, the combined read, cost, latency, and what changed. */
export function TailorLens() {
  const { lensOpen, setLensOpen, log, changes, decision, pinned, labels, reset } = useTailor();
  if (!lensOpen) {
    return (
      <button data-tailor-ignore onClick={() => setLensOpen(true)} style={{ ...panel, width: "auto", padding: "8px 12px", cursor: "pointer" }}>
        Tailor Lens
      </button>
    );
  }
  const last = log.at(-1)?.response;
  const totalCost = log.reduce((s, e) => s + e.response.debug.costUsd, 0);
  const avgLatency = log.length ? Math.round(log.reduce((s, e) => s + e.response.debug.latencyMs, 0) / log.length) : 0;
  return (
    <aside data-tailor-ignore style={panel} aria-label="Tailor Lens">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Tailor Lens</strong>
        <span>
          <button onClick={reset} style={{ marginRight: 8, color: "inherit", background: "none", border: "none", cursor: "pointer" }}>reset</button>
          <button onClick={() => setLensOpen(false)} style={{ color: "inherit", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </span>
      </div>
      <div style={{ marginBottom: 10 }}>
        Primary: <strong>{decision?.primary ? labels[decision.primary] : "default page"}</strong>
        {pinned ? " (pinned)" : ""} · Active: {decision?.active.map((a) => labels[a]).join(", ") || "none"}
        <br />
        Talk interest: {(decision?.talkInterest ?? 0).toFixed(2)} {decision && decision.talkInterest >= 0.8 ? "→ alert sent" : ""}
      </div>
      <Bars title={`Arrival ${last?.debug.arrivalCached ? "(cached)" : ""}: ${last?.debug.arrivalState ? JSON.stringify(last.debug.arrivalState) : "none"}`} scores={last?.debug.arrivalScores ?? null} />
      <Bars title="Actions" scores={last?.debug.actionScores ?? null} />
      <Bars title={`Combined (behaviour weight ${last?.debug.weight ?? 0}; cut-off 0.6)`} scores={decision?.p ?? null} />
      <div style={{ marginBottom: 10 }}>
        Last decision: {last ? `${last.debug.latencyMs} ms · ${last.debug.tokens} tokens · $${last.debug.costUsd.toFixed(6)}` : "none yet"}
        {last?.debug.error ? <div style={{ color: "#f87171" }}>Jev error, kept page: {last.debug.error}</div> : null}
        <br />
        Session: {log.length} decisions · avg {avgLatency} ms · total ${totalCost.toFixed(6)}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ opacity: 0.7 }}>Actions Jev saw</div>
        {(last?.debug.actions ?? []).map((a, i) => <div key={i}>· {a}</div>)}
      </div>
      <div>
        <div style={{ opacity: 0.7 }}>What changed</div>
        {changes.length === 0 ? <div style={{ opacity: 0.5 }}>nothing yet</div> : changes.slice(-8).reverse().map((c, i) => <div key={i}>· {c.message}</div>)}
      </div>
    </aside>
  );
}
