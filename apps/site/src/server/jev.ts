// Server-only Jev client. The keys must never reach the browser.
//
// Provider order (and why):
//   1. Vercel AI Gateway (AI_GATEWAY_API_KEY, model "typesafe-ai/jev"): primary. This is the path we
//      verified and tuned the decision thresholds against, and it's what runs in production.
//   2. TypeSafe API directly (TYPESAFE_OWN_API_KEY, pinned "jev-1.13.0"): fallback. During the hackathon
//      our direct TypeSafe account returned 402 ("no available API credits"), so it's only used when the
//      Gateway key is missing or rejected.
// When a provider rejects its key (401/402/403) we log once and switch to the other provider for the rest
// of this server instance's life. Any other error (timeout, 5xx) is thrown so decide() keeps the page as is.
import "server-only";
import { APIError, TypeSafeClient, type EntryType } from "@typesafe-ai/sdk";
import type { JevAsk } from "@tailor/core";

const TIMEOUT_MS = 1_500;
const REJECTED_KEY_STATUSES = new Set([401, 402, 403]);

interface Provider {
  name: string;
  client: TypeSafeClient;
}

let providers: Provider[] | null = null;
/** Providers whose key was rejected on this instance; skipped from then on. */
const rejected = new Set<string>();

function getProviders(): Provider[] {
  if (providers) return providers;
  const list: Provider[] = [];
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (gatewayKey) {
    list.push({
      name: "Vercel AI Gateway",
      client: new TypeSafeClient({
        apiKey: gatewayKey,
        baseURL: "https://ai-gateway.vercel.sh/typesafe",
        defaultModel: "typesafe-ai/jev",
        timeout: TIMEOUT_MS,
        retry: { maxRetries: 1 },
      }),
    });
  }
  const directKey = process.env.TYPESAFE_OWN_API_KEY;
  if (directKey) {
    list.push({
      name: "TypeSafe direct",
      client: new TypeSafeClient({
        apiKey: directKey,
        // Pinned, not "jev-latest", so answers match what the thresholds were tuned against.
        defaultModel: "jev-1.13.0",
        timeout: TIMEOUT_MS,
        retry: { maxRetries: 1 },
      }),
    });
  }
  providers = list;
  return list;
}

type AskResult = Awaited<ReturnType<JevAsk>>;

export const jevAsk: JevAsk = async (req) => {
  const body = { state: req.state as EntryType, questions: req.questions };
  const usable = getProviders().filter((p) => !rejected.has(p.name));
  if (usable.length === 0) throw new Error("No usable Jev API key: set AI_GATEWAY_API_KEY (or TYPESAFE_OWN_API_KEY)");

  for (const [i, provider] of usable.entries()) {
    try {
      return (await provider.client.systemOne(body)) as unknown as AskResult;
    } catch (error) {
      const keyRejected = error instanceof APIError && REJECTED_KEY_STATUSES.has(error.status);
      const hasNext = i < usable.length - 1;
      if (!keyRejected || !hasNext) throw error;
      rejected.add(provider.name);
      console.warn(`[jev] ${provider.name} rejected its key (${error.status}); falling back to ${usable[i + 1]?.name}`);
    }
  }
  throw new Error("unreachable");
};
