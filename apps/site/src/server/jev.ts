// Server-only: calls Jev directly through the TypeSafe API when TYPESAFE_OWN_API_KEY is set
// (the SDK's default baseURL, https://api.typesafe.ai), falling back to Vercel AI Gateway
// (AI_GATEWAY_API_KEY) when there's no direct key or the direct key is rejected (401/402/403,
// e.g. an account with no credits). The keys must never reach the browser.
import "server-only";
import { APIError, TypeSafeClient, type EntryType } from "@typesafe-ai/sdk";
import type { JevAsk } from "@tailor/core";

const TIMEOUT_MS = 1_500;
const REJECTED_KEY_STATUSES = new Set([401, 402, 403]);

let direct: TypeSafeClient | null = null;
let gateway: TypeSafeClient | null = null;
/** Set once the direct key is rejected, so later calls go straight to the Gateway on this instance. */
let directRejected = false;

function directClient(): TypeSafeClient | null {
  const apiKey = process.env.TYPESAFE_OWN_API_KEY;
  if (!apiKey || directRejected) return null;
  direct ??= new TypeSafeClient({
    apiKey,
    // Pinned, not "jev-latest": thresholds were tuned against this version.
    defaultModel: "jev-1.13.0",
    timeout: TIMEOUT_MS,
    retry: { maxRetries: 1 },
  });
  return direct;
}

function gatewayClient(): TypeSafeClient | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;
  gateway ??= new TypeSafeClient({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/typesafe",
    defaultModel: "typesafe-ai/jev",
    timeout: TIMEOUT_MS,
    retry: { maxRetries: 1 },
  });
  return gateway;
}

type AskResult = Awaited<ReturnType<JevAsk>>;

export const jevAsk: JevAsk = async (req) => {
  const body = { state: req.state as EntryType, questions: req.questions };
  const primary = directClient();
  if (primary) {
    try {
      return (await primary.systemOne(body)) as unknown as AskResult;
    } catch (error) {
      const rejected = error instanceof APIError && REJECTED_KEY_STATUSES.has(error.status);
      if (!rejected || !gatewayClient()) throw error;
      directRejected = true;
      console.warn(`[jev] TypeSafe direct key rejected (${error.status}); using Vercel AI Gateway`);
    }
  }
  const fallback = gatewayClient();
  if (!fallback) throw new Error("No Jev API key: set TYPESAFE_OWN_API_KEY (or AI_GATEWAY_API_KEY)");
  return (await fallback.systemOne(body)) as unknown as AskResult;
};
