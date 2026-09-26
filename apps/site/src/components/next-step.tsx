"use client";
import { Slot, Variant } from "@tailor/react";
import Link from "next/link";

const Step = ({ href, text }: { href: string; text: string }) => (
  <Link href={href} className="group mt-20 flex items-center justify-between gap-6 rounded-2xl border border-dashed border-stitch p-6 transition-colors hover:border-tape">
    <span>
      <span className="block text-sm text-muted">Next step for you</span>
      <span className="mt-1 block font-display text-3xl text-chalk">{text}</span>
    </span>
    <span aria-hidden className="text-2xl text-tape transition-transform group-hover:translate-x-1">
      ›
    </span>
  </Link>
);

export function NextStep() {
  return (
    <Slot name="next-step">
      <Variant default><Step href="/#how-it-works" text="New here? See how Tailor works" /></Variant>
      <Variant audience="developer"><Step href="/docs" text="Read the quickstart" /></Variant>
      <Variant audience="growth_lead"><Step href="/use-cases" text="See what each visitor sees" /></Variant>
      <Variant audience="privacy_reviewer"><Step href="/privacy" text="Read our data practices" /></Variant>
      <Variant audience="investor"><Step href="/vision" text="Read why now" /></Variant>
    </Slot>
  );
}
