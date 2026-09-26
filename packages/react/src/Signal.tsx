"use client";
import type { ReactNode } from "react";
import { useTailor } from "./context";

/** Labels a meaningful action ("copied the install command"). Clicks inside are recorded once, with this label. */
export function Signal({ label, children }: { label: string; children: ReactNode }) {
  const { track } = useTailor();
  return (
    <span data-tailor-signal={label} onClickCapture={() => track(label)} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
