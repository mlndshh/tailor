import type { Metadata } from "next";
import { Hanken_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { parseDecisionCookie } from "@tailor/core";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TailorRoot } from "@/components/tailor-root";
import "./globals.css";

const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--nf-display" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--nf-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "Tailor: every visitor sees the page that fits them",
  description: "Tailor reads each visitor on every click and puts what they came for first. Built on Jev.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = parseDecisionCookie((await cookies()).get("tailor_decision")?.value);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <TailorRoot initial={initial}>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-5 sm:px-8">{children}</main>
          <SiteFooter />
        </TailorRoot>
      </body>
    </html>
  );
}
