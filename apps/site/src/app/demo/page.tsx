import { headers } from "next/headers";
import QRCode from "qrcode";

const LINKS = [
  { id: "L0", path: "/", simulates: "Typed the URL (no referrer)", expect: "Default page; arrival skipped" },
  { id: "L1", path: "/?utm_source=hackernews", simulates: "Hacker News post", expect: "Default until the first click, then Developer" },
  { id: "L2", path: "/?utm_source=github&utm_campaign=readme", simulates: "GitHub README link", expect: "Default until the first click, then Developer" },
  { id: "L3", path: "/?utm_source=linkedin&utm_campaign=website-conversion", simulates: "LinkedIn ad", expect: "Default until the first click, then Growth lead" },
  { id: "L4", path: "/?utm_source=google&utm_term=website+personalization+gdpr+cookies", simulates: "Google search", expect: "Privacy reviewer" },
  { id: "L5", path: "/?utm_source=vc-newsletter&utm_campaign=seed-deals", simulates: "VC newsletter", expect: "Investor" },
  { id: "L6", path: "/docs?utm_source=vc-newsletter", simulates: "Investor who lands on the docs", expect: "Investor, then developer too" },
];

const withFlags = (path: string, lens: boolean) => `${path}${path.includes("?") ? "&" : "?"}tailor_new=1${lens ? "&tailor_lens=1" : ""}`;

export default async function Demo() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const rows = await Promise.all(LINKS.map(async (l) => ({ ...l, url: origin + withFlags(l.path, false), qr: await QRCode.toString(origin + withFlags(l.path, false), { type: "svg", margin: 1, width: 132 }) })));
  return (
    <div className="pt-16">
      <p className="eyebrow">Demo</p>
      <h1 className="mt-2 text-4xl font-semibold text-white">Try Tailor as different visitors</h1>
      <p className="mt-3 text-slate-400">Each link starts a fresh session. Open two windows side by side (one private), turn on the Lens, and follow the scenarios in the spec.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="card flex gap-4">
            <div className="shrink-0 rounded bg-white p-1" dangerouslySetInnerHTML={{ __html: r.qr }} />
            <div className="text-sm">
              <div className="text-white"><strong>{r.id}</strong> · {r.simulates}</div>
              <div className="mt-1 text-slate-400">Expected first read: {r.expect}</div>
              <div className="mt-2 flex gap-3">
                <a className="text-amber-400" href={r.url}>Open</a>
                <a className="text-amber-400" href={origin + withFlags(r.path, true)}>Open with Lens</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
