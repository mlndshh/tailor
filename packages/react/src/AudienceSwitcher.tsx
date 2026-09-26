"use client";
import { AUDIENCES, type AudienceId } from "@tailor/core";
import { useTailor } from "./context";

/** Shows which view Tailor chose and lets anyone pick another. An explicit pick is pinned until "Auto". */
export function AudienceSwitcher({ className }: { className?: string }) {
  const { decision, pinned, pin, labels } = useTailor();
  const current = decision?.primary ?? null;
  return (
    <label data-tailor-ignore className={className} style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      <span>
        Showing: {current ? `${labels[current]} view` : "Default view"} <span style={{ opacity: 0.6 }}>({pinned ? "pinned" : "auto"})</span>
      </span>
      <select
        aria-label="Choose a view"
        value={pinned ?? "auto"}
        onChange={(e) => pin(e.target.value === "auto" ? null : (e.target.value as AudienceId))}
        style={{ background: "transparent", border: "1px solid currentColor", borderRadius: 6, padding: "2px 6px", color: "inherit" }}
      >
        <option value="auto">Auto</option>
        {AUDIENCES.map((a) => (
          <option key={a} value={a}>{labels[a]}</option>
        ))}
      </select>
    </label>
  );
}
