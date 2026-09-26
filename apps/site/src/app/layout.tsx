import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseDecisionCookie } from "@tailor/core";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TailorRoot } from "@/components/tailor-root";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tailor: every visitor sees the page that fits them",
  description: "Tailor reads each visitor on every click and puts what they came for first. Built on Jev.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = parseDecisionCookie((await cookies()).get("tailor_decision")?.value);
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07090f] text-slate-200 antialiased">
        <TailorRoot initial={initial}>
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-5">{children}</main>
          <SiteFooter />
        </TailorRoot>
      </body>
    </html>
  );
}
