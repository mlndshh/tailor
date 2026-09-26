// Server-only: calls Jev through Vercel AI Gateway. The key must never reach the browser.
import "server-only";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { JevAsk } from "@tailor/core";

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (client) return client;
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY is not set");
  client = new TypeSafeClient({
    apiKey,
    baseURL: "https://ai-gateway.vercel.sh/typesafe",
    defaultModel: "typesafe-ai/jev",
    timeout: 1_500,
    retry: { maxRetries: 1 },
  });
  return client;
}

export const jevAsk: JevAsk = async (req) => {
  const res = await getClient().systemOne({ state: req.state, questions: req.questions } as never);
  return res as unknown as Awaited<ReturnType<JevAsk>>;
};
