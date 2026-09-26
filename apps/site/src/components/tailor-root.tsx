"use client";
import type { Decision } from "@tailor/core";
import { TailorLens, TailorProvider } from "@tailor/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const PAGE_TITLES: Record<string, string> = {
  "/": "Home", "/docs": "Docs", "/use-cases": "Use cases", "/privacy": "Privacy & data", "/vision": "Vision", "/contact": "Contact", "/demo": "Demo",
};

export function TailorRoot({ initial, children }: { initial: Decision | null; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <TailorProvider siteKey="site_tailor" endpoint="/api/tailor/v1/decide" initial={initial} pathname={pathname} pageTitles={PAGE_TITLES}>
      {children}
      <TailorLens />
    </TailorProvider>
  );
}
