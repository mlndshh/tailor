// Prints Jev's reads for sample arrivals and action lists. Run: pnpm jev:check
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { actionsRequest, arrivalRequest, type NormalizedArrival } from "@tailor/core";

const client = new TypeSafeClient({
  apiKey: process.env.AI_GATEWAY_API_KEY!, baseURL: "https://ai-gateway.vercel.sh/typesafe", defaultModel: "typesafe-ai/jev",
});

const arrivals: NormalizedArrival[] = [
  { source: "hackernews", campaign: null, search_terms: null, landing_page: "/" },
  { source: "linkedin", campaign: "website-conversion", search_terms: null, landing_page: "/" },
  { source: "google", campaign: null, search_terms: "website personalization gdpr cookies", landing_page: "/" },
  { source: "vc-newsletter", campaign: "seed-deals", search_terms: null, landing_page: "/" },
];
const actionLists = [
  ["opened the Docs page", "copied the install command", "clicked 'Next.js' in 'Provider'"],
  ["opened the Use cases page", "clicked 'See what each visitor sees' in 'Pricing page'", "clicked Book a walkthrough"],
  ["opened the Privacy & data page", "clicked 'Data retention' in 'Privacy'", "read 'Cookies' for a long time"],
  ["opened the Vision page", "read 'Why now' for a while", "clicked 'Talk to the founders' in 'Vision'"],
];

const fmt = (a: Record<string, { noul: number }>) => Object.entries(a).map(([k, v]) => `${k}=${v.noul.toFixed(2)}`).join("  ");
for (const a of arrivals) {
  const t = Date.now();
  const r = await client.systemOne(arrivalRequest(a) as never);
  console.log(`arrival ${a.source}/${a.campaign ?? a.search_terms ?? "-"} (${Date.now() - t} ms): ${fmt(r.answers as never)}`);
}
for (const list of actionLists) {
  const t = Date.now();
  const r = await client.systemOne(actionsRequest(list) as never);
  console.log(`actions [${list[0]}…] (${Date.now() - t} ms): ${fmt(r.answers as never)}`);
}
