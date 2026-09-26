"use client";
import type { AudienceId } from "@tailor/core";
import type { ReactNode } from "react";
import { useTailor } from "./context";

/** Highlights its children when `audience` is the primary audience. Never hides anything. */
export function Emphasis(props: { audience: AudienceId; children: ReactNode | ((on: boolean) => ReactNode); className?: string; onClassName?: string }) {
  const { decision } = useTailor();
  const on = decision?.primary === props.audience;
  const cls = [props.className, on ? props.onClassName : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div data-tailor-emphasis={on ? "on" : "off"} className={cls}>
      {typeof props.children === "function" ? props.children(on) : props.children}
    </div>
  );
}
