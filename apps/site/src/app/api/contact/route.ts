import { sendTalkAlert } from "@/server/alert";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.email !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  const audiences = Array.isArray(body.audiences) ? body.audiences.filter((a) => typeof a === "string").join(", ") : "";
  await sendTalkAlert(`Tailor contact (${s(body.topic)}) from ${s(body.name)} <${s(body.email)}> [${audiences || "no audience"}]: ${s(body.message)}`);
  return Response.json({ ok: true });
}
