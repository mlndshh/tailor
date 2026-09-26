import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 flex max-w-6xl flex-wrap items-baseline justify-between gap-4 border-t border-dashed border-stitch px-5 py-10 text-sm text-muted sm:px-8">
      <p>
        <span className="font-display text-xl text-chalk">Tailor</span>, built at JEVATHON in San Francisco, September 2026.
        Decisions by{" "}
        <a className="text-link" href="https://docs.typesafe.ai">
          Jev
        </a>
        .
      </p>
      <nav className="flex gap-5">
        <Link className="hover:text-chalk" href="/privacy">Privacy & data</Link>
        <Link className="hover:text-chalk" href="/demo">Demo</Link>
        <a className="hover:text-chalk" href="https://github.com/mlndshh/tailor">GitHub</a>
      </nav>
    </footer>
  );
}
