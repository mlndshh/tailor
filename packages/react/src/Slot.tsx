"use client";
import { audienceAtRank, type AudienceId } from "@tailor/core";
import { Children, isValidElement, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useTailor } from "./context";
import { useDeferredApply } from "./defer";

export interface VariantProps { audience?: AudienceId; default?: boolean; children: ReactNode }

/** One version of a Slot. Rendered by <Slot>; has no behaviour of its own. */
export function Variant({ children }: VariantProps) {
  return <>{children}</>;
}

type Key = AudienceId | "default";

/** Re-renders one version at a time: the version for the audience at `rank` (0 = primary, 1 = second active). */
export function Slot({ name, rank = 0, children }: { name: string; rank?: 0 | 1; children: ReactNode }) {
  const { decision, pathname, noteChange, lensOpen } = useTailor();
  const variants = Children.toArray(children).filter(isValidElement) as ReactElement<VariantProps>[];
  const keyOf = (v: ReactElement<VariantProps>): Key => v.props.audience ?? "default";
  const target = audienceAtRank(decision, rank);
  const want: Key = variants.some((v) => v.props.audience === target) && target ? target : "default";
  const [shown, setShown] = useState<Key>(want);
  const [flash, setFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDeferredApply(ref, want, shown, pathname, (next) => {
    noteChange(`${name}: ${shown} → ${next}`);
    setShown(next);
    if (lensOpen) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1_800);
    }
  });

  const current = variants.find((v) => keyOf(v) === shown) ?? variants.find((v) => v.props.default) ?? variants[0] ?? null;
  return (
    <div ref={ref} data-tailor-slot={name} data-tailor-variant={shown} className={flash ? "tailor-flash" : undefined}>
      {current}
    </div>
  );
}
