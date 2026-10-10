export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** The e-mail could not be handed to the provider. */
export class MailError extends Error {}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Development: prints the e-mail, magic link included, in the server log. */
export class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.info(`\n[mail] à ${mail.to} — ${mail.subject}\n${mail.text}\n`);
  }
}

/** Tests: keeps e-mails in memory. */
export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = [];
  async send(mail: Mail): Promise<void> {
    this.sent.push(mail);
  }
}

/** Production: Resend HTTP API. */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(mail: Mail): Promise<void> {
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, ...mail }),
      });
    } catch (err) {
      throw new MailError(`Resend unreachable: ${String(err)}`);
    }
    if (!res.ok) throw new MailError(`Resend: ${res.status} ${await res.text()}`);
  }
}
