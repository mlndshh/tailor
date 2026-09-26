// Server-only: calls Jev directly through the TypeSafe API when TYPESAFE_OWN_API_KEY is set
// (the SDK's default baseURL, https://api.typesafe.ai), falling back to Vercel AI Gateway
// (AI_GATEWAY_API_KEY) otherwise. The key must never reach the browser.
import "server-only";
import { TypeSafeClient, type EntryType } from "@typesafe-ai/sdk";
import type { JevAsk } from "@tailor/core";

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (client) return client;
  const ownKey = process.env.TYPESAFE_OWN_API_KEY;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  if (ownKey) {
    client = new TypeSafeClient({
      apiKey: ownKey,
      // Pinned, not "jev-latest": thresholds were tuned against this version.
      defaultModel: "jev-1.13.0",
      timeout: 1_500,
      retry: { maxRetries: 1 },
    });
  } else if (gatewayKey) {
    client = new TypeSafeClient({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/typesafe",
      defaultModel: "typesafe-ai/jev",
      timeout: 1_500,
      retry: { maxRetries: 1 },
    });
  } else {
    throw new Error("No Jev API key: set TYPESAFE_OWN_API_KEY (or AI_GATEWAY_API_KEY)");
  }
  return client;
}

export const jevAsk: JevAsk = async (req) => {
  const res = await getClient().systemOne({ state: req.state as EntryType, questions: req.questions });
  return res as unknown as Awaited<ReturnType<JevAsk>>;
};
