import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-5xl border-t border-slate-800 px-5 py-8 text-sm text-slate-500">
      Tailor · built at JEVATHON, San Francisco, September 2026 · decisions by{" "}
      <a className="underline" href="https://docs.typesafe.ai">Jev</a> · <Link className="underline" href="/privacy">Privacy & data</Link> ·{" "}
      <Link className="underline" href="/demo">Demo</Link>
    </footer>
  );
}
