import { sendTalkAlert } from "@/server/alert";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.email !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  const audiences = Array.isArray(body.audiences)
    ? body.audiences.filter((a): a is string => typeof a === "string").slice(0, 4).map((a) => a.slice(0, 30)).join(", ")
    : "";
  await sendTalkAlert(`Tailor contact (${s(body.topic)}) from ${s(body.name)} <${s(body.email)}> [${audiences || "no audience"}]: ${s(body.message)}`);
  return Response.json({ ok: true });
}
