"use client";
import { Slot, Variant } from "@tailor/react";
import Link from "next/link";

const Step = ({ href, text }: { href: string; text: string }) => (
  <Link href={href} className="card mt-16 block hover:border-slate-600">
    <span className="eyebrow">Next step</span>
    <span className="mt-1 block text-lg text-white">{text} →</span>
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
