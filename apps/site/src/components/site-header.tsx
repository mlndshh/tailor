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
    <header data-tailor-section="Navigation" className="sticky top-0 z-40 border-b border-dashed border-stitch bg-denim/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-4 sm:px-8">
        <Link href="/" className="font-display text-3xl leading-none text-chalk">
          Tailor
        </Link>
        <nav className="flex flex-wrap gap-5 text-sm">
          {NAV.map((n) => (
            <Emphasis key={n.href} audience={n.audience}>
              {(on) => (
                <Link href={n.href} className={`relative transition-colors hover:text-chalk ${on ? "text-chalk" : "text-muted"}`}>
                  {n.label}
                  {on ? (
                    <span title="Start here" className="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-thread ring-2 ring-denim">
                      <span className="sr-only">Start here</span>
                    </span>
                  ) : null}
                </Link>
              )}
            </Emphasis>
          ))}
        </nav>
        <AudienceSwitcher className="ml-auto text-muted" />
      </div>
    </header>
  );
}
