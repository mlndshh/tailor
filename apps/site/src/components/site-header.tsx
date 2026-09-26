"use client";
import type { AudienceId } from "@tailor/core";
import { AudienceSwitcher, Emphasis } from "@tailor/react";
import Link from "next/link";

const NAV: { href: string; label: string; audience: AudienceId }[] = [
  { href: "/docs", label: "Docs", audience: "developer" },
  { href: "/use-cases", label: "Use cases", audience: "growth_lead" },
  { href: "/privacy", label: "Privacy & data", audience: "privacy_reviewer" },
  { href: "/vision", label: "Vision", audience: "investor" },
];

export function SiteHeader() {
  return (
    <header data-tailor-section="Navigation" className="sticky top-0 z-40 border-b border-slate-800 bg-[#07090f]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="font-semibold tracking-tight text-white">◐ Tailor</Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          {NAV.map((n) => (
            <Emphasis key={n.href} audience={n.audience}>
              {(on) => (
                <Link href={n.href} className="relative text-slate-300 hover:text-white">
                  {n.label}
                  {on ? <span title="Start here" className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
                </Link>
              )}
            </Emphasis>
          ))}
        </nav>
        <AudienceSwitcher className="ml-auto text-slate-400" />
      </div>
    </header>
  );
}
