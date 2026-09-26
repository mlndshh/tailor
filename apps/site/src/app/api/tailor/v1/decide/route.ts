import { decide, parseDecideRequest, shouldAlert, type AudienceScores } from "@tailor/core";
import { sendTalkAlert } from "@/server/alert";
import { jevAsk } from "@/server/jev";

const SITE_KEY = "site_tailor"; // public; route modules may only export handlers
const arrivalCache = new Map<string, AudienceScores>();
const alerted = new Set<string>();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const req = parseDecideRequest(body);
  if (!req) return Response.json({ error: "invalid request" }, { status: 400 });
  if (req.siteKey !== SITE_KEY) return Response.json({ error: "unknown site key" }, { status: 403 });

  const selfHost = new URL(request.url).hostname;
  const result = await decide(req, { ask: jevAsk, arrivalCache, selfHost });

  if (shouldAlert(result.decision.talkInterest) && !alerted.has(req.sessionId)) {
    alerted.add(req.sessionId);
    const who = result.decision.active.join(", ") || "unclassified visitor";
    void sendTalkAlert(`Tailor: a ${who} wants to talk. Recent: ${result.debug.actions.slice(-3).join("; ")}`);
  }
  return Response.json(result);
}
