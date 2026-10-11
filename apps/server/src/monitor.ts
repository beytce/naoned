/**
 * Alerts for the person running the game: a webhook (Discord or Slack "incoming webhook") gets a
 * short message when something needs a look. The same alert is sent at most once per 10 minutes.
 */
export class Alerts {
  private last = new Map<string, number>();

  constructor(
    private readonly webhookUrl: string | undefined,
    private readonly send: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
  ) {}

  get enabled(): boolean {
    return Boolean(this.webhookUrl);
  }

  /** Returns whether a message went out (false: no webhook, or the same alert just went out). */
  async alert(title: string, detail = ""): Promise<boolean> {
    if (!this.webhookUrl) return false;
    const now = this.clock();
    const previous = this.last.get(title);
    if (previous !== undefined && now - previous < 10 * 60_000) return false;
    this.last.set(title, now);
    const text = `⚠️ Fondaco — ${title}${detail ? `\n${detail.slice(0, 1500)}` : ""}`;
    try {
      // Discord reads `content`, Slack reads `text`.
      await this.send(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, text }),
      });
      return true;
    } catch {
      return false;
    }
  }
}
