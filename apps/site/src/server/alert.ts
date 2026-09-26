import "server-only";

/** Sends a plain-text alert to TAILOR_ALERT_WEBHOOK_URL if configured; logs either way. Never throws. */
export async function sendTalkAlert(text: string): Promise<void> {
  console.info(`[tailor alert] ${text}`);
  const url = process.env.TAILOR_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  } catch (error) {
    console.warn(`[tailor alert] webhook failed: ${(error as Error).message}`);
  }
}
